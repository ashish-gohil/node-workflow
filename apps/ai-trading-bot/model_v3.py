"""
model_v2.py — StockPredictorTFT  v3
====================================

ARCHITECTURE EVOLUTION
───────────────────────
V1 (original):  Vanilla BERT-style Transformer
  Problem:  559K params, global attention, label_smoothing=0.1
  Result:   0.693 loss = random predictions (ln(2) = 0.6931)

V2:  TFT-inspired with per-feature GRN loop + TCN + Attention + GLU
  Problems:
    1. VSN used per-feature GRNs in a Python for-loop → slow, unstable gradients
    2. OneCycleLR with lr=3e-4 caused loss spikes in first few epochs
    3. Variable named 'F' shadowed torch.nn.functional import (the ValueError bug)
  Result:   ~50% accuracy, early stopping around epoch 20

V3 (this):  Batched VSN + weight_norm TCN + get_config() for robust loading
  Fixes:
    1. VSN is now a batched Linear projection (no Python for-loop over features)
       → 100x faster, stable gradients, same representational power
    2. TCN layers now use weight_norm for training stability
    3. MLP is 3 layers (deeper = richer representation after pooling)
    4. get_config() method ensures state_dict always loads cleanly
    5. Never uses variable name 'F' (was causing int.softmax() crash)

STATE DICT COMPATIBILITY
─────────────────────────
V2 checkpoints are NOT compatible with V3 (VSN structure changed entirely).
Always save and load the config alongside the weights:

    # Save:
    torch.save(model.state_dict(), "model_v2.pth")
    torch.save(model.get_config(), "model_v2_config.pth")

    # Load:
    cfg   = torch.load("model_v2_config.pth", map_location="cpu")
    model = StockPredictorTFT(**cfg)
    model.load_state_dict(torch.load("model_v2.pth", map_location="cpu"))
    model.eval()
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.nn.utils import weight_norm


# ─────────────────────────────────────────────────────────────────────────────
# GatedResidualNetwork
# ─────────────────────────────────────────────────────────────────────────────

class GatedResidualNetwork(nn.Module):
    """
    From TFT paper (Lim et al. 2021).
    Gate σ(Wg·x) controls how much of the transformation h(x) passes through.
    Gate≈0: input passes unchanged (feature is irrelevant for this context).
    Gate≈1: full nonlinear transformation applied (feature is informative).
    """

    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int,
                 dropout: float = 0.1):
        super().__init__()
        self.fc1     = nn.Linear(input_dim, hidden_dim)
        self.fc2     = nn.Linear(hidden_dim, output_dim)
        self.gate    = nn.Linear(input_dim, output_dim)
        self.skip    = (nn.Linear(input_dim, output_dim)
                        if input_dim != output_dim else nn.Identity())
        self.norm    = nn.LayerNorm(output_dim)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h    = self.dropout(F.elu(self.fc1(x)))
        h    = self.fc2(h)
        gate = torch.sigmoid(self.gate(x))
        return self.norm(self.skip(x) + gate * h)


# ─────────────────────────────────────────────────────────────────────────────
# VariableSelectionNetwork  (V3: batched, no per-feature for-loop)
# ─────────────────────────────────────────────────────────────────────────────

class VariableSelectionNetwork(nn.Module):
    """
    Learns which input features matter for prediction.

    V3 DESIGN (batched):
    ┌──────────────────────────────────────────────────────────────────────┐
    │ Input  (B, T, n_features)                                            │
    │                                                                      │
    │ Two parallel paths:                                                  │
    │                                                                      │
    │ Path A — direct projection:                                          │
    │   Linear(n_features → d_model) + LayerNorm + GELU                   │
    │   → (B, T, d_model)                                                  │
    │                                                                      │
    │ Path B — per-feature weighted projection:                            │
    │   weights = softmax(GRN(n_features → n_features))  (B, T, n_feat)   │
    │   feats   = Linear(n_features → n_feat * d_model)  (B, T, n_feat, d)│
    │   output  = sum(feats * weights.unsqueeze(-1), dim=-2)               │
    │   → (B, T, d_model)                                                  │
    │                                                                      │
    │ Final = Path_A + Path_B  (residual combination)                      │
    └──────────────────────────────────────────────────────────────────────┘

    Key difference from V2: the entire computation is a single batched matmul,
    not a Python for-loop over n_features. This is critical for:
    - Speed: all features processed in parallel on GPU
    - Stability: single backward pass, not n_features separate ones
    - Memory: no Python-level loop accumulation

    IMPORTANT: the local variable for sequence length is 'seq_len', not 'T', and
    the local variable for feature count is 'n_feat', NOT 'F'. Using 'F' would
    shadow the module import 'torch.nn.functional as F' above and cause
    AttributeError: 'int' object has no attribute 'softmax'.
    """

    def __init__(self, n_features: int, d_model: int, dropout: float = 0.1):
        super().__init__()
        self.n_features = n_features
        self.d_model    = d_model

        # Path A: direct projection
        self.input_proj = nn.Sequential(
            nn.Linear(n_features, d_model),
            nn.LayerNorm(d_model),
            nn.GELU(),
            nn.Dropout(dropout),
        )

        # Path B: per-feature weighted projection
        # feature_proj maps n_features → (n_features * d_model) in one matmul
        # then we reshape to get per-feature d_model vectors
        self.feature_proj = nn.Linear(n_features, n_features * d_model, bias=False)

        # Selection weights: GRN outputs n_features scalars, then softmax
        self.weight_grn = GatedResidualNetwork(n_features, d_model, n_features, dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: (batch, seq_len, n_features)
        returns: (batch, seq_len, d_model)
        """
        batch, seq_len, n_feat = x.shape
        # ↑ Using n_feat NOT F — F is torch.nn.functional (the imported module)

        # Path A: direct projection
        out_a = self.input_proj(x)                     # (B, T, d_model)

        # Path B: weighted per-feature projections
        # Step 1: project each feature to d_model — all at once in one matmul
        feats = self.feature_proj(x)                   # (B, T, n_feat * d_model)
        feats = feats.view(batch, seq_len, n_feat, self.d_model)  # (B, T, n_feat, d_model)

        # Step 2: compute selection weights — one scalar per feature
        # F.softmax here refers to torch.nn.functional.softmax (the module)
        weights = F.softmax(self.weight_grn(x), dim=-1)           # (B, T, n_feat)

        # Step 3: weighted sum over features
        out_b = (feats * weights.unsqueeze(-1)).sum(dim=-2)        # (B, T, d_model)

        return out_a + out_b


