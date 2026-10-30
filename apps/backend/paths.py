"""
Single source of truth for filesystem layout, so no other module has to
recompute how many parent directories separate it from repo-level folders.

    <repo root>/
    ├── apps/
    │   ├── backend/    (this file lives at apps/backend/paths.py)
    │   └── frontend/
    └── data/           (raw GTFS + shapefiles, gitignored, populated locally)
"""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent.parent

DATA_DIR = REPO_ROOT / "data"
GTFS_DIR = DATA_DIR / "gtfs"

# ── Which city the pipeline is building ──────────────────────────────────────
#
# Most of what this dashboard reads is NATIONAL: the MOT GTFS feed, the תלת״ן
# station survey and BUS_SPEED all cover the whole country. The only thing that
# made it a Tel Aviv dashboard was the municipal boundary everything gets clipped
# to — so switching city is mostly a matter of switching that one polygon, plus
# whatever municipal layers the city itself publishes.
#
# Each city owns a directory holding exactly those municipal layers. National
# files stay where they are and are shared by every city.
#
#     ODFLOW_CITY=rahat venv/bin/python scripts/build_dashboard_data.py
#
CITY_DIRS = {
    "tel-aviv": DATA_DIR / "municipal",
    "rahat": DATA_DIR / "rahat",
}

CITY_LABELS = {
    "tel-aviv": "תל אביב-יפו",
    "rahat": "רהט",
}

ACTIVE_CITY = os.environ.get("ODFLOW_CITY", "tel-aviv").strip().lower()

if ACTIVE_CITY not in CITY_DIRS:
    raise SystemExit(
        f"[paths] unknown ODFLOW_CITY={ACTIVE_CITY!r}. "
        f"Known cities: {', '.join(sorted(CITY_DIRS))}"
    )

CITY_DIR = CITY_DIRS[ACTIVE_CITY]
CITY_LABEL = CITY_LABELS[ACTIVE_CITY]

FRONTEND_DIR = REPO_ROOT / "apps" / "frontend"
FRONTEND_PUBLIC_DATA_DIR = FRONTEND_DIR / "public" / "data"
