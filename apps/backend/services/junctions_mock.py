"""
Signalized-junction turning volumes — **synthetic counts on real geometry**.

Israel's municipal export set carries no turning-movement counts. Rather than draw
an empty layer, this module manufactures them — and it is important to be exact
about which half is manufactured:

*Real*: where each junction is, which streets meet there, how many legs it has and
what bearing each leg arrives on. All of that is derived from ``roads.geojson``,
the OSM network ``scripts/build_roads.py`` already clips to the city.

*Invented*: every vehicle count. Nothing observed backs them.

``data/README.md`` records three dashboard sections that were **deleted** rather
than shown with fabricated figures, so this module does not quietly blend in. The
payload carries ``"mock": true`` and a Hebrew source string, and the frontend is
expected to badge the layer, the legend and the panel with נתוני דמו. A reader who
never opens this file should still never mistake these counts for measurements.

Counts are drawn from a ``random.Random`` seeded per junction, so a rerun produces
byte-identical output. A pipeline whose numbers changed on every invocation would
make every regenerated diff unreadable.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from shapely.geometry import LineString, Point
from shapely.strtree import STRtree

# Grade-separated roads carry no signalized turning movements — an interchange is
# not a junction in this sense — so motorways are out. What is left is the class of
# road where a traffic light is the norm.
SIGNAL_CLASSES = {
    "trunk", "trunk_link",
    "primary", "primary_link",
    "secondary", "secondary_link",
    "tertiary", "tertiary_link",
}

# Rank used both to pick which junctions survive the cull and to scale their
# volumes: a primary/primary crossing carries more than a tertiary/tertiary one.
CLASS_RANK = {"trunk": 4, "primary": 3, "secondary": 2, "tertiary": 1}

# Two crossings closer together than this are the same junction. The figure is set
# by dual carriageways: a divided road crossing another produces four separate
# intersection points, spread over roughly the width of the median plus the
# kerb-to-kerb distance. 30 m merges those without swallowing genuinely adjacent
# junctions, which in this city are a block (~80 m+) apart.
CLUSTER_M = 30.0

# How far along a leg to look when measuring its bearing. Close to the junction the
# geometry is dominated by the flare into the intersection; 25 m is past that and
# still short enough to sit before the next curve.
APPROACH_M = 25.0

MAX_JUNCTIONS = 100
MIN_LEGS = 3
MAX_LEGS = 4

SOURCE_LABEL = "נתוני דמו — נפחי פנייה סינתטיים על צמתים אמיתיים (OSM)"

# Diurnal shape over the survey's seven bands, as a share of the day. Deliberately
# not flat: a turning-count layer whose morning looked like its midnight would be
# useless for the thing it exists to show. Peaks sit in 06-09 and 15-19, matching
# where the speed network already slows down. Renormalised per junction after
# jitter, so these are proportions rather than a total that has to sum to 1 here.
DIURNAL = [0.03, 0.22, 0.13, 0.13, 0.28, 0.17, 0.04]

COMPASS = [
    (22.5, "צפון"), (67.5, "צפון-מזרח"), (112.5, "מזרח"), (157.5, "דרום-מזרח"),
    (202.5, "דרום"), (247.5, "דרום-מערב"), (292.5, "מערב"), (337.5, "צפון-מערב"),
]

# Degrees of latitude/longitude per metre at Tel Aviv's latitude. The whole layer
# spans one city, so a local flat-earth approximation is accurate to well under a
# metre here and avoids pulling in a projection for distances used only to cluster
# and to step along a line.
_LAT_M = 1.0 / 110_574.0
_LON_M = 1.0 / (111_320.0 * math.cos(math.radians(32.08)))


def _base_class(fclass: str) -> str:
    """``'primary_link'`` -> ``'primary'``. Links inherit their parent's rank."""
    return (fclass or "").replace("_link", "")


