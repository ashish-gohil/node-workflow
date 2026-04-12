"""
model_v2.py  —  StockPredictorTFT  (Temporal Fusion Transformer-inspired)

BUG FIXED: AttributeError: 'int' object has no attribute 'softmax'
  Root cause: inside VariableSelectionNetwork.forward(), the line
      B, T, F = x.shape
  assigned the integer 39 (number of features) to variable F.
  This shadowed the module-level import:
      import torch.nn.functional as F
  So when the code later called F.softmax(...), it was calling
  int(39).softmax(...) which raised AttributeError.
  Fix: renamed to B, T, n_feat = x.shape throughout the method.

ARCHITECTURE:
  Input (B, T, n_features)
    → Variable Selection Network   [learns which features matter]
    → TCN (dilated causal conv)    [local time patterns, causal]
    → Lightweight Attention        [long-range dependencies]
    → GLU Pooling                  [which timesteps matter most]
    → MLP
    → Direction head (UP/DOWN) + Return head (expected %)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F   # IMPORTANT: never use 'F' as a local variable name


class GatedResidualNetwork(nn.Module):
    """
    GRN from TFT paper (Lim et al. 2021).
    A learned gate decides how much transformation to apply per input.
    Gate ≈ 0  → feature irrelevant, input passes through unchanged.
    Gate ≈ 1  → transformation applied in full.
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


