import torch

class StockDataset(torch.utils.data.Dataset):

    def __init__(self, df, window=30):
        """
        window = how many past days model sees
        """

        self.X = []
        self.y_dir = []
        self.y_ret = []

        data = df.values

        for i in range(len(data) - window - 1):

            x = data[i:i+window]

            curr_close = data[i+window-1][3]
            next_close = data[i+window][3]

            ret = (next_close - curr_close) / curr_close

            # Ignore small noise (IMPORTANT)
            if abs(ret) < 0.003:
                continue

            direction = 1 if ret > 0 else 0

            self.X.append(x)
            self.y_dir.append(direction)
            self.y_ret.append(ret)

        self.X = torch.tensor(self.X, dtype=torch.float32)
        self.y_dir = torch.tensor(self.y_dir)
        self.y_ret = torch.tensor(self.y_ret, dtype=torch.float32)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y_dir[idx], self.y_ret[idx]