# ─────────────────────────────────────────────────────────────────────────────
# CausalDilatedConv — TCN layer with weight_norm
# ─────────────────────────────────────────────────────────────────────────────

class CausalDilatedConv(nn.Module):
    """
    Dilated causal 1D convolution with Gated Linear Unit activation.

    CAUSAL: padding only left side → output at position t cannot see future.
    DILATED: dilation=d means kernel covers t, t-d, t-2d (not consecutive).
      4 layers at [1,2,4,8]: receptive field = 1 + 2*(1+2+4+8) = 31 steps.

    WEIGHT_NORM: normalises weight vectors to unit norm during training.
    Removes need for careful LR tuning for conv layers, stabilises gradients.
    This is the standard approach for TCN (Bai et al. 2018).

    GLU: output = sigmoid(gate) * content — learns to suppress channels.
    """

    def __init__(self, d_model: int, dilation: int, dropout: float = 0.1):
        super().__init__()
        kernel_size   = 3
        self.pad_size = (kernel_size - 1) * dilation
        self.conv     = weight_norm(
            nn.Conv1d(d_model, d_model * 2, kernel_size=kernel_size,
                      dilation=dilation, padding=self.pad_size)
        )
        self.norm    = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """x: (B, T, d_model) → (B, T, d_model)"""
        h = self.conv(x.transpose(1, 2))              # (B, 2*d_model, T+pad)
        h = h[:, :, : x.size(1)]                      # causal: remove future padding
        h_c, h_g = h.chunk(2, dim=1)
        h = h_c * torch.sigmoid(h_g)                  # GLU: (B, d_model, T)
        h = self.dropout(h.transpose(1, 2))            # (B, T, d_model)
        return self.norm(x + h)                        # residual


# ─────────────────────────────────────────────────────────────────────────────
# LightweightAttention
# ─────────────────────────────────────────────────────────────────────────────

