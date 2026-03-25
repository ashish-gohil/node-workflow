from .base import BaseStrategy

class BreakoutStrategy(BaseStrategy):

    def apply(self, df):

        df["resistance"] = df["high"].rolling(20).max()

        # breakout = 1 if price crosses resistance
        df["breakout"] = (df["close"] > df["resistance"]).astype(int)

        return df