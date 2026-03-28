import torch
import torch.nn as nn
import math

# -----------------------------------
# Positional Encoding
# Adds "time awareness" to the model
# Without this, transformer doesn't know order of sequence
# -----------------------------------
class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=500):
        super().__init__()

        pe = torch.zeros(max_len, d_model)

        # Position indices (0,1,2,...)
        position = torch.arange(0, max_len).unsqueeze(1)

        # Scaling factor
        div_term = torch.exp(
            torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model)
        )

        # Apply sin/cos pattern
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)

        # Store without training
        self.register_buffer("pe", pe.unsqueeze(0))

    def forward(self, x):
        # Add positional info to input
        return x + self.pe[:, :x.size(1)]


# -----------------------------------
# Attention Pooling
# Instead of taking last timestep,
# model learns which timesteps are important
# -----------------------------------
class AttentionPooling(nn.Module):
    def __init__(self, dim):
        super().__init__()

        # Learnable query vector
        self.query = nn.Parameter(torch.randn(dim))

    def forward(self, x):
        # x shape: (batch, seq, dim)

        # Compute attention scores
        weights = torch.matmul(x, self.query)

        # Normalize scores
        weights = torch.softmax(weights, dim=1).unsqueeze(-1)

        # Weighted sum of sequence
        return (x * weights).sum(dim=1)


# -----------------------------------
# Advanced Transformer Model (V2)
# -----------------------------------
class StockTransformerV2(nn.Module):

    def __init__(self, input_dim):
        super().__init__()

        # Model dimension (higher = more power)
        self.d_model = 128

        # Step 1: Convert input features → embedding
        self.input_proj = nn.Linear(input_dim, self.d_model)

        # Step 2: Add positional encoding
        self.pos_encoder = PositionalEncoding(self.d_model)

        # Step 3: Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=self.d_model,
            nhead=8,                # multiple attention heads
            dim_feedforward=256,    # internal FF layer
            dropout=0.1,
            activation="gelu",      # better than relu
            batch_first=True
        )

        # Stack multiple transformer layers
        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=4
        )

        # Step 4: Attention pooling (instead of last timestep)
        self.pool = AttentionPooling(self.d_model)

        # Step 5: MLP (feature refinement)
        self.fc = nn.Sequential(
            nn.Linear(128, 128),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.GELU()
        )

        # Step 6: Outputs
        self.dir_head = nn.Linear(64, 2)  # classification
        self.ret_head = nn.Linear(64, 1)  # regression

    def forward(self, x):

        # Input shape: (batch, seq, features)

        # Convert to embedding
        x = self.input_proj(x)

        # Add time information
        x = self.pos_encoder(x)

        # Learn sequence relationships
        x = self.transformer(x)

        # Aggregate sequence into single vector
        x = self.pool(x)

        # Final feature processing
        x = self.fc(x)

        # Output predictions
        return self.dir_head(x), self.ret_head(x)