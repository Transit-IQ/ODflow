"""
Single source of truth for filesystem layout, so no other module has to
recompute how many parent directories separate it from repo-level folders.

    <repo root>/
    ├── apps/
    │   ├── backend/    (this file lives at apps/backend/paths.py)
    │   └── frontend/
    └── data/           (raw GTFS + shapefiles, gitignored, populated locally)
"""

from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent.parent

DATA_DIR = REPO_ROOT / "data"
GTFS_DIR = DATA_DIR / "gtfs"

FRONTEND_DIR = REPO_ROOT / "apps" / "frontend"
FRONTEND_PUBLIC_DATA_DIR = FRONTEND_DIR / "public" / "data"
