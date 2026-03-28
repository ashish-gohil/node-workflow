import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader

from model_v2 import StockTransformerV2
from dataset_v2 import StockDatasetV2
from features_v2 import add_features_v2
from data_fetch import fetch_historical_data

def train_v2():

    # Step 1: Fetch data
    df = fetch_historical_data(
        instrument_token=128000516,
        interval="day",
        days=300
    )

    # Step 2: Add features
    df = add_features_v2(df)

    # Step 3: Create dataset
    dataset = StockDatasetV2(df)

    # Step 4: DataLoader
    loader = DataLoader(dataset, batch_size=32, shuffle=True)

    # Step 5: Initialize model
    model = StockTransformerV2(input_dim=df.shape[1])

    # Step 6: Optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)

    # Training loop
    for epoch in range(20):

        total_loss = 0

        for X, y_dir, y_ret in loader:

            # Forward pass
            dir_pred, ret_pred = model(X)

            # Loss calculation
            dir_loss = F.cross_entropy(dir_pred, y_dir, label_smoothing=0.1)
            ret_loss = F.mse_loss(ret_pred.squeeze(), y_ret)

            loss = dir_loss + 0.5 * ret_loss

            # Backpropagation
            optimizer.zero_grad()
            loss.backward()

            # Prevent exploding gradients
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)

            optimizer.step()

            total_loss += loss.item()

        print(f"Epoch {epoch}: Loss = {total_loss}")

    # Save model
    torch.save(model.state_dict(), "model_v2.pth")


if __name__ == "__main__":
    train_v2()