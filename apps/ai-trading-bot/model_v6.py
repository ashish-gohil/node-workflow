"""
model_v2.py — StockForecastNet V6
===================================
PatchTST + ReVIN + Feature Attention Pooling + Dual-Loss Head

WHY V5 FAILED (val acc 47.9% — BELOW random 50%)
──────────────────────────────────────────────────

ROOT CAUSE 1 — ReVIN Denormalization Bias (PRIMARY)
  V5 forward pass:
    y_raw        = head(pooled)                       # normalized-space output
    predictions  = y_raw * std_window + mean_window   # denorm using INPUT stats

  The bug: mean_window = mean(ret_1d over the 90-day INPUT window).
  IT stocks 2012-2023: persistent bull market.
    mean_window ≈ +0.04% per day (systematically positive).
  So: predictions = y_raw * 0.012 + 0.0004

  The model learns to output a NEGATIVE y_raw to cancel the positive mean,
  creating a spurious correlation between past mean and future direction.
  This works spuriously during training (bull regime) but INVERTS the
  direction predictions during val (2024-25 consolidation regime).

  PROOF: VaAcc = 0.477 at epoch 1 (BEFORE any learning).
  A random model scores ~0.500. Getting 0.477 at init means the DENORM
  ALONE adds a directional bias that hurts on the val distribution.

  FIX: Remove denorm from the training/direction-prediction path.
  Train entirely in NORMALIZED SPACE.
  Only apply denorm when reporting % return to humans (infer.py).

ROOT CAUSE 2 — Mean Pooling Treats All 56 Features Equally
  V5: pooled = enc_out.reshape(B, 56, d_model).mean(dim=1)
  RSI, MACD, and a noisy 'is_month_end' feature all contribute equally.
  For IT stocks, some indicators are far more predictive than others.
  FIX: Attention Pooling — learn a weight vector over 56 features.

ROOT CAUSE 3 — Regression Loss, Not Direction Loss
  HuberLoss minimises magnitude error, not direction error.
  Predicting +0.4% when truth is +0.1% = small regression loss,
  but correct direction. Predicting -0.01% when truth is +1.5%
  = large regression loss but barely affects accuracy.
  FIX: Primary loss = BCEWithLogitsLoss on direction (UP=1, DOWN=0).
  Secondary loss = MSE on normalised magnitude (optional regulariser).

ROOT CAUSE 4 — IT-Only Stocks = Low Pattern Diversity
  10 IT stocks (TCS, INFY, WIPRO...) correlation r > 0.88.
  The model sees the SAME market event from 10 nearly identical angles.
  It memorises the 2012-2023 IT bull market, not general patterns.
  FIX: Increase dropout to 0.2, reduce d_model to 96, and use
  balanced sampling to prevent UP-bias from the bull-market training set.

V6 ARCHITECTURE CHANGES vs V5
──────────────────────────────
  1. ReVIN: normalize inputs only. Head outputs LOGIT (no denorm).
            Forward returns (logit, magnitude) — train on logit direction.
            Denorm only called at inference for human-readable return %.
  2. Feature Attention Pooling: replaces mean(dim=1) over 56 features.
            W = softmax(Linear(d_model, 1)) per feature → weighted sum.
            Lets the model learn "RSI matters more than is_month_end for IT".
  3. Dual-head: direction_head (→ scalar logit) + magnitude_head (→ horizon vec).
  4. d_model: 96 (was 128) — fewer params for IT-only training.
  5. dropout: 0.2 (was 0.1) — more regularisation for correlated data.

PARAMETER COUNT (d_model=96, n_layers=2, seq=90, patch=16/8, horizon=3)
  n_patches = (90-16)//8 + 1 = 10
  ReVIN affine:         56 × 2 =      112
  Patch projection: 16×96+96  =    1,632
  Temporal proj:     6×96+96  =      672
  Positional enc:    10×96    =      960
  Transformer 2L:              =  149,760
  Feature attn W:   96×1×56   =    5,376
  Direction head:   96×1+1    =       97
  Magnitude head:   96×3+3    =      291
  TOTAL:                       ≈  158,900  (~0.61 MB)
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F


# ══════════════════════════════════════════════════════════════════════════════
# 1. ReVIN — Reversible Instance Normalization
# ══════════════════════════════════════════════════════════════════════════════

class ReVIN(nn.Module):
    """
    Per-instance normalization of input features.
    NOTE (V6 fix): normalize() is called for inputs only.
    The denormalize() method is ONLY used at inference time for
    reporting human-readable % returns. It is NOT called during
    training forward pass — this eliminates the directional bias
    that caused val acc < 50% in V5.
    """
    def __init__(self, n_features: int, eps: float = 1e-5, affine: bool = True):
        super().__init__()
        self.eps     = eps
        self.affine  = affine
        if affine:
            self.gamma = nn.Parameter(torch.ones(1, 1, n_features))
            self.beta  = nn.Parameter(torch.zeros(1, 1, n_features))

    def normalize(self, x: torch.Tensor):
        """x: (B, T, C) → x_norm, (mean, std)  both (B, 1, C)"""
        mean = x.mean(dim=1, keepdim=True)
        std  = x.std(dim=1, keepdim=True) + self.eps
        x_n  = (x - mean) / std
        if self.affine:
            x_n = x_n * self.gamma + self.beta
        return x_n, (mean, std)

    def denormalize(self, y_norm: torch.Tensor, stats: tuple) -> torch.Tensor:
        """
        Convert normalized prediction back to return scale.
        ONLY call this at inference (infer.py / api_v2.py), never during training.
        y_norm: (B,) or (B, horizon)  — normalized-space predictions
        """
        mean, std = stats
        m = mean[:, 0, 0]  # (B,) — use ret_1d window mean
        s = std[:,  0, 0]  # (B,)
        if y_norm.dim() == 1:
            return y_norm * s + m
        return y_norm * s.unsqueeze(-1) + m.unsqueeze(-1)


# ══════════════════════════════════════════════════════════════════════════════
# 2. PatchEmbedding — Value Stream
# ══════════════════════════════════════════════════════════════════════════════

class PatchEmbedding(nn.Module):
    """
    Splits each feature's time series into overlapping 16-day patches
    and projects each patch to d_model.
    CI (Channel-Independent): same weights shared across all 56 features.
    n_patches = (seq_len - patch_size) // stride + 1
    """
    def __init__(self, seq_len: int, patch_size: int, stride: int,
                 d_model: int, dropout: float = 0.2):
        super().__init__()
        self.patch_size = patch_size
        self.stride     = stride
        self.n_patches  = (seq_len - patch_size) // stride + 1
        self.projection = nn.Linear(patch_size, d_model)
        self.norm       = nn.LayerNorm(d_model)
        self.dropout    = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B*C, seq_len)
        patches = x.unfold(1, self.patch_size, self.stride)
        # (B*C, n_patches, patch_size) → project → (B*C, n_patches, d_model)
        return self.dropout(self.norm(self.projection(patches)))


# ══════════════════════════════════════════════════════════════════════════════
# 3. TemporalEmbedding — Calendar Stream
# ══════════════════════════════════════════════════════════════════════════════

class TemporalEmbedding(nn.Module):
    """
    Cyclic sin/cos calendar features → d_model per patch.
    [month_sin, month_cos, dow_sin, dow_cos, dom_sin, dom_cos]
    """
    def __init__(self, d_model: int, patch_size: int, stride: int,
                 n_patches: int, dropout: float = 0.2):
        super().__init__()
        self.patch_size = patch_size
        self.stride     = stride
        self.n_patches  = n_patches
        self.proj = nn.Sequential(
            nn.Linear(6, d_model),
            nn.LayerNorm(d_model),
            nn.GELU(),
        )
        self.dropout = nn.Dropout(dropout)

    def forward(self, time_features: torch.Tensor) -> torch.Tensor:
        # time_features: (B, seq_len, 6) → (B, n_patches, d_model)
        t = self.proj(time_features).transpose(1, 2)
        # (B, d_model, seq_len) → unfold → (B, d_model, n_patches, patch_size)
        t = t.unfold(2, self.patch_size, self.stride).mean(dim=-1)
        return self.dropout(t.transpose(1, 2))  # (B, n_patches, d_model)


# ══════════════════════════════════════════════════════════════════════════════
# 4. FeatureAttentionPooling  ← NEW in V6
# ══════════════════════════════════════════════════════════════════════════════

class FeatureAttentionPooling(nn.Module):
    """
    Learned weighted sum over the feature dimension.

    V5 used mean(dim=1) — equal weight for all 56 features.
    V6 learns a scalar importance weight per feature via a small
    attention network:  w_i = softmax(Linear(d_model → 1) applied to
    each feature's pooled representation).

    Result: the model learns "RSI matters 3× more than is_month_end
    for IT stock direction prediction." This is the key improvement
    for sector-specific models.

    Input:  (B, C, d_model) — one vector per feature per sample
    Output: (B, d_model)    — weighted sum over C features
    Weights:(B, C)          — interpretable attention over 56 indicators
    """
    def __init__(self, d_model: int, n_features: int):
        super().__init__()
        self.scorer = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Linear(d_model // 2, 1),
        )

    def forward(self, x: torch.Tensor):
        """
        x: (B, C, d_model)
        Returns: pooled (B, d_model), attn_weights (B, C)
        """
        # score each feature
        scores = self.scorer(x).squeeze(-1)         # (B, C)
        weights = torch.softmax(scores, dim=-1)     # (B, C) — sum to 1
        # weighted sum
        pooled = (x * weights.unsqueeze(-1)).sum(dim=1)  # (B, d_model)
        return pooled, weights


# ══════════════════════════════════════════════════════════════════════════════
# 5. StockForecastNet V6 — Main Model
# ══════════════════════════════════════════════════════════════════════════════

class StockForecastNet(nn.Module):
    """
    StockForecastNet V6

    Key V6 changes that fix the 47.9% val accuracy bug:
      1. Direction head outputs a LOGIT (no denorm in forward).
         Loss = BCEWithLogitsLoss(logit, UP_DOWN_label).
         Eliminates the ReVIN mean-bias that caused systematic
         direction inversion in the validation set.
      2. Feature Attention Pooling instead of mean pooling.
         Learns which of the 56 indicators matter for IT stocks.
      3. Dual head: direction (logit) + magnitude (normalized return vec).
         Separate losses, combined for gradient.
      4. d_model=96 (was 128), dropout=0.2 (was 0.1) — right-sized
         for IT-only correlated training data.

    Forward returns:
      (logit, mag_norm, revin_stats)
      logit:      (B,)        — direction logit  (use BCEWithLogitsLoss)
      mag_norm:   (B, horizon) — normalized magnitude (use MSELoss)
      revin_stats: (mean, std) — for inference denorm only
    """

    def __init__(
        self,
        n_features:   int,
        seq_len:      int   = 90,
        horizon:      int   = 3,
        patch_size:   int   = 16,
        stride:       int   = 8,
        d_model:      int   = 96,
        n_heads:      int   = 4,
        n_layers:     int   = 2,
        d_ff:         int   = 192,
        dropout:      float = 0.2,
        revin_affine: bool  = True,
    ):
        super().__init__()
        assert d_model % n_heads == 0, f"d_model {d_model} must be divisible by n_heads {n_heads}"
        assert seq_len >= patch_size,  f"seq_len {seq_len} must be >= patch_size {patch_size}"

        self.n_features = n_features
        self.seq_len    = seq_len
        self.horizon    = horizon
        self.patch_size = patch_size
        self.stride     = stride
        self.d_model    = d_model
        self.n_heads    = n_heads
        self.n_layers   = n_layers
        self.d_ff       = d_ff
        self.dropout_p  = dropout
        self.n_patches  = (seq_len - patch_size) // stride + 1

        # ── Components ──────────────────────────────────────────────────────
        self.revin       = ReVIN(n_features=n_features, affine=revin_affine)
        self.patch_embed = PatchEmbedding(seq_len, patch_size, stride, d_model, dropout)
        self.time_embed  = TemporalEmbedding(d_model, patch_size, stride, self.n_patches, dropout)
        self.pos_enc     = nn.Parameter(torch.randn(1, self.n_patches, d_model) * 0.02)

        enc_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=n_heads, dim_feedforward=d_ff,
            dropout=dropout, activation="gelu",
            batch_first=True, norm_first=True,
        )
        self.encoder      = nn.TransformerEncoder(enc_layer, num_layers=n_layers,
                                                  enable_nested_tensor=False)
        self.encoder_norm = nn.LayerNorm(d_model)

        # ── V6: Feature Attention Pooling ───────────────────────────────────
        self.feat_attn = FeatureAttentionPooling(d_model, n_features)

        # ── V6: Dual Head ───────────────────────────────────────────────────
        # direction_head: outputs a SINGLE logit for UP(1) vs DOWN(0)
        # Training: BCEWithLogitsLoss(logit, direction_label)
        # Inference: direction = (sigmoid(logit) > 0.5)
        self.direction_head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, 1),
        )

        # magnitude_head: outputs normalized cumulative returns per step
        # Training: MSELoss(mag_norm, y_norm) — both in normalized space
        self.magnitude_head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, horizon),
        )

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
        nn.init.normal_(self.pos_enc, std=0.02)

    def forward(self, x: torch.Tensor,
                time_features: torch.Tensor = None,
                return_attn_weights: bool = False):
        """
        Args:
            x:             (B, seq_len, n_features)
            time_features: (B, seq_len, 6) or None
            return_attn_weights: if True, also return (B, n_features) attention weights

        Returns (training mode):
            logit:       (B,)          — direction logit (no sigmoid applied)
            mag_norm:    (B, horizon)  — magnitude in NORMALIZED space
            revin_stats: (mean, std)   — for inference denorm only

        V6 FIX: forward() does NOT call revin.denormalize().
        The loss is computed in NORMALIZED space.
        """
        B, T, C = x.shape

        # ── Step 1: ReVIN normalize inputs ─────────────────────────────────
        x_norm, revin_stats = self.revin.normalize(x)   # (B, T, C)

        # ── Step 2: CI reshape ──────────────────────────────────────────────
        x_ci = x_norm.transpose(1, 2).reshape(B * C, T)  # (B*C, T)

        # ── Step 3A: Patch embedding ────────────────────────────────────────
        val_emb = self.patch_embed(x_ci)   # (B*C, n_patches, d_model)

        # ── Step 3B: Temporal embedding ─────────────────────────────────────
        if time_features is None:
            time_features = torch.zeros(B, T, 6, device=x.device, dtype=x.dtype)
        time_emb = self.time_embed(time_features)         # (B, n_patches, d_model)
        time_emb = (time_emb.unsqueeze(1)
                             .expand(-1, C, -1, -1)
                             .reshape(B * C, self.n_patches, self.d_model))

        # ── Step 4: Fuse ────────────────────────────────────────────────────
        fused = val_emb + time_emb + self.pos_enc         # (B*C, n_patches, d_model)

        # ── Step 5: CI Transformer ──────────────────────────────────────────
        enc_out = self.encoder_norm(self.encoder(fused))  # (B*C, n_patches, d_model)

        # ── Step 6: Pool patches, reshape to (B, C, d_model) ───────────────
        pooled_patches = enc_out.mean(dim=1)              # (B*C, d_model)
        per_feature    = pooled_patches.reshape(B, C, self.d_model)

        # ── Step 7: V6 Feature Attention Pooling ───────────────────────────
        context, attn_w = self.feat_attn(per_feature)    # (B, d_model), (B, C)

        # ── Step 8: Dual heads ──────────────────────────────────────────────
        # direction_head → logit (B,)  — raw logit, BCEWithLogitsLoss in training
        logit    = self.direction_head(context).squeeze(-1)   # (B,)

        # magnitude_head → normalized return per horizon step (B, horizon)
        mag_norm = self.magnitude_head(context)               # (B, horizon)

        if return_attn_weights:
            return logit, mag_norm, revin_stats, attn_w
        return logit, mag_norm, revin_stats

    def predict_signal(self, x: torch.Tensor,
                       time_features: torch.Tensor = None,
                       conf_scale: float = 1.0):
        """
        Inference helper. Returns human-readable signal.

        Returns:
            direction:   int   (1=UP, 0=DOWN)
            confidence:  float (0.5–1.0) — sigmoid of logit magnitude
            pred_return: float — denormalized % return estimate
            all_steps:   list  — per-horizon estimates
        """
        if x.dim() == 2: x = x.unsqueeze(0)
        if time_features is not None and time_features.dim() == 2:
            time_features = time_features.unsqueeze(0)
        self.eval()
        with torch.no_grad():
            logit, mag_norm, revin_stats = self.forward(x, time_features)

        prob = torch.sigmoid(logit[0]).item()
        direction  = 1 if prob >= 0.5 else 0
        confidence = prob if direction == 1 else (1.0 - prob)

        # Denorm magnitude for human-readable return %
        mag_denorm = self.revin.denormalize(mag_norm[0], revin_stats)
        pred_return = mag_denorm[-1].item()   # primary = last horizon
        all_steps   = mag_denorm.tolist()

        return direction, confidence, pred_return, all_steps

    def get_config(self) -> dict:
        return {
            "n_features":   self.n_features,
            "seq_len":      self.seq_len,
            "horizon":      self.horizon,
            "patch_size":   self.patch_size,
            "stride":       self.stride,
            "d_model":      self.d_model,
            "n_heads":      self.n_heads,
            "n_layers":     self.n_layers,
            "d_ff":         self.d_ff,
            "dropout":      0.0,
            "revin_affine": True,
        }

    def count_parameters(self) -> dict:
        def n(m): return sum(p.numel() for p in m.parameters())
        total = n(self)
        return {
            "revin":                 n(self.revin),
            "patch_embedding":       n(self.patch_embed),
            "temporal_embedding":    n(self.time_embed),
            "positional_encoding":   self.pos_enc.numel(),
            "transformer_encoder":   n(self.encoder) + n(self.encoder_norm),
            "feature_attn_pooling":  n(self.feat_attn),
            "direction_head":        n(self.direction_head),
            "magnitude_head":        n(self.magnitude_head),
            "total":                 total,
            "size_mb":               round(total * 4 / 1024 / 1024, 3),
        }

    def __repr__(self):
        total = sum(p.numel() for p in self.parameters())
        return (
            f"StockForecastNet V6("
            f"features={self.n_features}, seq={self.seq_len}, "
            f"horizon={self.horizon}, patch={self.patch_size}/{self.stride}, "
            f"d_model={self.d_model}, layers={self.n_layers}, "
            f"patches={self.n_patches}, "
            f"params={total:,}, {total*4/1024/1024:.3f}MB)"
        )


# ── Backwards compat ──────────────────────────────────────────────────────────
StockPredictor     = StockForecastNet
StockPredictorTFT  = StockForecastNet
StockTransformerV2 = StockForecastNet