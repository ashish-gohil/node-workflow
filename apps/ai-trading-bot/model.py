# model.py

import torch.nn as nn

class StockTransformer(nn.Module):

    def __init__(self, input_dim):
        super().__init__()

        self.input_proj = nn.Linear(input_dim, 64)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=64,
            nhead=4,
            batch_first=True
        )

        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=2
        )

        self.fc = nn.Sequential(
            nn.Linear(64, 64),
            nn.ReLU()
        )

        self.dir_head = nn.Linear(64, 2)
        self.ret_head = nn.Linear(64, 1)

    def forward(self, x):

        # Convert input → embedding
        x = self.input_proj(x)

        # Learn sequence patterns
        x = self.transformer(x)

        # Take last timestep
        x = x[:, -1, :]

        x = self.fc(x)

        return self.dir_head(x), self.ret_head(x)