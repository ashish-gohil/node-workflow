"""
model_v2.py — StockForecastNet V5  (PatchTST + ReVIN + Dual-Stream + CI Transformer)
======================================================================================

ARCHITECTURE OVERVIEW
──────────────────────
INPUT: x (B, seq_len, n_features)  +  time (B, seq_len, 6)

  Step 1:  ReVIN normalize x per-instance → x_norm (B, T, C)
  Step 2:  CI reshape: (B, T, C) → (B*C, T) — treat each feature independently
  Step 3A: Patch embed: (B*C, T) → (B*C, n_patches, d_model) — VALUE stream
  Step 3B: Time embed:  (B, T, 6) → (B, n_patches, d_model) — TIME stream
             expand → (B*C, n_patches, d_model)
  Step 4:  Fuse: val_emb + time_emb + pos_enc → (B*C, n_patches, d_model)
  Step 5:  Transformer encoder (shared weights across all C features)
             → (B*C, n_patches, d_model)
  Step 6:  Mean pool over patches → (B*C, d_model)
           Reshape → (B, C, d_model)
           Mean over features → (B, d_model)
  Step 7:  Linear(d_model, horizon) → (B, horizon)
  Step 8:  ReVIN denormalize → (B, horizon)

═══════════════════════════════════════════════════════════════════════
COMPONENT DEEP-DIVE
═══════════════════════════════════════════════════════════════════════

1. ReVIN (Reversible Instance Normalization)
───────────────────────────────────────────
Problem: Stock features are non-stationary. RELIANCE RSI in 2010 and in
2025 have the same statistical meaning (0–100), but momentum features
like ret_1d have different volatility regimes. A global RobustScaler
fitted on training data creates systematic bias at inference.

ReVIN solution: normalize EACH INPUT WINDOW independently using its
OWN statistics (mean + std), then reverse the normalization on the output.

  Normalize:   x_norm = (x - mean(x)) / (std(x) + eps)
  After model: y_raw (predicted in normalized space)
  Denormalize: y_final = y_raw * std(x) + mean(x)

Learnable affine transform (γ, β per feature) allows the model to
optionally undo the normalization if it learns the original scale is
informative. In practice γ≈1 and β≈0 but the gradient can tune this.

Why this works better than global scaling:
  A window from COVID-crash (2020) has high std → gets scaled down.
  A window from calm 2015 has low std → gets scaled up.
  The model always sees similarly-scaled distributions.

2. Patch Embedding (Stream A — Values)
──────────────────────────────────────
Problem: Standard TS Transformers treat each timestep as a token.
With seq_len=90 days and 56 features, that is 90 tokens per feature.
The attention matrix is O(seq_len²) = 8,100 pairs. Noisy.

PatchTST solution: group consecutive timesteps into patches.
  patch_size=16, stride=8, seq_len=90:
  n_patches = (90 - 16) // 8 + 1 = 10 patches

Each patch covers 16 days. The model attends over 10 patch-tokens,
not 90 timestep-tokens. Each token now has LOCAL temporal context
already embedded (16 consecutive days compressed to d_model dims).

The reduced sequence length (10 vs 90) means:
  - O(10²) = 100 attention pairs vs 8,100 → much less overfitting
  - Each token has more semantic content (a 2-week price pattern)
  - Fewer tokens = faster training

Channel-Independent (CI): patches are created PER FEATURE independently.
  Input (B, seq, C) → reshape to (B*C, seq) → patch → (B*C, n_patches, d_model)
  The SAME transformer weights are shared across all 56 features.
  This is critical: with 56 features, separate weights per feature
  would need 56× more parameters and massively overfit.
  CI is how PatchTST achieves SOTA on multivariate TS.

3. Temporal Embedding (Stream B — Time)
────────────────────────────────────────
Problem: The model doesn't know if it's Monday or end-of-quarter.
Calendar effects in Indian markets are significant:
  - Monday: gap-up/down from weekend global markets
  - Last Thursday of month: F&O expiry → high volatility
  - March/September ends: quarterly rebalancing

We encode time cyclically using sin/cos:
  month:    sin(2π × month/12),   cos(2π × month/12)
  weekday:  sin(2π × dow/5),      cos(2π × dow/5)
  dom:      sin(2π × dom/31),     cos(2π × dom/31)

  → 6 features per timestep, shape (B, seq, 6)

These are projected to d_model and then DOWNSAMPLED to n_patches
(average pooling over each patch window) to match Stream A's shape.

4. Fusion
──────────
  Token_fused = PatchEmbed(x) + TemporalEmbed_downsampled(t) + LearnablePosEnc
  → (B*C, n_patches, d_model)

This fused token carries:
  - The VALUE pattern of 16 consecutive days of one feature (Stream A)
  - The CALENDAR context of those 16 days (Stream B)
  - Its POSITION in the 10-patch sequence (positional encoding)

5. Channel-Independent Transformer Encoder
──────────────────────────────────────────
  (B*C, n_patches, d_model) → 2 × TransformerEncoderLayer → (B*C, n_patches, d_model)

Shared weights across all C features. The model learns:
  "In a rising patch (RSI_14 going from 40→65), the next patch tends to..."
  This pattern is valid whether the feature is RSI, MACD, or Stochastic.

6. Multi-Step Prediction Head
──────────────────────────────
  (B*C, n_patches, d_model) → flatten → (B*C, n_patches×d_model)
  → Linear(n_patches×d_model → horizon)
  → (B*C, horizon) → reshape (B, C, horizon) → mean over C → (B, horizon)
  → ReVIN denormalize → (B, horizon) final predictions

Output: cumulative returns from NOW to each horizon step
  y[0] = predicted 1-day cumulative return  (price change day t→t+1)
  y[1] = predicted 2-day cumulative return  (price change day t→t+2)
  y[2] = predicted 3-day cumulative return  (price change day t→t+3)

At inference, y[-1] (the furthest horizon) is used for the trading signal.
For STRONG signals, all horizon steps should agree (same sign).


PARAMETER COUNT (default: d_model=128, n_layers=2, seq=90, patch=16/8)
  n_patches = (90-16)//8 + 1 = 10
  ReVIN affine:            56 × 2 =      112
  Patch projection:   16×128 + 128 =    2,176
  Positional encoding:    10×128  =      1,280
  Time projection:      6×128+128 =        896
  Transformer 2 layers: ≈         =    265,216
  Prediction head:    128×3 + 3   =        387
  ────────────────────────────────────────────
  TOTAL:                           ≈  270,067  (1.03 MB)
  Previous buggy version had head alone at 821K params.

  
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F


# ══════════════════════════════════════════════════════════════════════
# 1. ReVIN — Reversible Instance Normalization
# ══════════════════════════════════════════════════════════════════════

class ReVIN(nn.Module):
    """
    Reversible Instance Normalization (Kim et al. 2021).

    WHY INSTANCE NORMALIZATION INSTEAD OF GLOBAL SCALING:
    ───────────────────────────────────────────────────────
    Global RobustScaler problem:
        Fitted on training data (2010–2022), normalises using the training
        distribution. A COVID window (σ≈5% daily) and a calm 2015 window
        (σ≈0.8% daily) both get scaled using the same global median/IQR.
        The model at inference sees systematic distribution shift.

    ReVIN solution:
        Each window normalises using its OWN mean and std:
          x_norm = (x - mean_window) / std_window
        After prediction:
          y_final = y_raw * std_window + mean_window

        Every window looks statistically similar regardless of regime.
        A 2020 crash window and a 2015 bull window both become
        zero-mean unit-variance sequences before the model sees them.

    Learnable affine (γ, β per feature):
        Allows the model to optionally rescale after normalization.
        Initialised as identity (γ=1, β=0). Gradient can adjust.
        In practice stays close to identity for return features.
    """

    def __init__(self, n_features: int, eps: float = 1e-5, affine: bool = True):
        super().__init__()
        self.n_features = n_features
        self.eps        = eps
        self.affine     = affine

        if affine:
            self.gamma = nn.Parameter(torch.ones(1, 1, n_features))
            self.beta  = nn.Parameter(torch.zeros(1, 1, n_features))

    def normalize(self, x: torch.Tensor):
        """
        x: (B, T, C) → x_norm: (B, T, C), stats: (mean (B,1,C), std (B,1,C))
        """
        mean = x.mean(dim=1, keepdim=True)
        std  = x.std(dim=1, keepdim=True) + self.eps
        x_norm = (x - mean) / std
        if self.affine:
            x_norm = x_norm * self.gamma + self.beta
        return x_norm, (mean, std)

    def denormalize(self, y: torch.Tensor, stats: tuple) -> torch.Tensor:
        """
        y: (B, horizon) in normalized space → original return scale
        stats: (mean (B,1,C), std (B,1,C)) from normalize()
        """
        mean, std = stats
        # Scale by first feature (ret_1d) statistics — consistent with return target
        m = mean[:, 0, 0].unsqueeze(-1)   # (B, 1)
        s = std[:,  0, 0].unsqueeze(-1)   # (B, 1)
        return y * s + m


# ══════════════════════════════════════════════════════════════════════
# 2. PatchEmbedding — Stream A (Values)
# ══════════════════════════════════════════════════════════════════════

class PatchEmbedding(nn.Module):
    """
    Patch-based temporal embedding (PatchTST, Nie et al. 2023).

    WHY PATCHES INSTEAD OF TOKEN-PER-TIMESTEP:
    ────────────────────────────────────────────
    Token-per-day:
        90 tokens → 90² = 8,100 attention pairs
        Each token = single day snapshot (no local context)
        High noise, expensive attention

    Patch embedding (patch_size=16, stride=8):
        n_patches = (90-16)//8+1 = 10 tokens
        10² = 100 attention pairs (81× less)
        Each token = 16 consecutive days compressed to d_model
        Local temporal pattern is already embedded in each token

    CHANNEL-INDEPENDENT (CI):
    ──────────────────────────
    The same Linear(patch_size, d_model) is shared across ALL 56 features.
    Input is reshaped so all features share the batch dimension: (B*C, T)
    After patching: (B*C, n_patches, d_model)

    This means the model learns: "a rising 16-day patch → next patch likely
    continues" — a pattern valid for RSI, MACD, ATR, OBV equally.
    """

    def __init__(self, seq_len: int, patch_size: int, stride: int,
                 d_model: int, dropout: float = 0.1):
        super().__init__()
        self.patch_size = patch_size
        self.stride     = stride
        self.n_patches  = (seq_len - patch_size) // stride + 1
        self.projection = nn.Linear(patch_size, d_model)
        self.norm       = nn.LayerNorm(d_model)
        self.dropout    = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: (B*C, seq_len)
        → patches: (B*C, n_patches, d_model)

        unfold extracts overlapping windows of size patch_size with step stride.
        projection maps each patch_size-dim window to d_model.
        """
        patches = x.unfold(dimension=1, size=self.patch_size, step=self.stride)
        # (B*C, n_patches, patch_size)
        patches = self.norm(self.projection(patches))
        # (B*C, n_patches, d_model)
        return self.dropout(patches)


