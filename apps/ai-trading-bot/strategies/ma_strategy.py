from .base import BaseStrategy

class MovingAverageStrategy(BaseStrategy):

    def apply(self, df):
        # Create moving averages
        df["ma_10"] = df["close"].rolling(10).mean()
        df["ma_20"] = df["close"].rolling(20).mean()

        # Signal: 1 = bullish, 0 = bearish
        df["ma_signal"] = (df["ma_10"] > df["ma_20"]).astype(int)

        return df