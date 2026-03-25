from strategies.ma_strategy import MovingAverageStrategy
from strategies.rsi_strategy import RSIStrategy
from strategies.breakout_strategy import BreakoutStrategy

def apply_strategies(df):
    """
    Apply all strategies.
    You can add new ones easily here.
    """

    strategies = [
        MovingAverageStrategy(),
        RSIStrategy(),
        BreakoutStrategy()
    ]

    for strat in strategies:
        df = strat.apply(df)

    return df

def add_basic_features(df):

    # % return
    df["return"] = df["close"].pct_change()

    # volatility
    df["volatility"] = df["return"].rolling(10).std()

    # volume spike
    df["vol_avg"] = df["volume"].rolling(10).mean()
    df["volume_spike"] = (df["volume"] > 1.5 * df["vol_avg"]).astype(int)

    return df


def process_features(df):
    """
    Full pipeline:
    basic + strategies
    """

    df = add_basic_features(df)
    df = apply_strategies(df)

    df = df.dropna()

    return df