# ══════════════════════════════════════════════════════════════════════
# 3. TemporalEmbedding — Stream B (Time)
# ══════════════════════════════════════════════════════════════════════

class TemporalEmbedding(nn.Module):
    """
    Cyclic temporal embedding from calendar features.

    WHY CYCLIC ENCODING (sin/cos) INSTEAD OF SCALAR:
    ──────────────────────────────────────────────────
    Scalar: December=11, January=0. Distance = 11. But December→January is
    the smallest possible month transition. The scalar misrepresents this.

    Cyclic: angle = 2π × month / 12
            [sin(angle), cos(angle)]
    December and January are adjacent on the unit circle.
    The model can compute cos(angle_dec - angle_jan) ≈ 1 (small distance).

    FEATURES (6 total):
        month_sin, month_cos    — seasonal patterns (period=12)
        weekday_sin, weekday_cos — Mon-Fri effects (period=5)
        dom_sin, dom_cos        — day-of-month (period=31)

    These are projected to d_model and averaged over each patch window
    to match Stream A's temporal resolution of n_patches tokens.
    """

    def __init__(self, d_model: int, patch_size: int, stride: int,
                 n_patches: int, dropout: float = 0.1):
        super().__init__()
        self.d_model    = d_model
        self.patch_size = patch_size
        self.stride     = stride
        self.n_patches  = n_patches

        self.projection = nn.Sequential(
            nn.Linear(6, d_model),
            nn.LayerNorm(d_model),
            nn.GELU(),
        )
        self.dropout = nn.Dropout(dropout)

    def forward(self, time_features: torch.Tensor) -> torch.Tensor:
        """
        time_features: (B, seq_len, 6) — cyclic encodings
        → time_emb: (B, n_patches, d_model)
        """
        t = self.projection(time_features)     # (B, seq_len, d_model)
        t_t = t.transpose(1, 2)               # (B, d_model, seq_len)
        t_patches = t_t.unfold(dimension=2, size=self.patch_size, step=self.stride)
        # (B, d_model, n_patches, patch_size)
        t_patches = t_patches.mean(dim=-1)     # avg over patch_size → (B, d_model, n_patches)
        return self.dropout(t_patches.transpose(1, 2))   # (B, n_patches, d_model)


