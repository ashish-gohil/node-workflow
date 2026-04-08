"""
strategies/base.py — Abstract base class for all strategy modules.

Every strategy follows this interface so they can be applied
in a consistent pipeline: df → strategy.apply(df) → df with new columns.
"""

import pandas as pd
from abc import ABC, abstractmethod


class BaseStrategy(ABC):
    """
    Base class all strategies must inherit from.

    Convention:
        - apply() receives a DataFrame with at minimum: open, high, low, close, volume
        - apply() MUST return the same DataFrame with new signal columns added
        - Column names must be unique per strategy to avoid collisions
        - apply() should NEVER drop rows — that is the caller's job
    """

    @abstractmethod
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Add strategy-specific signal columns to the DataFrame.

        Args:
            df: OHLCV DataFrame

        Returns:
            DataFrame with new columns added (no rows removed)
        """
        ...

    def __repr__(self):
        return f"{self.__class__.__name__}()"