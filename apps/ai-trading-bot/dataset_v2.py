import torch
from sklearn.preprocessing import StandardScaler

class StockDatasetV2(torch.utils.data.Dataset):

    def __init__(self, df, window=60):

        # Normalize data (VERY IMPORTANT)
        scaler = StandardScaler()
        data = scaler.fit_transform(df.values)

        self.X = []
        self.y_dir = []
        self.y_ret = []

        for i in range(len(data) - window - 1):

            # Input sequence (past window days)
            x = data[i:i+window]

            # Current & next price
            curr_close = data[i+window-1][3]
            next_close = data[i+window][3]

            # Return calculation
            ret = (next_close - curr_close) / curr_close

            # Ignore small noise
            if abs(ret) < 0.003:
                continue

            # Direction label
            direction = 1 if ret > 0 else 0

            self.X.append(x)
            self.y_dir.append(direction)
            self.y_ret.append(ret)

        # Convert to tensors
        self.X = torch.tensor(self.X, dtype=torch.float32)
        self.y_dir = torch.tensor(self.y_dir)
        self.y_ret = torch.tensor(self.y_ret, dtype=torch.float32)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y_dir[idx], self.y_ret[idx]