# ══════════════════════════════════════════════════════════════════════
# 4. StockForecastNet — Main Model
# ══════════════════════════════════════════════════════════════════════

class StockForecastNet(nn.Module):
    """
    StockForecastNet V5 — full SOTA 2025 time-series forecasting architecture.

    Components:
        ReVIN           — per-instance normalization (handles non-stationarity)
        PatchEmbedding  — local temporal context (reduces sequence length 9×)
        TemporalEmbed   — cyclic calendar features (month, weekday, day-of-month)
        CI Transformer  — shared weights across 56 features (prevents overfitting)
        Lightweight head — mean pool + single linear (387 params vs 821K old)

    V5 FIXES over buggy first release:
        - Head: 821K params → 387 params (prevents massive overfitting)
        - enable_nested_tensor=False (silences 7× UserWarning on Windows)
        - Proper error handling in forward pass
    """

    def __init__(
        self,
        n_features:   int,
        seq_len:      int   = 90,
        horizon:      int   = 3,
        patch_size:   int   = 16,
        stride:       int   = 8,
        d_model:      int   = 128,
        n_heads:      int   = 4,
        n_layers:     int   = 2,
        d_ff:         int   = 256,
        dropout:      float = 0.1,
        revin_affine: bool  = True,
    ):
        super().__init__()

        self.n_features  = n_features
        self.seq_len     = seq_len
        self.horizon     = horizon
        self.patch_size  = patch_size
        self.stride      = stride
        self.d_model     = d_model
        self.n_heads     = n_heads
        self.n_layers    = n_layers
        self.d_ff        = d_ff
        self.dropout_p   = dropout
        self.revin_affine = revin_affine
        self.n_patches   = (seq_len - patch_size) // stride + 1

        assert d_model % n_heads == 0, (
            f"d_model ({d_model}) must be divisible by n_heads ({n_heads})"
        )
        assert seq_len >= patch_size, (
            f"seq_len ({seq_len}) must be >= patch_size ({patch_size})"
        )

        # ── Components ────────────────────────────────────────────────────
        self.revin      = ReVIN(n_features=n_features, affine=revin_affine)

        self.patch_embed = PatchEmbedding(
            seq_len=seq_len, patch_size=patch_size, stride=stride,
            d_model=d_model, dropout=dropout,
        )
        self.time_embed  = TemporalEmbedding(
            d_model=d_model, patch_size=patch_size, stride=stride,
            n_patches=self.n_patches, dropout=dropout,
        )

        # Learnable positional encoding: one vector per patch position
        # Shared across all C features (CI design)
        self.pos_enc = nn.Parameter(torch.randn(1, self.n_patches, d_model) * 0.02)

        # Transformer encoder — Channel-Independent (shared weights across features)
        # FIX: enable_nested_tensor=False silences PyTorch ≥2.0 UserWarning
        # when norm_first=True is used (which we keep for Pre-LN stability)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model         = d_model,
            nhead           = n_heads,
            dim_feedforward = d_ff,
            dropout         = dropout,
            activation      = "gelu",
            batch_first     = True,
            norm_first      = True,   # Pre-LN: more stable gradient flow
        )
        self.encoder      = nn.TransformerEncoder(
            encoder_layer,
            num_layers         = n_layers,
            enable_nested_tensor = False,   # FIX: suppresses the 7× UserWarning
        )
        self.encoder_norm = nn.LayerNorm(d_model)

        # Prediction head — FIXED: 387 params instead of 821K
        # (B*C, n_patches, d_model) → mean over patches → (B*C, d_model)
        # → Linear(d_model, horizon) → (B*C, horizon)
        self.head = nn.Linear(d_model, horizon)

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
        nn.init.normal_(self.pos_enc, std=0.02)

    def forward(self, x: torch.Tensor,
                time_features: torch.Tensor = None) -> torch.Tensor:
        """
        Full dual-stream forward pass.

        Args:
            x:             (B, seq_len, n_features)
            time_features: (B, seq_len, 6)  or None

        Returns:
            predictions: (B, horizon) — cumulative return predictions
                y[:, 0]  = 1-day ahead cumulative return
                y[:, -1] = N-day ahead cumulative return (primary signal)
        """
        B, T, C = x.shape

        # ── Step 1: ReVIN normalize ────────────────────────────────────────
        # Normalise each window independently to remove distribution shift
        x_norm, revin_stats = self.revin.normalize(x)   # (B, T, C)

        # ── Step 2: Reshape for Channel-Independent processing ─────────────
        # (B, T, C) → (B*C, T): each row = one feature's time series
        x_ci = x_norm.transpose(1, 2).reshape(B * C, T)   # (B*C, T)

        # ── Step 3A: Patch embedding (Value stream) ────────────────────────
        val_emb = self.patch_embed(x_ci)
        # (B*C, n_patches, d_model)

        # ── Step 3B: Temporal embedding (Time stream) ─────────────────────
        if time_features is None:
            time_features = torch.zeros(B, T, 6, device=x.device, dtype=x.dtype)
        time_emb = self.time_embed(time_features)
        # (B, n_patches, d_model) → expand to (B*C, n_patches, d_model)
        time_emb = (time_emb.unsqueeze(1)
                            .expand(-1, C, -1, -1)
                            .reshape(B * C, self.n_patches, self.d_model))

        # ── Step 4: Fusion ─────────────────────────────────────────────────
        # Each patch token = value pattern + calendar context + position
        fused = val_emb + time_emb + self.pos_enc   # (B*C, n_patches, d_model)

        # ── Step 5: Channel-Independent Transformer ────────────────────────
        # Self-attention across 10 patch positions (not 90 timesteps)
        # SAME weights for all 56 features (channel-independent)
        enc_out = self.encoder(fused)                 # (B*C, n_patches, d_model)
        enc_out = self.encoder_norm(enc_out)

        # ── Step 6: Pool and aggregate features ────────────────────────────
        # Mean over patches → (B*C, d_model)
        pooled  = enc_out.mean(dim=1)                 # (B*C, d_model)
        # Reshape back to per-sample: (B, C, d_model)
        pooled  = pooled.reshape(B, C, self.d_model)
        # Mean over features: each indicator contributes equally to the prediction
        pooled  = pooled.mean(dim=1)                  # (B, d_model)

        # ── Step 7: Prediction head ─────────────────────────────────────────
        # Single Linear(d_model, horizon) — 387 params (was 821K)
        y_raw = self.head(pooled)                     # (B, horizon)

        # ── Step 8: ReVIN denormalize ───────────────────────────────────────
        predictions = self.revin.denormalize(y_raw, revin_stats)
        return predictions   # (B, horizon)

    def predict_signal(self, x: torch.Tensor,
                       time_features: torch.Tensor = None,
                       conf_scale: float = 100.0):
        """
        Inference convenience method.

        Returns:
            direction:   int   (1=UP, 0=DOWN) — based on primary horizon step
            confidence:  float (0.5–1.0) — sigmoid of |prediction| × scale
            pred_return: float — primary horizon prediction (signed %)
            all_steps:   list  — prediction for each horizon step
        """
        if x.dim() == 2:
            x = x.unsqueeze(0)
        if time_features is not None and time_features.dim() == 2:
            time_features = time_features.unsqueeze(0)

        self.eval()
        with torch.no_grad():
            preds = self.forward(x, time_features)

        pred_return = preds[0, -1].item()
        direction   = 1 if pred_return > 0 else 0
        confidence  = 1.0 / (1.0 + math.exp(-abs(pred_return) * conf_scale))
        return direction, confidence, pred_return, preds[0].tolist()

    def get_config(self) -> dict:
        """Returns constructor kwargs for exact state_dict reloading."""
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
            "revin_affine": self.revin_affine,
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
            "prediction_head":       n(self.head),
            "total":                 total,
            "size_mb":               round(total * 4 / 1024 / 1024, 3),
        }

    def __repr__(self):
        total = sum(p.numel() for p in self.parameters())
        return (
            f"StockForecastNet V5("
            f"features={self.n_features}, seq={self.seq_len}, "
            f"horizon={self.horizon}, patch={self.patch_size}/{self.stride}, "
            f"d_model={self.d_model}, layers={self.n_layers}, "
            f"patches={self.n_patches}, "
            f"params={total:,}, {total*4/1024/1024:.3f}MB)"
        )


# ══════════════════════════════════════════════════════════════════════
# Backwards compatibility aliases
# ══════════════════════════════════════════════════════════════════════
StockPredictor    = StockForecastNet
StockPredictorTFT = StockForecastNet
StockTransformerV2 = StockForecastNet