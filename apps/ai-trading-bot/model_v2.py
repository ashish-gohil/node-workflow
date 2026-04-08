"""
model_v2.py — StockTransformerV2

Improvements over original:
- Configurable d_model, n_heads, n_layers (no more hardcoded constants)
- Added CLS token (learnable) as pooling alternative — more stable than attention pooling
- LayerNorm before and after transformer (Pre-LN architecture, better gradient flow)
- Separate learning rates supported via named param groups
- Added __repr__ for easy inspection
- Fixed: original had input_dim hardcoded to 12 in API but derived from data in train — now fully config-driven
"""

import math
import torch
import torch.nn as nn


class PositionalEncoding(nn.Module):
    """Sinusoidal positional encoding. Adds time-awareness to the sequence."""

    def __init__(self, d_model: int, max_len: int = 500, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)

        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len).unsqueeze(1).float()
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        self.register_buffer("pe", pe.unsqueeze(0))  # (1, max_len, d_model)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq, d_model)
        x = x + self.pe[:, : x.size(1)]
        return self.dropout(x)


class StockTransformerV2(nn.Module):
    """
    Transformer encoder for stock direction + return prediction.

    Architecture:
        Input → Linear Proj → Positional Encoding
             → Pre-LN Transformer Stack
             → CLS token extraction
             → MLP head
             → Direction logits + Return scalar
    """

    def __init__(
        self,
        input_dim: int,
        d_model: int = 128,
        n_heads: int = 8,
        n_layers: int = 4,
        d_ff: int = 256,
        dropout: float = 0.1,
        max_seq_len: int = 500,
    ):
        super().__init__()

        assert d_model % n_heads == 0, f"d_model ({d_model}) must be divisible by n_heads ({n_heads})"

        self.d_model = d_model
        self.input_dim = input_dim

        # Learnable CLS token — pooled into final representation
        self.cls_token = nn.Parameter(torch.randn(1, 1, d_model) * 0.02)

        # Input projection: raw features → latent space
        self.input_proj = nn.Sequential(
            nn.Linear(input_dim, d_model),
            nn.LayerNorm(d_model),
        )

        # Positional encoding
        self.pos_encoder = PositionalEncoding(d_model, max_len=max_seq_len + 1, dropout=dropout)

        # Pre-LN Transformer encoder (more stable training than Post-LN)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_ff,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,   # Pre-LN: normalise BEFORE attention (better gradient flow)
        )
        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=n_layers,
            norm=nn.LayerNorm(d_model),  # Final normalisation
        )

        # Shared MLP trunk
        self.mlp = nn.Sequential(
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
        )

        # Output heads
        self.dir_head = nn.Linear(d_model // 2, 2)   # Classification: UP / DOWN
        self.ret_head = nn.Linear(d_model // 2, 1)   # Regression:     expected return

        self._init_weights()

    def _init_weights(self):
        """Xavier init on linear layers, zeros on biases."""
        for module in self.modules():
            if isinstance(module, nn.Linear):
                nn.init.xavier_uniform_(module.weight)
                if module.bias is not None:
                    nn.init.zeros_(module.bias)

    def forward(self, x: torch.Tensor):
        """
        Args:
            x: (batch, seq_len, input_dim)

        Returns:
            dir_logits: (batch, 2)   — raw logits for direction
            ret_pred:   (batch, 1)   — expected return
        """
        batch = x.size(0)

        # Project features → d_model
        x = self.input_proj(x)                          # (B, T, d_model)

        # Prepend CLS token
        cls = self.cls_token.expand(batch, -1, -1)      # (B, 1, d_model)
        x = torch.cat([cls, x], dim=1)                  # (B, T+1, d_model)

        # Add positional encoding
        x = self.pos_encoder(x)                         # (B, T+1, d_model)

        # Transformer — learns inter-timestep relationships
        x = self.transformer(x)                         # (B, T+1, d_model)

        # Pool via CLS token (position 0)
        cls_out = x[:, 0]                               # (B, d_model)

        # Shared representation
        features = self.mlp(cls_out)                    # (B, d_model//2)

        # Outputs
        dir_logits = self.dir_head(features)            # (B, 2)
        ret_pred = self.ret_head(features)              # (B, 1)

        return dir_logits, ret_pred

    def __repr__(self):
        total = sum(p.numel() for p in self.parameters())
        trainable = sum(p.numel() for p in self.parameters() if p.requires_grad)
        return (
            f"StockTransformerV2("
            f"input_dim={self.input_dim}, d_model={self.d_model}, "
            f"params={total:,}, trainable={trainable:,})"
        )