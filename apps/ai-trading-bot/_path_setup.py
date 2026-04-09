"""
_path_setup.py — Central import path fixer.

IMPORT EVERY FILE THAT USES FROM utils.xxx OR FROM strategies.xxx with this at top:
    import _path_setup  # noqa: F401  (first import, before everything else)

WHY THIS FILE EXISTS — A FULL EXPLANATION OF PYTHON IMPORTS:
═══════════════════════════════════════════════════════════════════════════════

Python finds modules by searching a list called sys.path.
When you run a script, Python automatically adds only the script's OWN FOLDER
to sys.path — nothing else.

Example problem:
    Your project root is:   apps/ai-trading-service/
    utils/ folder lives at: apps/ai-trading-service/utils/

    If you run from INSIDE a subfolder:
        cd apps/ai-trading-service/utils
        python something.py

    Python's sys.path contains only:  apps/ai-trading-service/utils/
    So `from utils.trading_v2 import ...` FAILS — Python looks for a
    utils/ folder INSIDE utils/, which doesn't exist.

    If you run from the PROJECT ROOT:
        cd apps/ai-trading-service
        python backtest_v2.py

    Python's sys.path contains:  apps/ai-trading-service/
    So `from utils.trading_v2 import ...` WORKS — Python finds utils/
    inside apps/ai-trading-service/.

THE REAL ERROR YOU'RE SEEING:
    __all__ = ["trading_v2"] in __init__.py does NOT fix imports.
    __all__ only controls `from utils import *` — it has nothing to do
    with whether `from utils.trading_v2 import X` works.
    The __init__.py must actually IMPORT from .trading_v2.

THIS FILE'S JOB:
    Adds the project root to sys.path no matter where you run the script from.
    Once this runs, ALL imports in the project work correctly from anywhere.

HOW TO USE:
    In every .py file, add as the very first import:
        import _path_setup  # noqa: F401

    The `# noqa: F401` silences linters that complain about "unused import".
    The import IS used — it runs the code below as a side effect.

PYRIGHT / VS CODE RED SQUIGGLES:
    These are a SEPARATE problem from runtime ImportError.
    Even when code runs fine, VS Code's type checker may show red squiggles
    because it doesn't know about sys.path modifications at analysis time.
    Fix: add pyrightconfig.json to project root (already added — see that file).
    The pyrightconfig.json tells VS Code "treat this folder as the import root".
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys

# This file lives at: apps/ai-trading-service/_path_setup.py
# So __file__ resolves to that path, and dirname gives apps/ai-trading-service/
_PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)