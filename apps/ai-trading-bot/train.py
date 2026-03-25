# train.py

import torch
from torch.utils.data import DataLoader
from dataset import StockDataset
from model import StockTransformer
from features import process_features
from data_fetch import fetch_data

# 1. Load data
df = fetch_data(API_KEY, ACCESS_TOKEN, TOKEN)

# 2. Feature processing
df = process_features(df)

# 3. Dataset
dataset = StockDataset(df)
loader = DataLoader(dataset, batch_size=32, shuffle=True)

# 4. Model
model = StockTransformer(input_dim=df.shape[1])

optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

ce_loss = torch.nn.CrossEntropyLoss()
mse_loss = torch.nn.MSELoss()

# 5. Training loop
for epoch in range(10):
    for x, y_dir, y_ret in loader:

        pred_dir, pred_ret = model(x)

        loss1 = ce_loss(pred_dir, y_dir)
        loss2 = mse_loss(pred_ret.squeeze(), y_ret)

        loss = loss1 + 0.5 * loss2

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    print("Epoch done:", epoch)

# Save model
torch.save(model.state_dict(), "model.pt")