"""
Tests for the synthetic junction generator.

The geometry is the part worth pinning down. The counts are invented, so there is
no "right answer" to check them against — but there IS a right answer to *are they
reproducible*, and to whether the shapes this module claims to detect (a real
crossroads, a dual carriageway, a T-junction) are the shapes it actually detects.
"""

import sys
from pathlib import Path

import pytest
from shapely.geometry import LineString, Point

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services import junctions_mock as jm  # noqa: E402


# A degree of latitude is ~110.6 km, so these convert metres into the degree
# offsets the module works in.
M_LAT = 1.0 / 110_574.0
M_LON = 1.0 / (111_320.0 * 0.8475)   # cos(32.08°)

BASE_LON, BASE_LAT = 34.78, 32.08


def at(east_m: float, north_m: float) -> tuple[float, float]:
    """A point offset from the test origin by a distance in metres."""
    return (BASE_LON + east_m * M_LON, BASE_LAT + north_m * M_LAT)


def road(name: str, pts, fclass: str = "primary") -> dict:
    return {"name": name, "rank": jm.CLASS_RANK[fclass], "line": LineString(pts)}


class TestBearing:
    def test_north_is_zero(self):
        assert jm.bearing(at(0, 0), at(0, 100)) == pytest.approx(0, abs=0.5)

    def test_east_is_ninety(self):
        assert jm.bearing(at(0, 0), at(100, 0)) == pytest.approx(90, abs=0.5)

    def test_south_is_one_eighty(self):
        assert jm.bearing(at(0, 0), at(0, -100)) == pytest.approx(180, abs=0.5)

    def test_west_is_two_seventy(self):
        assert jm.bearing(at(0, 0), at(-100, 0)) == pytest.approx(270, abs=0.5)

    def test_never_returns_three_sixty(self):
        # 360 and 0 are the same bearing, and a compass_label lookup that falls off
        # the end of the table would return the wrong name for one of them.
        for target in (at(0, 100), at(0.01, 100)):
            assert 0 <= jm.bearing(at(0, 0), target) < 360


class TestCompassLabel:
    @pytest.mark.parametrize("deg,expected", [
        (0, "צפון"), (10, "צפון"), (350, "צפון"),
        (90, "מזרח"), (180, "דרום"), (270, "מערב"),
        (45, "צפון-מזרח"), (225, "דרום-מערב"),
    ])
    def test_labels(self, deg, expected):
        assert jm.compass_label(deg) == expected


class TestPointAlong:
    def test_steps_the_requested_distance(self):
        line = LineString([at(0, -200), at(0, 200)])
        got = jm.point_along(line, Point(at(0, 0)), 25)
        assert got is not None
        assert jm._metres(got, at(0, 0)) == pytest.approx(25, abs=1.5)

    def test_returns_none_when_the_line_is_too_short(self):
        # A five-metre stub cannot support a 25 m bearing measurement, and measuring
        # over the flare geometry instead would report a bearing that is not the
        # street's.
        stub = LineString([at(0, -2), at(0, 3)])
        assert jm.point_along(stub, Point(at(0, 0)), 25) is None


class TestLegDetection:
    def _cluster(self, roads):
        crossings = jm._crossings(roads)
        assert crossings, "the test roads do not actually cross"
        clusters = jm._cluster(crossings)
        assert len(clusters) == 1
        return clusters[0]

    def test_a_plain_crossroads_has_four_legs(self):
        roads = [
            road("צפון-דרום", [at(0, -300), at(0, 300)]),
            road("מזרח-מערב", [at(-300, 0), at(300, 0)]),
        ]
        legs = jm._legs(self._cluster(roads))
        assert len(legs) == 4
        assert sorted(jm.compass_label(l["bearing"]) for l in legs) == \
            sorted(["צפון", "דרום", "מזרח", "מערב"])

    def test_a_t_junction_has_three_legs(self):
        roads = [
            road("ראשי", [at(-300, 0), at(300, 0)]),
            road("מסתעף", [at(0, 0), at(0, 300)]),
        ]
        legs = jm._legs(self._cluster(roads))
        assert len(legs) == 3

    def test_a_dual_carriageway_does_not_become_two_legs(self):
        """
        The defect this rule exists for.

        A divided road crossing another produced four arms all belonging to one
        street, and the junction came out named after itself with legs reading
        ['מזרח', 'מזרח', 'מערב', 'מערב']. Both carriageways must collapse to the one
        arm a driver sees.
        """
        roads = [
            road("שדרה", [at(-300, 6), at(300, 6)]),     # northbound carriageway
            road("שדרה", [at(-300, -6), at(300, -6)]),   # southbound carriageway
            road("חוצה", [at(0, -300), at(0, 300)]),
        ]
        legs = jm._legs(self._cluster(roads))
        by_street = {}
        for leg in legs:
            by_street.setdefault(leg["street"], []).append(leg)
        assert len(by_street["שדרה"]) == 2, "the divided road should read as two arms, not four"


class TestPickLegs:
    def test_prefers_street_variety_over_raw_rank(self):
        """
        Ranking by class alone can select four arms of one street — which is how a
        divided road ends up presented as a crossroads named after itself.
        """
        arms = [
            {"bearing": 0, "street": "ראשי", "rank": 3},
            {"bearing": 90, "street": "ראשי", "rank": 3},
            {"bearing": 180, "street": "ראשי", "rank": 3},
            {"bearing": 200, "street": "ראשי", "rank": 3},
            {"bearing": 270, "street": "משני", "rank": 1},   # lowest rank, only other street
        ]
        chosen = jm._pick_legs(arms)
        assert len(chosen) == jm.MAX_LEGS
        assert "משני" in {a["street"] for a in chosen}

    def test_returns_legs_in_bearing_order(self):
        arms = [
            {"bearing": 270, "street": "a", "rank": 3},
            {"bearing": 10, "street": "b", "rank": 3},
            {"bearing": 150, "street": "c", "rank": 2},
        ]
        assert [a["bearing"] for a in jm._pick_legs(arms)] == [10, 150, 270]


class TestCounts:
    def test_through_movements_dominate(self):
        moves = jm._counts(__import__("random").Random(1), rank=3)
        assert sum(moves["through"]) > sum(moves["left"])
        assert sum(moves["through"]) > sum(moves["right"])

    def test_every_band_is_present_and_non_negative(self):
        moves = jm._counts(__import__("random").Random(2), rank=2)
        for key, values in moves.items():
            assert len(values) == len(jm.DIURNAL), key
            assert all(v >= 0 for v in values), key

    def test_peaks_land_in_the_morning_and_afternoon_bands(self):
        # Bands are 04-06, 06-09, 09-12, 12-15, 15-19, 19-24, 00-04. The busiest
        # band must be one of the two rush windows, or the layer is not showing
        # what it claims to show.
        for seed in range(25):
            moves = jm._counts(__import__("random").Random(seed), rank=3)
            total = [sum(c) for c in zip(moves["left"], moves["through"], moves["right"])]
            assert total.index(max(total)) in (1, 4), f"seed {seed} peaks elsewhere"

    def test_a_higher_class_road_carries_more(self):
        import random
        # Same seed, different rank — so only the class scaling can differ.
        low = sum(sum(v) for v in jm._counts(random.Random(7), rank=1).values())
        high = sum(sum(v) for v in jm._counts(random.Random(7), rank=4).values())
        assert high > low

    def test_is_reproducible_for_a_given_seed(self):
        import random
        assert jm._counts(random.Random("j001"), 3) == jm._counts(random.Random("j001"), 3)
