"""
Root pytest conftest.

Ensures the project root and the ``integrations/`` directory are on
``sys.path`` so that test files (and routers) can ``import`` from
``integrations`` or absolute project paths without per-test boilerplate.

Picked up automatically by pytest because it lives at the project root.
"""
from __future__ import annotations

import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent
_INTEGRATIONS = _PROJECT_ROOT / "integrations"

for _p in (str(_PROJECT_ROOT), str(_INTEGRATIONS)):
    if _p not in sys.path:
        sys.path.insert(0, _p)
