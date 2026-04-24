"""
utils/__init__.py

Why this file exists:
    Python needs this file to treat the 'utils' folder as a package
    (a folder full of modules you can import from).

    Without __init__.py:
        from utils.trading_v2 import generate_signal_v2  ← ImportError

    With __init__.py:
        from utils.trading_v2 import generate_signal_v2  ← Works

    The dot in ".trading_v2" means "look inside THIS package folder".
    The __all__ list controls what gets exported when someone writes
    `from utils import *` (not commonly used, but good practice).
"""

from .trading_v6 import generate_signal_v2, CONFIDENCE_FLOOR

__all__ = ["generate_signal_v2", "CONFIDENCE_FLOOR"]