def _metres(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Planar distance in metres between two (lon, lat) pairs."""
    dx = (a[0] - b[0]) / _LON_M
    dy = (a[1] - b[1]) / _LAT_M
    return math.hypot(dx, dy)


def bearing(origin: tuple[float, float], other: tuple[float, float]) -> float:
    """
    Compass bearing in degrees from ``origin`` to ``other`` — 0 = north, 90 = east.

    This is the direction the leg *leaves* the junction in. The approach it
    describes is traffic arriving from that side, which is why the compass label
    derived from it names where the traffic comes from.
    """
    dx = (other[0] - origin[0]) / _LON_M
    dy = (other[1] - origin[1]) / _LAT_M
    return math.degrees(math.atan2(dx, dy)) % 360.0


def compass_label(deg: float) -> str:
    """Bearing to one of eight Hebrew compass points."""
    for limit, name in COMPASS:
        if deg < limit:
            return name
    return "צפון"


def point_along(
    line: LineString, at: Point, metres: float, forward: bool = True
) -> tuple[float, float] | None:
    """
    A point ``metres`` along ``line`` from ``at``, in the requested direction.

    Returns ``None`` when the line does not extend that far *on that side* —
    either a stub too short to support a bearing measurement, or, more importantly,
    a road that simply ends here.

    The direction is a parameter and not a preference. An earlier version fell back
    to the opposite end when one side had no room, and the caller then flipped the
    result 180° to name the arm it thought it had measured. At a T-junction, where
    the branching road *ends* at the junction, that invented a fourth arm pointing
    into the road that is not there — a T was reported as a crossroads.
    """
    d = line.project(at)
    # project/interpolate work in degrees here, so the step is converted through
    # the same local approximation the distances use.
    step = metres * _LAT_M

    if forward:
        if line.length - d < step:
            return None
        p = line.interpolate(d + step)
    else:
        if d < step:
            return None
        p = line.interpolate(d - step)
    return (p.x, p.y)


def _load_roads(roads_path: Path) -> list[dict]:
    """Named, signal-class road features from ``roads.geojson``."""
    with open(roads_path, encoding="utf-8") as f:
        fc = json.load(f)

    roads = []
    for feat in fc.get("features", []):
        props = feat.get("properties") or {}
        fclass = props.get("fclass") or ""
        name = (props.get("name") or "").strip()
        geom = feat.get("geometry") or {}
        if fclass not in SIGNAL_CLASSES or not name:
            continue
        if geom.get("type") != "LineString" or len(geom.get("coordinates") or []) < 2:
            continue
        roads.append({
            "name": name,
            "rank": CLASS_RANK.get(_base_class(fclass), 1),
            "line": LineString(geom["coordinates"]),
        })
    return roads


def _crossings(roads: list[dict]) -> list[dict]:
    """
    Every point where two *differently named* roads cross.

    Same-name pairs are skipped because OSM splits one street into many features at
    every attribute change; their shared endpoints are not junctions, they are the
    seams of a single road.
    """
    tree = STRtree([r["line"] for r in roads])
    found = []
    for i, road in enumerate(roads):
        for j in tree.query(road["line"]):
            j = int(j)
            if j <= i:
                continue              # each unordered pair once
            other = roads[j]
            if other["name"] == road["name"]:
                continue
            inter = road["line"].intersection(other["line"])
            if inter.is_empty:
                continue
            geoms = getattr(inter, "geoms", [inter])
            for g in geoms:
                if g.geom_type != "Point":
                    continue          # overlapping collinear stretches are not crossings
                found.append({
                    "pt": (g.x, g.y),
                    "roads": (road, other),
                    "rank": road["rank"] + other["rank"],
                })
    return found


def _cluster(crossings: list[dict]) -> list[dict]:
    """
    Merge crossing points within ``CLUSTER_M`` into one junction.

    Grid-bucketed rather than all-pairs: the candidate set is a few thousand points
    and a quadratic sweep over them is the slowest thing in this module by an order
    of magnitude.
    """
    cell = CLUSTER_M * _LAT_M * 2
    buckets: dict[tuple[int, int], list[int]] = {}
    clusters: list[dict] = []

    for c in crossings:
        lon, lat = c["pt"]
        key = (int(lon / cell), int(lat / cell))
        hit = None
        # The 3x3 neighbourhood, since a point near a cell edge has neighbours in
        # the adjacent cell.
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for idx in buckets.get((key[0] + dx, key[1] + dy), []):
                    if _metres(c["pt"], clusters[idx]["pt"]) <= CLUSTER_M:
                        hit = idx
                        break
                if hit is not None:
                    break
            if hit is not None:
                break

        if hit is None:
            clusters.append({"pt": c["pt"], "members": [c], "rank": c["rank"]})
            buckets.setdefault(key, []).append(len(clusters) - 1)
        else:
            clusters[hit]["members"].append(c)
            clusters[hit]["rank"] = max(clusters[hit]["rank"], c["rank"])

    return clusters


# Two arms closer than this are one arm reported twice. The threshold depends on
# whether they belong to the same street, and the difference matters:
#
#   *Same street* — a divided road arrives as two carriageways maybe 20 m apart,
#   which from the junction centre subtend a wide angle. At 25° they survived as
#   two separate legs, and a junction could end up with four legs all belonging to
#   one road: ['מזרח', 'מזרח', 'מערב', 'מערב'] is a dual carriageway, not a
#   crossroads. 50° collapses each carriageway pair into the one arm a driver sees.
#
#   *Different streets* — the gap has to stay tight, because two genuinely distinct
#   streets meeting at a shallow angle are a real fork and merging them would
#   delete a leg that exists.
SAME_STREET_MERGE_DEG = 50.0
CROSS_STREET_MERGE_DEG = 25.0


def _legs(cluster: dict) -> list[dict]:
    """
    The distinct arms radiating from a junction.

    Each road through the junction contributes two arms, one either side. Arms that
    are really the same arm — a street mapped as several overlapping features, or
    the two carriageways of a divided road — are merged, so the leg count matches
    what a driver approaching the junction would count.
    """
    at = Point(cluster["pt"])
    arms: list[dict] = []

    for member in cluster["members"]:
        for road in member["roads"]:
            # Each side of the road is probed independently, and a side with no road
            # on it yields no arm. That is what makes a T-junction three legs rather
            # than four: the bearing is measured to a point that exists, never
            # inferred by reflecting one that does.
            for forward in (True, False):
                target = point_along(road["line"], at, APPROACH_M, forward)
                if target is None:
                    continue
                deg = bearing(cluster["pt"], target)
                if any(
                    _angle_gap(deg, a["bearing"]) < (
                        SAME_STREET_MERGE_DEG if a["street"] == road["name"]
                        else CROSS_STREET_MERGE_DEG
                    )
                    for a in arms
                ):
                    continue
                arms.append({"bearing": deg, "street": road["name"], "rank": road["rank"]})

    arms.sort(key=lambda a: a["bearing"])
    return arms


def _pick_legs(arms: list[dict]) -> list[dict]:
    """
    Trim to at most ``MAX_LEGS``, keeping the junction a junction.

    Ranking by road class alone can select four arms that all belong to the same
    street — which is how a divided road ends up presented as a crossroads named
    after itself. So the pick is greedy over *streets first*: the highest-ranked arm
    of each distinct street, then the best of what remains. A set that still cannot
    reach two streets is not an intersection and the caller drops it.
    """
    by_rank = sorted(arms, key=lambda a: -a["rank"])
    chosen: list[dict] = []
    seen_streets: set[str] = set()

    for arm in by_rank:
        if arm["street"] not in seen_streets and len(chosen) < MAX_LEGS:
            chosen.append(arm)
            seen_streets.add(arm["street"])

    for arm in by_rank:
        if len(chosen) >= MAX_LEGS:
            break
        if arm not in chosen:
            chosen.append(arm)

    chosen.sort(key=lambda a: a["bearing"])
    return chosen


def _angle_gap(a: float, b: float) -> float:
    """Smallest absolute difference between two bearings, across the 0/360 seam."""
    d = abs(a - b) % 360.0
    return min(d, 360.0 - d)


def _counts(rng: random.Random, rank: int) -> dict[str, list[int]]:
    """
    One approach's invented turning counts, per band.

    Shape rather than realism is the goal: through-movements dominate, rights
    outnumber lefts (a left crosses opposing traffic and is often banned or
    signal-restricted), and the day has two peaks. The absolute level is scaled by
    the leg's road class so an arterial reads busier than a side street.
    """
    daily = rng.uniform(2500, 9000) * (0.45 + 0.28 * rank)

    through = rng.uniform(0.52, 0.72)
    right = rng.uniform(0.14, 0.26)
    left = max(0.06, 1.0 - through - right)
    total = through + right + left
    shares = {"through": through / total, "right": right / total, "left": left / total}

    # Jitter the diurnal curve per approach, then renormalise, so no two legs carry
    # an identical day while the AM/PM peaks stay where they belong.
    shape = [w * rng.uniform(0.75, 1.25) for w in DIURNAL]
    scale = sum(shape)
    shape = [w / scale for w in shape]

    return {
        move: [int(round(daily * share * w)) for w in shape]
        for move, share in shares.items()
    }


def build_junctions(roads_path: Path, bands: list[str], limit: int = MAX_JUNCTIONS) -> dict:
    """
    Build the junction payload from ``roads.geojson``.

    ``bands`` is the survey's own time axis, passed in by the pipeline rather than
    redefined here — the counts are indexed by it, and a junction layer reporting a
    different set of hours from the stop layer would be worse than no layer.
    """
    roads = _load_roads(roads_path)
    if not roads:
        raise SystemExit(f"[junctions] {roads_path} carries no named signal-class roads")

    clusters = _cluster(_crossings(roads))

    candidates = []
    for c in clusters:
        legs = _legs(c)
        if len(legs) < MIN_LEGS:
            continue
        # Past four arms the turning-movement model stops describing the junction.
        legs = _pick_legs(legs)
        # A crossing of a street with itself is a mapping artefact, not a junction.
        if len({leg["street"] for leg in legs}) < 2:
            continue
        candidates.append({"pt": c["pt"], "rank": c["rank"], "legs": legs})

    # Rank first, then a stable geographic tiebreak, so the selected hundred does
    # not reshuffle between runs.
    candidates.sort(key=lambda c: (-c["rank"], round(c["pt"][1], 6), round(c["pt"][0], 6)))
    candidates = candidates[:limit]

    junctions = []
    for i, c in enumerate(candidates, start=1):
        jid = f"j{i:03d}"
        # Seeded on the id, so a junction keeps its numbers across runs and the
        # regenerated file diffs cleanly.
        rng = random.Random(f"odflow-junction-{jid}")

        streets = []
        for leg in c["legs"]:
            if leg["street"] not in streets:
                streets.append(leg["street"])

        approaches = []
        for leg in c["legs"]:
            moves = _counts(rng, leg["rank"])
            approaches.append({
                "dir": compass_label(leg["bearing"]),
                "bearing": round(leg["bearing"], 1),
                "street": leg["street"],
                "left": moves["left"],
                "through": moves["through"],
                "right": moves["right"],
            })

        junctions.append({
            "id": jid,
            "name": " / ".join(streets[:2]),
            "lat": round(c["pt"][1], 6),
            "lon": round(c["pt"][0], 6),
            "streets": streets,
            "approaches": approaches,
        })

    return {
        "mock": True,
        "source": SOURCE_LABEL,
        "bands": bands,
        "junctions": junctions,
    }
