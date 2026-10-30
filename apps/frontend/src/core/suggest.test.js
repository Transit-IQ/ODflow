/**
 * Tests for the קווים מוצעים pruning rules.
 *
 * The two exemptions are the whole point of this suite. Both protect a stop the
 * threshold would otherwise delete, and both are the kind of rule that a later
 * "simplification" quietly removes — at which point the dashboard starts proposing
 * that lines drop their own terminals, and that every stop outside the survey area
 * be deleted for having no data.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// routeStations reads the loaded survey file through core/data.js. The unit under
// test is the rule set, not the join, so the join is stubbed and each test states
// its own stop sequence directly.
vi.mock('./routeStations.js', () => ({
  stationsForRoutes: routeList => routeList.flatMap(r => r._stations),
}));

const { pruneLine, pruneLines, retainedPct, keptReason, KEPT_REASON } =
  await import('./suggest.js');

/** A survey station. `pct` of null is a stop the survey never covered. */
function station(name, pct, boardings, { terminal = false } = {}) {
  return {
    code: name,
    name,
    transfer_pct: pct,
    terminal,
    boardings_day: boardings,
    boardings_by_band: null,
  };
}

function route(id, stations) {
  return { route_id: id, route_short_name: id, _stations: stations };
}

describe('keptReason', () => {
  it('keeps a stop at or below the threshold', () => {
    expect(keptReason(station('a', 40, 100), 40)).toBe(KEPT_REASON.under);
    expect(keptReason(station('a', 39, 100), 40)).toBe(KEPT_REASON.under);
  });

  it('removes a stop above the threshold', () => {
    expect(keptReason(station('a', 41, 100), 40)).toBe(null);
  });

  it('never removes an unsurveyed stop, however high the threshold pressure', () => {
    expect(keptReason(station('a', null, null), 0)).toBe(KEPT_REASON.unsurveyed);
  });

  it('never removes a terminal, even far above the threshold', () => {
    expect(keptReason(station('a', 99, 100, { terminal: true }), 10))
      .toBe(KEPT_REASON.terminal);
  });

  it('checks unsurveyed before terminal, so a null pct is never compared', () => {
    // A stop with no transfer_pct that is also a terminal must report the reason
    // that explains the missing figure, not the one that happens to also apply.
    expect(keptReason(station('a', null, null, { terminal: true }), 50))
      .toBe(KEPT_REASON.unsurveyed);
  });
});

describe('pruneLine', () => {
  const line = () => route('12', [
    station('start', 90, 500, { terminal: true }),   // over, but a terminal
    station('busy', 20, 300),                        // under
    station('pass', 80, 200),                        // over — the only removal
    station('outside', null, null),                  // unsurveyed
    station('end', 95, 400, { terminal: true }),     // over, but a terminal
  ]);

  it('removes only the stop that no rule protects', () => {
    const r = pruneLine(line(), 50);
    expect(r.removed.map(s => s.name)).toEqual(['pass']);
    expect(r.kept).toHaveLength(4);
  });

  it('counts an unsurveyed stop as kept and lists it separately', () => {
    const r = pruneLine(line(), 50);
    expect(r.unsurveyed.map(s => s.name)).toEqual(['outside']);
    expect(r.kept.map(s => s.name)).toContain('outside');
  });

  it('splits boardings by the same verdict, excluding unsurveyed from both sides', () => {
    const r = pruneLine(line(), 50);
    expect(r.boardingsKept).toBe(500 + 300 + 400);   // 'outside' contributes nothing
    expect(r.boardingsRemoved).toBe(200);
  });

  it('never enters a null boardings figure as a zero', () => {
    const r = pruneLine(route('1', [station('x', null, null)]), 50);
    expect(r.boardingsKept).toBe(0);
    expect(r.boardingsRemoved).toBe(0);
    expect(r.unsurveyed).toHaveLength(1);
  });

  it('removes nothing at a threshold of 100', () => {
    expect(pruneLine(line(), 100).removed).toHaveLength(0);
  });

  it('keeps only protected stops at a threshold of 0', () => {
    const r = pruneLine(line(), 0);
    expect(r.removed.map(s => s.name)).toEqual(['busy', 'pass']);
    expect(r.kept.map(s => s.name)).toEqual(['start', 'outside', 'end']);
  });
});

describe('pruneLines', () => {
  it('counts a stop shared by two lines once', () => {
    const shared = station('shared', 10, 100);
    const a = route('a', [shared, station('a1', 10, 50)]);
    const b = route('b', [shared, station('b1', 10, 50)]);

    const r = pruneLines([a, b], 50);
    expect(r.kept).toHaveLength(3);
    expect(r.boardingsKept).toBe(200);   // not 300 — `shared` is not double-counted
  });

  it('keeps a stop that one line drops and another keeps', () => {
    // 'edge' is over the threshold on line a, but is line b's terminal. It stays on
    // the map, so reporting it as removed would promise a deletion that is not made.
    const edgeForA = station('edge', 80, 100);
    const edgeForB = edgeForA;
    const a = route('a', [edgeForA]);
    const b = route('b', [Object.assign(edgeForB, { terminal: true })]);

    const r = pruneLines([a, b], 50);
    expect(r.removed).toHaveLength(0);
    expect(r.kept).toHaveLength(1);
  });
});

describe('retainedPct', () => {
  it('reports the share of boardings kept', () => {
    expect(retainedPct({ boardingsKept: 750, boardingsRemoved: 250 })).toBe(75);
  });

  it('is null rather than 100 when nothing is known', () => {
    // "every rider kept" and "no rider data at all" are different answers.
    expect(retainedPct({ boardingsKept: 0, boardingsRemoved: 0 })).toBe(null);
  });

  it('is 0 when every surveyed rider is on a removed stop', () => {
    expect(retainedPct({ boardingsKept: 0, boardingsRemoved: 400 })).toBe(0);
  });
});
