# data_fetch.py

import pandas as pd
from kiteconnect import KiteConnect
from datetime import datetime, timedelta
from config import settings

import logging

logging.basicConfig(level=logging.DEBUG)

# -----------------------------------
# Initialize Kite Client
# -----------------------------------

def get_kite_client():
    
    api_key = settings.KITE_API_KEY
    request_token = settings.REQUEST_TOKEN
    api_secret=settings.KITE_API_SECRET

    if not api_key or not request_token:
        raise Exception("Missing Zerodha credentials in .env")

    kite = KiteConnect(api_key=api_key)

    # Redirect the user to the login url obtained
    # from kite.login_url(), and receive the request_token
    # from the registered redirect url after the login flow.
    # Once you have the request_token, obtain the access_token
    # as follows.

    data = kite.generate_session(request_token, api_secret=api_secret)
    kite.set_access_token(data["access_token"])

    return kite


# -----------------------------------
# Fetch Historical Data
# -----------------------------------

def fetch_historical_data(
    instrument_token: int,
    interval: str = "day",
    days: int = 200
) -> pd.DataFrame:
    """
    Fetch historical OHLCV data from Zerodha.

    Args:
        instrument_token: Zerodha instrument token
        interval: candle interval (minute, 5minute, day, etc.)
        days: number of past days to fetch

    Returns:
        DataFrame with OHLCV data
    """

    kite = get_kite_client()

    to_date = datetime.now()
    from_date = to_date - timedelta(days=days)

    try:
        data = kite.historical_data(
            instrument_token=instrument_token,
            from_date=from_date,
            to_date=to_date,
            interval=interval
        )

    except Exception as e:
        raise Exception(f"Error fetching data: {str(e)}")

    if not data:
        raise Exception("No data returned from Zerodha")

    df = pd.DataFrame(data)

    # -----------------------------------
    # Standardize Columns
    # -----------------------------------

    df = df.rename(columns={
        "date": "datetime",
        "open": "open",
        "high": "high",
        "low": "low",
        "close": "close",
        "volume": "volume"
    })

    # Ensure correct ordering
    df = df.sort_values("datetime")

    # Reset index
    df.reset_index(drop=True, inplace=True)

    return df


def fetch_instruments():
    """
    Fetch Instruments from Zerodha.

    Args:
        instrument_token: Zerodha instrument token
        interval: candle interval (minute, 5minute, day, etc.)
        days: number of past days to fetch

    Returns:
        DataFrame with OHLCV data
    """

    kite = get_kite_client()

   

    try:
        data = kite.instruments(exchange="BSE")
        print(data)

    except Exception as e:
        raise Exception(f"Error fetching data: {str(e)}")

    if not data:
        raise Exception("No data returned from Zerodha")
    df = pd.DataFrame(data)
    print(df.filter(regex="/adani/i", axis=0))
    return df


# -----------------------------------
# Example usage (for testing)
# -----------------------------------

if __name__ == "__main__":
    # Example: RELIANCE (replace with real token)
    instrument_token = "128000516"
    # df = fetch_instruments()

    df = fetch_historical_data(
        instrument_token=instrument_token,
        interval="day",
        days=20
    )

    print(df.head())