from .base import BaseStrategy

class RSIStrategy(BaseStrategy):

    def apply(self, df):

        delta = df["close"].diff()

        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()

        rs = gain / loss
        df["rsi"] = 100 - (100 / (1 + rs))

        # Strategy signal
        df["rsi_signal"] = 0
        df.loc[df["rsi"] < 30, "rsi_signal"] = 1
        df.loc[df["rsi"] > 70, "rsi_signal"] = -1

        return df