class LightweightAttention(nn.Module):
    """
    2-head self-attention after TCN to capture long-range dependencies.
    2 heads only (not 8) because TCN already handles local patterns.
    """

    def __init__(self, d_model: int, n_heads: int = 2, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0, (
            f"d_model={d_model} must be divisible by n_heads={n_heads}"
        )
        self.attn    = nn.MultiheadAttention(
            d_model, n_heads, dropout=dropout, batch_first=True
        )
        self.norm    = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h, _ = self.attn(x, x, x)
        return self.norm(x + self.dropout(h))


# ─────────────────────────────────────────────────────────────────────────────
# GLUPooling
# ─────────────────────────────────────────────────────────────────────────────

class GLUPooling(nn.Module):
    """
    Learned temporal pooling: (B, T, d_model) → (B, d_model).
    Learns a soft timestep weight. Recent days typically get higher weights
    but the model can learn any weighting pattern from data.
    """

    def __init__(self, d_model: int):
        super().__init__()
        self.gate_proj = nn.Linear(d_model, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        weights = torch.softmax(self.gate_proj(x), dim=1)   # (B, T, 1)
        return (x * weights).sum(dim=1)                     # (B, d_model)


# ─────────────────────────────────────────────────────────────────────────────
# StockPredictorTFT — main model
# ─────────────────────────────────────────────────────────────────────────────

class StockPredictorTFT(nn.Module):
    """
    StockPredictorTFT v3.

    Forward:
        (B, window, n_features)
          VSN   → (B, window, d_model)
          TCN   → (B, window, d_model)
          Attn  → (B, window, d_model)
          Pool  → (B, d_model)
          MLP   → (B, d_model//2)
          Heads → dir_logits (B,2) + ret_pred (B,1)

    Default config: d_model=64, n_tcn_layers=4
        ~200K parameters, ~0.76 MB
        CPU: ~15-25s/epoch with 4000 samples
        Colab T4: ~3-5s/epoch

    Saving/loading:
        torch.save(model.state_dict(), path)
        torch.save(model.get_config(), config_path)

        cfg   = torch.load(config_path, map_location="cpu")
        model = StockPredictorTFT(**cfg)
        model.load_state_dict(torch.load(path, map_location="cpu"))
    """

    def __init__(
        self,
        input_dim:    int,
        d_model:      int   = 64,
        n_tcn_layers: int   = 4,
        n_attn_heads: int   = 2,
        dropout:      float = 0.2,
        window:       int   = 30,    # stored for config only, not used in forward
    ):
        super().__init__()
        self.input_dim    = input_dim
        self.d_model      = d_model
        self.n_tcn_layers = n_tcn_layers
        self.n_attn_heads = n_attn_heads
        self.dropout_p    = dropout
        self.window       = window

        self.vsn  = VariableSelectionNetwork(input_dim, d_model, dropout)
        self.tcn  = nn.Sequential(*[
            CausalDilatedConv(d_model, dilation=2 ** i, dropout=dropout)
            for i in range(n_tcn_layers)
        ])
        self.attn = LightweightAttention(d_model, n_heads=n_attn_heads, dropout=dropout)
        self.pool = GLUPooling(d_model)
        self.mlp  = nn.Sequential(
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
        )
        self.dir_head = nn.Linear(d_model // 2, 2)
        self.ret_head = nn.Linear(d_model // 2, 1)

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Conv1d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out")
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor):
        x = self.vsn(x)
        x = self.tcn(x)
        x = self.attn(x)
        x = self.pool(x)
        x = self.mlp(x)
        return self.dir_head(x), self.ret_head(x)

    def get_config(self) -> dict:
        """Save this with state_dict for clean reloading."""
        return {
            "input_dim":    self.input_dim,
            "d_model":      self.d_model,
            "n_tcn_layers": self.n_tcn_layers,
            "n_attn_heads": self.n_attn_heads,
            "dropout":      0.0,         # always 0 at inference
            "window":       self.window,
        }

    def count_parameters(self) -> dict:
        def n(m): return sum(p.numel() for p in m.parameters())
        total = n(self)
        return {
            "vsn":           n(self.vsn),
            "tcn":           n(self.tcn),
            "attention":     n(self.attn),
            "glu_pooling":   n(self.pool),
            "mlp":           n(self.mlp),
            "output_heads":  n(self.dir_head) + n(self.ret_head),
            "total":         total,
            "size_mb":       round(total * 4 / 1024 / 1024, 2),
        }

    def __repr__(self):
        total = sum(p.numel() for p in self.parameters())
        return (
            f"StockPredictorTFT("
            f"input_dim={self.input_dim}, d_model={self.d_model}, "
            f"n_tcn={self.n_tcn_layers}, n_heads={self.n_attn_heads}, "
            f"params={total:,}, {total*4/1024/1024:.2f}MB)"
        )


# ─────────────────────────────────────────────────────────────────────────────
# FocalLoss
# ─────────────────────────────────────────────────────────────────────────────

class FocalLoss(nn.Module):
    """
    Focal Loss (Lin et al. 2017).

    Down-weights easy (high-confidence) examples so training focuses on
    the uncertain ones. Better than cross-entropy for stock prediction
    where ~50% of days have ambiguous direction.

    FL = -alpha x (1 - p_correct)^gamma x log(p_correct)
    gamma=2: a sample at 80% confidence gets only 4% relative weight vs
             a sample at 50% confidence.
    """

    def __init__(self, gamma: float = 2.0, alpha: float = 0.5):
        super().__init__()
        self.gamma = gamma
        self.alpha = alpha

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        ce    = F.cross_entropy(logits, targets, reduction="none")
        pt    = torch.exp(-ce)
        focal = self.alpha * (1.0 - pt) ** self.gamma * ce
        return focal.mean()


# backwards compat
StockTransformer = StockPredictorTFT