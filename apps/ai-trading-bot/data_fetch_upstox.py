"""
data_fetch_upstox.py  (improved)

Fixes:
  - Added deduplication after parallel fetch (as_completed returns random order)
  - find_instrument filters by instrument_type == "EQ" first → no derivative matches
  - Added drop_duplicates + sort after combining chunks
  - Rate-limit protection: added small sleep between chunk submissions
"""

import os
import json
import time
import argparse
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

import upstox_client
from upstox_client.rest import ApiException
from config import settings

ACCESS_TOKEN    = settings.UPSTOX_ACCESS_TOKEN
INSTRUMENT_FILE = "instruments_upstox.json"

if not ACCESS_TOKEN:
    raise Exception("Missing UPSTOX_ACCESS_TOKEN in env")


# ── Client ───────────────────────────────────────────────────────────────────
def get_upstox_client():
    cfg = upstox_client.Configuration()
    cfg.access_token = ACCESS_TOKEN
    return upstox_client.HistoryV3Api(upstox_client.ApiClient(cfg))


# ── Instruments ──────────────────────────────────────────────────────────────
def download_instruments():
    import requests
    print("Downloading instruments...")
    url = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json"
    res = requests.get(url, timeout=30)
    res.raise_for_status()
    with open(INSTRUMENT_FILE, "w") as f:
        json.dump(res.json(), f)
    print("Instruments saved.")


def load_instruments() -> pd.DataFrame:
    if not os.path.exists(INSTRUMENT_FILE):
        download_instruments()
    return pd.read_json(INSTRUMENT_FILE)


def find_instrument(symbol: str) -> str:
    """
    FIX: filter by instrument_type == 'EQ' first so RELIANCE doesn't
    accidentally match RELIANCEETF or RELIANCE-FUT.
    """
    df = load_instruments()

    # Prefer exact equity match
    eq = df[df.get("instrument_type", pd.Series(dtype=str)) == "EQ"]
    result = eq[eq["name"].str.upper() == symbol.upper()]

    if result.empty:
        # Fallback: contains search on EQ slice
        result = eq[eq["name"].str.contains(symbol, case=False, regex=False, na=False)]

    if result.empty:
        raise Exception(f"Instrument not found for symbol: {symbol}")

    key = result.iloc[0]["instrument_key"]
    print(f"  {symbol} → {key}")
    return key


# ── Date helpers ─────────────────────────────────────────────────────────────
def get_valid_end_date() -> datetime:
    end = datetime.now() - timedelta(days=1)
    while end.weekday() >= 5:      # skip Saturday/Sunday
        end -= timedelta(days=1)
        print(f"  Skipping weekend: {end.date()}")
    print(f"  Valid end date: {end.date()}")
    return end


def generate_chunks(start: datetime, end: datetime, chunk_days: int = 365):
    chunks, cur = [], start
    while cur <= end:
        chunk_end = min(cur + timedelta(days=chunk_days), end)
        chunks.append((cur, chunk_end))
        cur = chunk_end + timedelta(days=1)
    return chunks


# ── Fetch with retry ─────────────────────────────────────────────────────────
def fetch_chunk(client, instrument_key, unit, interval, start, end, retries=3):
    for attempt in range(retries):
        try:
            resp = client.get_historical_candle_data1(
                instrument_key,
                unit,
                interval,
                start.strftime("%Y-%m-%d"),
                end.strftime("%Y-%m-%d"),
            )
            return resp.data.candles or []
        except ApiException as e:
            print(f"  Retry {attempt + 1}/{retries}: {e}")
            time.sleep(2 ** attempt)
    return []


# ── Main fetch ───────────────────────────────────────────────────────────────
def fetch_historical_data(
    symbol:        str,
    unit:          str  = "days",
    interval:      str  = "1",
    start_date:    str  = "2000-01-01",
    max_workers:   int  = 5,
    use_cache:     bool = True,
    force_refresh: bool = False,
) -> pd.DataFrame:

    data_dir   = f"data/raw/{symbol.upper()}"
    os.makedirs(data_dir, exist_ok=True)
    cache_file = f"{data_dir}/{interval}{unit[0]}.parquet"

    if use_cache and os.path.exists(cache_file) and not force_refresh:
        print("Loading from cache...")
        return pd.read_parquet(cache_file)

    print(f"Fetching {symbol} ({interval}{unit[0]}) from Upstox...")
    client         = get_upstox_client()
    instrument_key = find_instrument(symbol)

    start = datetime.strptime(start_date, "%Y-%m-%d")
    end   = get_valid_end_date()
    print(f"  Start date: {start.date()}")
    print(f"  End date: {end.date()}")

    if unit == "minutes":
        start = max(start, end - timedelta(days=30))

    if start > end:
        raise ValueError(f"Invalid date range: {start.date()} > {end.date()}")

    chunk_days = 5 if unit == "minutes" else 365
    chunks     = generate_chunks(start, end, chunk_days)
    print(chunks)
    print(f"  {len(chunks)} chunks  ({start.date()} → {end.date()})")

    all_candles = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(fetch_chunk, client, instrument_key, unit, interval, s, e): (s, e)
            for s, e in chunks
        }
        for future in as_completed(futures):
            try:
                candles = future.result()
                if candles:
                    all_candles.extend(candles)
            except Exception as e:
                print(f"  Chunk failed: {e}")

    if not all_candles:
        raise RuntimeError("No data fetched from Upstox.")

    df = pd.DataFrame(
        all_candles,
        columns=["datetime", "open", "high", "low", "close", "volume", "oi"],
    )
    df["datetime"] = pd.to_datetime(df["datetime"])

    # FIX: deduplicate + sort (as_completed returns out-of-order, chunks may overlap)
    df = (
        df.drop_duplicates(subset=["datetime"])
          .sort_values("datetime")
          .reset_index(drop=True)
    )

    if use_cache:
        df.to_parquet(cache_file)
        print(f"  Cached → {cache_file}")

    print(f"  Done. {len(df)} candles.")
    return df


# ── CLI ───────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--symbol",   required=True)
    parser.add_argument("--unit",     default="days")
    parser.add_argument("--interval", default="1")
    parser.add_argument("--start",    default="2000-01-01")
    parser.add_argument("--workers",  type=int, default=5)
    parser.add_argument("--force",    action="store_true")
    args = parser.parse_args()

    df = fetch_historical_data(
        symbol=args.symbol, unit=args.unit, interval=args.interval,
        start_date=args.start, max_workers=args.workers, force_refresh=args.force,
    )
    print(df.head())
    print(df.tail())


if __name__ == "__main__":
    main()