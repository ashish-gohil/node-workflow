"""
data_fetch_upstox.py — Fetch and cache historical OHLCV data from Upstox.

Improvements over original:
    1. Better file naming:
       OLD: data/raw/RELIANCE/1d.parquet   ← confusing, what does "1d" mean?
       NEW: data/raw/RELIANCE/RELIANCE_daily_2015-01-01_2025-01-09.parquet
            → symbol + timeframe + start + end date. Immediately readable.

    2. end_date parameter:
       You can now fetch a specific date range:
           python data_fetch_upstox.py --symbol RELIANCE --start 2018-01-01 --end 2022-12-31

    3. Metadata sidecar file (.json next to .parquet):
       Stores: symbol, unit, interval, start, end, rows, fetched_at
       Lets you check data without loading the full parquet.

    4. Incremental update:
       If cache exists and --end is not specified (fetch up to today),
       the script loads the cache, checks the last date, and only fetches
       NEW candles since then. Merges and saves. Fast daily updates.

    5. Better progress output with chunk progress bar.

USAGE:
    # Fetch all history from 2015 to today (daily)
    python data_fetch_upstox.py --symbol RELIANCE --start 2015-01-01

    # Fetch specific date range
    python data_fetch_upstox.py --symbol RELIANCE --start 2018-01-01 --end 2022-12-31

    # Fetch 15-minute candles (last 30 days only — Upstox API limit)
    python data_fetch_upstox.py --symbol RELIANCE --unit minutes --interval 15

    # Force re-fetch even if cache exists
    python data_fetch_upstox.py --symbol RELIANCE --start 2015-01-01 --force

    # Incremental update (only fetch new candles since last fetch)
    python data_fetch_upstox.py --symbol RELIANCE --update
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd

# ── Fix imports ────────────────────────────────────────────────────────────────
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from config import settings

ACCESS_TOKEN    = settings.UPSTOX_ACCESS_TOKEN
INSTRUMENT_FILE = "instruments_upstox.json"
DATA_ROOT       = "data"


# ─── Upstox Client ────────────────────────────────────────────────────────────

def get_upstox_client():
    import upstox_client
    cfg = upstox_client.Configuration()
    cfg.access_token = ACCESS_TOKEN
    return upstox_client.HistoryV3Api(upstox_client.ApiClient(cfg))


# ─── Instruments ──────────────────────────────────────────────────────────────

def download_instruments():
    import requests
    print("Downloading NSE instruments list (one-time, ~10MB)...")
    url = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json"
    res = requests.get(url, timeout=30)
    res.raise_for_status()
    with open(INSTRUMENT_FILE, "w") as f:
        json.dump(res.json(), f)
    print(f"  Saved → {INSTRUMENT_FILE}")


def load_instruments() -> pd.DataFrame:
    if not os.path.exists(INSTRUMENT_FILE):
        download_instruments()
    return pd.read_json(INSTRUMENT_FILE)


def find_instrument(symbol: str) -> str:
    """
    Return Upstox instrument_key for an NSE equity symbol.

    Search order:
    1. Exact match on 'trading_symbol' column (e.g. "RELIANCE")
    2. Exact match on 'name' column (company name)
    3. Contains match on 'trading_symbol' (partial ticker)
    4. Contains match on 'name' (partial company name)

    This covers cases where the user passes:
    - The NSE ticker:   "RELIANCE", "TCS", "HDFCBANK"
    - Company name:     "Reliance Industries", "HDFC Bank"
    - Partial name:     "HDFC" (matches HDFCBANK, HDFC, HDFCAMC, ...)
    """
    df = load_instruments()
    eq = df[df.get("instrument_type", pd.Series(dtype=str)) == "EQ"].copy()

    sym_upper = symbol.upper().strip()

    # Try 'trading_symbol' column first (most reliable for NSE tickers)
    for col in ["trading_symbol", "name"]:
        if col not in eq.columns:
            continue
        # 1. Exact match
        res = eq[eq[col].str.upper() == sym_upper]
        if not res.empty:
            key = res.iloc[0]["instrument_key"]
            matched_name = res.iloc[0].get("name", res.iloc[0].get("trading_symbol", symbol))
            print(f"  {symbol} → {matched_name} → {key}")
            return key

    # 2. Contains match on trading_symbol
    if "trading_symbol" in eq.columns:
        res = eq[eq["trading_symbol"].str.contains(sym_upper, case=False, regex=False, na=False)]
        if not res.empty:
            key = res.iloc[0]["instrument_key"]
            ts  = res.iloc[0].get("trading_symbol", symbol)
            print(f"  {symbol} (partial match: {ts}) → {key}")
            if len(res) > 1:
                print(f"  Note: {len(res)} matches found. Using first. "
                      f"Run --list-symbols {symbol} to see all.")
            return key

    # 3. Contains match on name
    if "name" in eq.columns:
        res = eq[eq["name"].str.contains(symbol, case=False, regex=False, na=False)]
        if not res.empty:
            key  = res.iloc[0]["instrument_key"]
            name = res.iloc[0]["name"]
            print(f"  {symbol} (name match: {name}) → {key}")
            return key

    raise ValueError(
        f"Symbol '{symbol}' not found in NSE equity instruments.\n"
        f"Search tips:\n"
        f"  • Use the NSE ticker: RELIANCE, TCS, HDFCBANK, INFY\n"
        f"  • Search partial name: python data_fetch_upstox.py --list-symbols HDFC\n"
        f"  • If instruments list is old, delete instruments_upstox.json and retry"
    )


def search_symbols(query: str, max_results: int = 20):
    """
    Search for NSE equity symbols by ticker or company name.

    Shows: trading_symbol, company name, instrument_key
    Use to find the right symbol before fetching data.

    Example:
        python data_fetch_upstox.py --list-symbols HDFC
        → shows HDFCBANK, HDFC, HDFCAMC, HDFCLIFE, ...
    """
    df  = load_instruments()
    eq  = df[df.get("instrument_type", pd.Series(dtype=str)) == "EQ"].copy()

    # Search in both trading_symbol and name columns
    mask = pd.Series([False] * len(eq), index=eq.index)
    for col in ["trading_symbol", "name"]:
        if col in eq.columns:
            mask = mask | eq[col].str.contains(query, case=False, regex=False, na=False)

    res = eq[mask].head(max_results)

    if res.empty:
        print(f"No symbols found matching '{query}'")
        return

    print(f"\nSymbols matching '{query}' (showing up to {max_results}):")
    print(f"  {'TICKER':<20} {'COMPANY NAME':<40} {'INSTRUMENT KEY'}")
    print(f"  {'-'*20} {'-'*40} {'-'*30}")
    for _, row in res.iterrows():
        ticker  = str(row.get("trading_symbol", "?"))
        name    = str(row.get("name", "?"))[:38]
        key     = str(row.get("instrument_key", "?"))
        print(f"  {ticker:<20} {name:<40} {key}")
    print()


# ─── File naming ──────────────────────────────────────────────────────────────

def _timeframe_label(unit: str, interval: str) -> str:
    """
    Human-readable timeframe label for filenames.
    Examples: interval=1,  unit=days    → daily
              interval=15, unit=minutes → 15min
              interval=1,  unit=weeks   → weekly
    """
    if unit == "days":
        return "daily" if interval == "1" else f"{interval}day"
    if unit == "minutes":
        return f"{interval}min"
    if unit == "weeks":
        return "weekly" if interval == "1" else f"{interval}week"
    return f"{interval}{unit[0]}"


def build_cache_path(symbol: str, unit: str, interval: str,
                     start: datetime, end: datetime) -> str:
    """
    Build a descriptive file path.

    OLD: data/raw/RELIANCE/1d.parquet
    NEW: data/RELIANCE/RELIANCE_daily_2015-01-01_2025-01-09.parquet

    The filename tells you:
        Symbol:     RELIANCE
        Timeframe:  daily / 15min / weekly
        Date range: 2015-01-01 to 2025-01-09
    """
    tf    = _timeframe_label(unit, interval)
    s_str = start.strftime("%Y-%m-%d")
    e_str = end.strftime("%Y-%m-%d")
    folder = os.path.join(DATA_ROOT, symbol.upper())
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, f"{symbol.upper()}_{tf}_{s_str}_{e_str}.parquet")


def _meta_path(parquet_path: str) -> str:
    return parquet_path.replace(".parquet", "_meta.json")


def _save_meta(parquet_path: str, symbol: str, unit: str, interval: str,
               start: datetime, end: datetime, n_rows: int):
    meta = {
        "symbol":     symbol,
        "unit":       unit,
        "interval":   interval,
        "start_date": start.strftime("%Y-%m-%d"),
        "end_date":   end.strftime("%Y-%m-%d"),
        "rows":       n_rows,
        "timeframe":  _timeframe_label(unit, interval),
        "fetched_at": datetime.now().isoformat(timespec="seconds"),
        "parquet":    parquet_path,
    }
    with open(_meta_path(parquet_path), "w") as f:
        json.dump(meta, f, indent=2)


def find_existing_cache(symbol: str, unit: str, interval: str) -> str | None:
    """Find any existing parquet file for this symbol+timeframe (any date range)."""
    folder = os.path.join(DATA_ROOT, symbol.upper())
    if not os.path.exists(folder):
        return None
    tf = _timeframe_label(unit, interval)
    prefix = f"{symbol.upper()}_{tf}_"
    matches = [
        os.path.join(folder, f)
        for f in os.listdir(folder)
        if f.startswith(prefix) and f.endswith(".parquet")
    ]
    return max(matches, default=None)  # Return most recently modified


# ─── Date helpers ─────────────────────────────────────────────────────────────

def get_last_trading_day() -> datetime:
    """Return the most recent weekday (last completed trading day)."""
    end = datetime.now() - timedelta(days=1)
    while end.weekday() >= 5:
        end -= timedelta(days=1)
    return end


def generate_chunks(start: datetime, end: datetime, chunk_days: int = 365):
    chunks, cur = [], start
    while cur <= end:
        chunk_end = min(cur + timedelta(days=chunk_days), end)
        chunks.append((cur, chunk_end))
        cur = chunk_end + timedelta(days=1)
    return chunks


# ─── Fetch with retry ─────────────────────────────────────────────────────────

def fetch_chunk(client, instrument_key, unit, interval, start, end, retries=3):
    from upstox_client.rest import ApiException
    for attempt in range(retries):
        try:
            print(instrument_key, unit, interval,
                start.strftime("%Y-%m-%d"),
                end.strftime("%Y-%m-%d"))
            resp = client.get_historical_candle_data1(
                instrument_key, unit, interval,
                start.strftime("%Y-%m-%d"),
                end.strftime("%Y-%m-%d"),
            )
            return resp.data.candles or []
        except ApiException as e:
            wait = 2 ** attempt
            print(f"  Retry {attempt+1}/{retries} (wait {wait}s): {e.status}")
            time.sleep(wait)
    return []


# ─── Main fetch ───────────────────────────────────────────────────────────────

def fetch_historical_data(
    symbol:        str,
    unit:          str      = "days",
    interval:      str      = "1",
    start_date:    str      = "2010-01-01",
    end_date:      str      = None,     # None = fetch up to latest trading day
    max_workers:   int      = 5,
    use_cache:     bool     = True,
    force_refresh: bool     = False,
    incremental:   bool     = False,    # Only fetch new candles since last cache
) -> pd.DataFrame:
    """
    Fetch historical OHLCV data from Upstox with smart caching.

    Args:
        symbol:        NSE equity symbol (e.g. "RELIANCE", "TCS")
        unit:          "days", "minutes", "weeks"
        interval:      "1", "15", "30" etc (number of units per candle)
        start_date:    Fetch from this date (YYYY-MM-DD)
        end_date:      Fetch up to this date (YYYY-MM-DD). None = today.
        max_workers:   Parallel download threads
        use_cache:     Load from parquet cache if available
        force_refresh: Ignore cache, always re-fetch
        incremental:   Only fetch candles newer than the last cached date

    Returns:
        DataFrame with columns: datetime, open, high, low, close, volume, oi
    """
    if not ACCESS_TOKEN:
        raise EnvironmentError(
            "UPSTOX_ACCESS_TOKEN not set.\n"
            "1. Create .env file\n"
            "2. Add: UPSTOX_ACCESS_TOKEN=your_token\n"
            "3. Get token from https://upstox.com/developer/"
        )

    start = datetime.strptime(start_date, "%Y-%m-%d")
    end   = get_last_trading_day() if end_date is None else datetime.strptime(end_date, "%Y-%m-%d")

    # Minutes data: Upstox limits to last 30 days
    if unit == "minutes":
        capped_start = end - timedelta(days=30)
        if start < capped_start:
            print(f"  Note: Upstox limits {interval}-minute data to last 30 days.")
            start = capped_start

    if start > end:
        raise ValueError(f"start_date ({start.date()}) is after end_date ({end.date()})")

    # ── Try to load from cache ─────────────────────────────────────────────────
    existing_cache = find_existing_cache(symbol, unit, interval)

    if use_cache and existing_cache and not force_refresh:
        print(f"Loading from cache: {existing_cache}")
        cached_df = pd.read_parquet(existing_cache)

        if not incremental:
            return cached_df

        # Incremental: only fetch rows newer than last cached date
        last_cached = cached_df["datetime"].max()
        new_start   = last_cached + timedelta(days=1)

        if new_start > end:
            print(f"  Cache is up to date (last: {last_cached.date()})")
            return cached_df

        print(f"  Incremental update: fetching {new_start.date()} → {end.date()}")
        new_df  = _do_fetch(symbol, unit, interval, new_start, end, max_workers)
        combined = pd.concat([cached_df, new_df], ignore_index=True)
        combined = (
            combined.drop_duplicates(subset=["datetime"])
                    .sort_values("datetime")
                    .reset_index(drop=True)
        )
        # Save with updated end date in filename
        new_cache_path = build_cache_path(symbol, unit, interval, start, end)
        combined.to_parquet(new_cache_path)
        _save_meta(new_cache_path, symbol, unit, interval, start, end, len(combined))

        # Remove old cache file if filename changed
        if existing_cache != new_cache_path and os.path.exists(existing_cache):
            os.remove(existing_cache)
            meta_old = _meta_path(existing_cache)
            if os.path.exists(meta_old):
                os.remove(meta_old)

        print(f"  Updated cache: {new_cache_path}  ({len(combined):,} rows)")
        return combined

    # ── Fresh fetch ────────────────────────────────────────────────────────────
    df = _do_fetch(symbol, unit, interval, start, end, max_workers)

    if use_cache:
        cache_path = build_cache_path(symbol, unit, interval, start, end)
        df.to_parquet(cache_path)
        _save_meta(cache_path, symbol, unit, interval, start, end, len(df))
        print(f"  Cached → {cache_path}")
        print(f"  Metadata → {_meta_path(cache_path)}")

    return df


def _do_fetch(symbol, unit, interval, start, end, max_workers):
    """Internal: actually call Upstox API in parallel chunks."""
    print(f"Fetching {symbol} ({_timeframe_label(unit, interval)}) from Upstox...")
    client         = get_upstox_client()
    instrument_key = find_instrument(symbol)

    chunk_days = 5 if unit == "minutes" else 365
    chunks     = generate_chunks(start, end, chunk_days)
    print(f"  Date range: {start.date()} → {end.date()}")
    print(f"  Chunks: {len(chunks)}  |  Workers: {max_workers}")

    all_candles  = []
    done         = 0

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(fetch_chunk, client, instrument_key, unit, interval, e, s): (s, e)
            for s, e in chunks
        }
        for future in as_completed(futures):
            done += 1
            try:
                candles = future.result()
                if candles:
                    all_candles.extend(candles)
                # Progress bar
                pct  = done / len(chunks) * 100
                bar  = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
                print(f"\r  [{bar}] {pct:.0f}%  ({done}/{len(chunks)} chunks)  {len(all_candles):,} candles",
                      end="", flush=True)
            except Exception as e:
                print(f"\n  Chunk failed: {e}")

    print()  # newline after progress bar

    if not all_candles:
        raise RuntimeError("No data fetched from Upstox. Check token and symbol.")

    df = pd.DataFrame(
        all_candles,
        columns=["datetime", "open", "high", "low", "close", "volume", "oi"],
    )
    df["datetime"] = pd.to_datetime(df["datetime"])
    df = (
        df.drop_duplicates(subset=["datetime"])
          .sort_values("datetime")
          .reset_index(drop=True)
    )
    print(f"  Done. {len(df):,} candles fetched.")
    return df


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Fetch NSE historical data from Upstox",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument("--symbol",   required=False, help="NSE symbol e.g. RELIANCE")
    parser.add_argument("--unit",     default="days",  help="days / minutes / weeks")
    parser.add_argument("--interval", default="1",     help="Candle size: 1, 15, 30 ...")
    parser.add_argument("--start",    default="2015-01-01", help="Start date YYYY-MM-DD")
    parser.add_argument("--end",      default=None,    help="End date YYYY-MM-DD (default: today)")
    parser.add_argument("--workers",  type=int, default=5, help="Parallel download threads")
    parser.add_argument("--force",    action="store_true", help="Re-fetch even if cache exists")
    parser.add_argument("--update",   action="store_true", help="Incremental update only")
    parser.add_argument("--list-symbols", metavar="QUERY", help="Search available symbols")
    args = parser.parse_args()

    if args.list_symbols:
        search_symbols(args.list_symbols)
        return

    if not args.symbol:
        parser.error("--symbol is required unless using --list-symbols")

    df = fetch_historical_data(
        symbol=args.symbol,
        unit=args.unit,
        interval=args.interval,
        start_date=args.start,
        end_date=args.end,
        max_workers=args.workers,
        force_refresh=args.force,
        incremental=args.update,
    )

    print(f"\nFirst 3 rows:")
    print(df.head(3).to_string(index=False))
    print(f"\nLast 3 rows:")
    print(df.tail(3).to_string(index=False))
    print(f"\nTotal: {len(df):,} rows  |  From {df['datetime'].min().date()} to {df['datetime'].max().date()}")


if __name__ == "__main__":
    main()