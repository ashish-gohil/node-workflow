"""
model_v4.py — StockPredictor V4  (iTransformer architecture)
=============================================================

ARCHITECTURE SUMMARY
─────────────────────
V4 makes two fundamental changes from V3:

1. INVERTED ATTENTION (iTransformer, Liu et al. 2024)
   Standard transformer: each TIMESTEP is a token, attention across TIME
   iTransformer:         each FEATURE is a token, attention across FEATURES

   Why this matters for stock prediction:
   With 56 features per timestep, standard attention mixes RSI + MACD +
   OBV into one 64-dim vector BEFORE attention. The model then asks
   "which of the 30 days was most relevant?" — but it has lost track of
   which specific indicators were driving that day's significance.

   iTransformer instead asks "which INDICATORS are most correlated with
   each other for this prediction?" RSI's 30-day temporal pattern is one
   token. MACD's 30-day temporal pattern is another. Attention then
   discovers "when RSI shows divergence AND MACD histogram turns positive
   AND OBV confirms → return is likely positive."

   This feature-interaction learning is precisely what we want for a
   technical analysis model. Empirically: iTransformer outperforms all
   previous time-series transformers on standard benchmarks.

2. SINGLE REGRESSION HEAD (no classification head)
   V3 had: dir_logits (2-class) + ret_pred (scalar)
   Loss = FocalLoss(dir) + 0.2 * HuberLoss(ret)

   Problem: shared MLP receives gradients from TWO conflicting objectives.
   Direction head wants embeddings that encode "will sign be positive?"
   Return head wants embeddings that encode "how big will the move be?"
   These are genuinely different representations. When they conflict,
   gradients partially cancel and the model fails to learn either well.

   V4 has: single signed_return (scalar)
   Loss = HuberLoss(predicted_3day_return, actual_3day_return)

   Direction is derived at inference: direction = sign(predicted_return)
   No information is lost (direction IS the sign of return).
   One objective = no gradient conflict = much more stable training.

FULL FORWARD PASS
─────────────────
Input (B, window=30, n_features=56)
    ↓  transpose
(B, 56, 30)  — 56 feature tokens, each with 30-step time embedding
    ↓  Linear(30 → d_model) + LayerNorm per feature
(B, 56, d_model)
    ↓  learnable feature position encoding (which feature is which)
(B, 56, d_model)
    ↓  N × TransformerEncoderLayer (Pre-LN, n_heads heads)
       attention is over 56 features, not 30 timesteps
(B, 56, d_model)
    ↓  mean pool across 56 features
(B, d_model)
    ↓  MLP: d_model → d_model//2 → 1
signed_return scalar  (positive = predict UP, negative = predict DOWN)

At inference:
    direction  = +1 if signed_return > 0 else 0
    confidence = sigmoid(|signed_return| × scale)  (proxy from magnitude)
    predicted_return = signed_return

STATE DICT LOADING
──────────────────
Always save with get_config() alongside state_dict:
    torch.save(model.state_dict(), "model_v2.pth")
    torch.save(model.get_config(), "model_v2_config.pth")

Load with strict=False for backwards compatibility:
    cfg   = torch.load("model_v2_config.pth", map_location="cpu")
    model = StockPredictor(**cfg)
    model.load_state_dict(torch.load("model_v2.pth", map_location="cpu"), strict=False)
    model.eval()
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


# ─────────────────────────────────────────────────────────────────────────────
# iTransformer Encoder Layer
# ─────────────────────────────────────────────────────────────────────────────

class iTransformerLayer(nn.Module):
    """
    One encoder layer of the iTransformer.

    Operates on FEATURE tokens, not time tokens.
    Input shape: (B, n_features, d_model)
    Each feature has a d_model-dimensional representation (its 30-day embedding).
    Attention discovers which features are correlated for this prediction.

    Uses Pre-LN (LayerNorm before attention): more stable training than Post-LN
    because gradients at initialisation are already normalised.
    """

    def __init__(self, d_model: int, n_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0, (
            f"d_model ({d_model}) must be divisible by n_heads ({n_heads})"
        )
        # Pre-LN: LayerNorm BEFORE attention (more stable)
        self.norm1   = nn.LayerNorm(d_model)
        self.attn    = nn.MultiheadAttention(
            d_model, n_heads, dropout=dropout, batch_first=True
        )
        self.norm2   = nn.LayerNorm(d_model)
        self.ff      = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model),
            nn.Dropout(dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, n_features, d_model)
        # Pre-LN attention with residual
        h = self.norm1(x)
        h, _ = self.attn(h, h, h)
        x = x + h

        # Pre-LN feedforward with residual
        h = self.norm2(x)
        h = self.ff(h)
        return x + h


# ─────────────────────────────────────────────────────────────────────────────
# StockPredictor — main model
# ─────────────────────────────────────────────────────────────────────────────

class StockPredictor(nn.Module):
    """
    iTransformer-based stock return predictor.

    Predicts a SIGNED RETURN for a multi-day horizon (default 3 days).
    Direction = sign(prediction), Magnitude = abs(prediction).

    Default config (d_model=64, n_layers=2, n_heads=4):
        ~109K parameters, 0.42 MB
        CPU: ~10-15s/epoch  |  Colab T4: ~2s/epoch

    Config selection:
        d_model=64,  n_layers=2  → single stock, ~4K samples
        d_model=64,  n_layers=4  → multi-stock pretrain, ~15K samples
        d_model=96,  n_layers=4  → large pretrain, 30K+ samples
    """

    def __init__(
        self,
        input_dim:  int,          # number of features (56 with current feature set)
        window:     int   = 30,   # sequence length (days)
        d_model:    int   = 64,   # internal embedding dimension
        n_layers:   int   = 2,    # number of iTransformer encoder layers
        n_heads:    int   = 4,    # attention heads (must divide d_model)
        d_ff:       int   = 128,  # feedforward hidden dimension (2× d_model default)
        dropout:    float = 0.1,
        horizon:    int   = 3,    # prediction horizon in days (stored for reference)
    ):
        super().__init__()
        self.input_dim = input_dim
        self.window    = window
        self.d_model   = d_model
        self.n_layers  = n_layers
        self.n_heads   = n_heads
        self.d_ff      = d_ff
        self.dropout_p = dropout
        self.horizon   = horizon

        # Feature embedding: project 30-day time series of each feature → d_model
        # Applied independently to each of the 56 features
        # Input: (B, n_features, window)  → output: (B, n_features, d_model)
        self.feature_embed = nn.Sequential(
            nn.Linear(window, d_model),
            nn.LayerNorm(d_model),
        )

        # Learnable position encoding for features (not time)
        # Each of the 56 features gets its own learned offset vector
        # This tells the model "this is RSI" vs "this is MACD" etc.
        self.feature_pos_enc = nn.Parameter(
            torch.randn(1, input_dim, d_model) * 0.02
        )

        # iTransformer encoder layers: attention over feature dimension
        self.encoder = nn.ModuleList([
            iTransformerLayer(d_model, n_heads, d_ff, dropout)
            for _ in range(n_layers)
        ])

        self.norm_out = nn.LayerNorm(d_model)

        # MLP head: d_model → d_model//2 → 1 (single signed return output)
        self.mlp = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, 1),
        )

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, window, input_dim)  — normalised feature sequences

        Returns:
            pred: (batch, 1)  — predicted signed return
                  positive → predict UP (direction = 1)
                  negative → predict DOWN (direction = 0)
        """
        B, T, n_feat = x.shape
        # NOTE: n_feat NOT F — F is torch.nn.functional (imported above)

        # Step 1: Transpose — make features the sequence dimension
        # (B, window, n_features) → (B, n_features, window)
        x = x.transpose(1, 2)

        # Step 2: Embed each feature's time-series into d_model dimensions
        # Linear(window → d_model) applied identically to all 56 features
        x = self.feature_embed(x)    # (B, n_features, d_model)

        # Step 3: Add learnable feature identity encoding
        x = x + self.feature_pos_enc   # (B, n_features, d_model)

        # Step 4: Run through iTransformer encoder layers
        # Attention is over the n_features dimension = features attend to each other
        for layer in self.encoder:
            x = layer(x)

        x = self.norm_out(x)          # (B, n_features, d_model)

        # Step 5: Mean pool over features → single vector per sample
        x = x.mean(dim=1)             # (B, d_model)

        # Step 6: MLP → single signed return prediction
        pred = self.mlp(x)            # (B, 1)
        return pred

    def predict_signal(self, x: torch.Tensor, conf_scale: float = 100.0):
        """
        Convenience method for inference.

        Returns:
            direction:   int   (1=UP, 0=DOWN)
            confidence:  float (0-1, derived from prediction magnitude)
            pred_return: float (raw signed return prediction)
        """
        with torch.no_grad():
            pred = self.forward(x)

        pred_val   = pred.squeeze(-1).item()
        direction  = 1 if pred_val > 0 else 0
        # Confidence proxy: sigmoid of scaled magnitude
        # |pred| = 0.01 (1%) → confidence ≈ 0.73
        # |pred| = 0.02 (2%) → confidence ≈ 0.88
        # |pred| = 0.005 → confidence ≈ 0.62
        confidence = float(torch.sigmoid(torch.tensor(abs(pred_val) * conf_scale)))
        return direction, confidence, pred_val

    def get_config(self) -> dict:
        """
        Returns constructor kwargs — save this alongside state_dict.
        Guarantees clean loading: model = StockPredictor(**cfg)
        """
        return {
            "input_dim": self.input_dim,
            "window":    self.window,
            "d_model":   self.d_model,
            "n_layers":  self.n_layers,
            "n_heads":   self.n_heads,
            "d_ff":      self.d_ff,
            "dropout":   0.0,          # always 0 at inference
            "horizon":   self.horizon,
        }

    def count_parameters(self) -> dict:
        def n(m): return sum(p.numel() for p in m.parameters())
        total = n(self)
        return {
            "feature_embedding":     n(self.feature_embed),
            "feature_pos_encoding":  self.feature_pos_enc.numel(),
            "encoder_layers":        n(self.encoder),
            "output_mlp":            n(self.mlp),
            "total":                 total,
            "size_mb":               round(total * 4 / 1024 / 1024, 3),
        }

    def __repr__(self):
        total = sum(p.numel() for p in self.parameters())
        return (
            f"StockPredictor(iTransformer, "
            f"input_dim={self.input_dim}, window={self.window}, "
            f"d_model={self.d_model}, n_layers={self.n_layers}, "
            f"n_heads={self.n_heads}, horizon={self.horizon}, "
            f"params={total:,}, {total*4/1024/1024:.3f}MB)"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Backwards compatibility aliases
# ─────────────────────────────────────────────────────────────────────────────

StockPredictorTFT  = StockPredictor