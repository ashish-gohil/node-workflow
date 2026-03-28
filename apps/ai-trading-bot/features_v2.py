import pandas as pd

def add_features_v2(df: pd.DataFrame):

    # Price returns (momentum)
    df["returns"] = df["close"].pct_change()

    # Volatility (risk)
    df["volatility"] = df["returns"].rolling(10).std()

    # Volume trend
    df["volume_ma"] = df["volume"].rolling(10).mean()

    # Moving averages (trend)
    df["ma_10"] = df["close"].rolling(10).mean()
    df["ma_20"] = df["close"].rolling(20).mean()

    # RSI (momentum indicator)
    delta = df["close"].diff()
    gain = delta.where(delta > 0, 0).rolling(14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
    rs = gain / loss
    df["rsi"] = 100 - (100 / (1 + rs))

    # Breakout detection
    df["resistance"] = df["high"].rolling(20).max()
    df["breakout"] = (df["close"] > df["resistance"]).astype(int)

    # Remove NaN rows
    df = df.dropna()

    return df