class VariableSelectionNetwork(nn.Module):
    """
    Learns which of the input features are useful for prediction.
    Each feature gets a soft selection weight (0 = ignore, 1 = use).
    Features that do not help predict direction get weight ≈ 0.
    """

    def __init__(self, n_features: int, d_model: int, dropout: float = 0.1):
        super().__init__()
        self.n_features  = n_features
        self.feature_grns = nn.ModuleList([
            GatedResidualNetwork(1, d_model, d_model, dropout)
            for _ in range(n_features)
        ])
        self.weight_grn = GatedResidualNetwork(n_features, d_model, n_features, dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """x: (B, T, n_features) → out: (B, T, d_model)"""

        # ── BUG FIX ──────────────────────────────────────────────────────────
        # Use 'n_feat' NOT 'F'. Using F here shadows 'torch.nn.functional as F'
        # imported above, turning F into an integer (39) so that F.softmax()
        # crashes with "AttributeError: 'int' object has no attribute 'softmax'"
        B, T, n_feat = x.shape
        # ─────────────────────────────────────────────────────────────────────

        # Each feature: scalar → d_model vector via its own GRN
        xi = torch.stack([
            self.feature_grns[i](x[..., i : i + 1])
            for i in range(n_feat)
        ], dim=-2)   # (B, T, n_feat, d_model)

        # Soft selection weights — F here is torch.nn.functional (the module)
        weights = F.softmax(self.weight_grn(x), dim=-1)   # (B, T, n_feat)

        # Weighted sum across features
        out = (xi * weights.unsqueeze(-1)).sum(dim=-2)    # (B, T, d_model)
        return out


class CausalDilatedConv(nn.Module):
    """
    One TCN layer: dilated causal 1D convolution with GLU activation.

    CAUSAL: padding only on the left → output at t never sees t+1, t+2, ...
    DILATED: dilation d → kernel covers t, t-d, t-2d (exponential receptive field)
    GLU: output = content * sigmoid(gate) → learned channel suppression

    4 layers with dilations [1,2,4,8] → receptive field = 31 timesteps.
    """

    def __init__(self, d_model: int, dilation: int, dropout: float = 0.1):
        super().__init__()
        kernel_size   = 3
        self.pad_size = (kernel_size - 1) * dilation
        self.conv     = nn.Conv1d(
            d_model, d_model * 2,
            kernel_size=kernel_size,
            dilation=dilation,
            padding=self.pad_size,
        )
        self.norm    = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """x: (B, T, d_model)"""
        h = self.conv(x.transpose(1, 2))          # (B, 2*d_model, T+pad)
        h = h[:, :, : x.size(1)]                  # trim to T (causal)
        h_content, h_gate = h.chunk(2, dim=1)
        h = h_content * torch.sigmoid(h_gate)     # GLU: (B, d_model, T)
        h = self.dropout(h.transpose(1, 2))        # (B, T, d_model)
        return self.norm(x + h)                    # residual


class LightweightAttention(nn.Module):
    """2-head self-attention after TCN — captures long-range patterns."""

    def __init__(self, d_model: int, n_heads: int = 2, dropout: float = 0.1):
        super().__init__()
        assert d_model % n_heads == 0, (
            f"d_model ({d_model}) must be divisible by n_heads ({n_heads})"
        )
        self.attn    = nn.MultiheadAttention(
            d_model, n_heads, dropout=dropout, batch_first=True
        )
        self.norm    = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h, _ = self.attn(x, x, x)
        return self.norm(x + self.dropout(h))


class GLUPooling(nn.Module):
    """Learned temporal pooling: (B, T, d_model) → (B, d_model)."""

    def __init__(self, d_model: int):
        super().__init__()
        self.gate_proj = nn.Linear(d_model, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        weights = torch.softmax(self.gate_proj(x), dim=1)  # (B, T, 1)
        return (x * weights).sum(dim=1)                    # (B, d_model)


class StockPredictorTFT(nn.Module):
    """
    TFT-inspired stock direction + return predictor.

    Default: d_model=64, n_tcn_layers=4, n_attn_heads=2, dropout=0.2
    Parameters: ~311K  |  Size: ~1.2 MB  |  CPU epoch: ~15-20s

    Tuning guide (see README Section 8 for full details):
      More data first → then tune model size:
        d_model=64   → 311K params → good for 2000-8000  training samples
        d_model=96   → 700K params → good for 8000-15000 training samples
        d_model=128  → 1.2M params → good for 15000+     training samples

      Overfitting (train_acc >> val_acc):  increase dropout, decrease d_model
      Underfitting (both accs low):        decrease dropout, increase d_model or n_tcn_layers

      Longer sequences:  n_tcn_layers=5 gives receptive field=63 (use with window=60)
    """

    def __init__(
        self,
        input_dim:    int,
        d_model:      int   = 64,
        n_tcn_layers: int   = 4,
        n_attn_heads: int   = 2,
        dropout:      float = 0.2,
    ):
        super().__init__()
        self.input_dim = input_dim
        self.d_model   = d_model

        self.vsn  = VariableSelectionNetwork(input_dim, d_model, dropout)

        dilations = [2 ** i for i in range(n_tcn_layers)]
        self.tcn  = nn.Sequential(*[
            CausalDilatedConv(d_model, dilation=d, dropout=dropout)
            for d in dilations
        ])

        self.attn = LightweightAttention(d_model, n_heads=n_attn_heads, dropout=dropout)
        self.pool = GLUPooling(d_model)

        self.mlp  = nn.Sequential(
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

    def forward(self, x: torch.Tensor):
        """x: (B, T, input_dim) → (dir_logits (B,2), ret_pred (B,1))"""
        x = self.vsn(x)
        x = self.tcn(x)
        x = self.attn(x)
        x = self.pool(x)
        x = self.mlp(x)
        return self.dir_head(x), self.ret_head(x)

    def count_parameters(self) -> dict:
        def n(m): return sum(p.numel() for p in m.parameters())
        return {
            "vsn":       n(self.vsn),
            "tcn":       n(self.tcn),
            "attention": n(self.attn),
            "pooling":   n(self.pool),
            "mlp":       n(self.mlp),
            "heads":     n(self.dir_head) + n(self.ret_head),
            "total":     n(self),
        }

    def __repr__(self):
        total = sum(p.numel() for p in self.parameters())
        return (
            f"StockPredictorTFT("
            f"input_dim={self.input_dim}, d_model={self.d_model}, "
            f"params={total:,}, size={total * 4 / 1024 / 1024:.2f}MB)"
        )


class FocalLoss(nn.Module):
    """
    Focal Loss — focuses training on uncertain examples.
    gamma=2: a 80%-confident sample gets 25x less weight than a 50% sample.
    Better than cross-entropy for stock prediction where signal is weak.
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


# Backwards compatibility
StockTransformer = StockPredictorTFT