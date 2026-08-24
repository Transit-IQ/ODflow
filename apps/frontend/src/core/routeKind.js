/**
 * Splitting bus lines into urban (עירוני) and intercity (בין-עירוני).
 *
 * The classification is the line number itself: 1–99 is urban, 100 and above is
 * intercity. That is how the numbering is allocated in practice — the two-digit
 * range is the municipal network, the three-digit range is what leaves the city
 * — and it is what an analyst reading the list expects a line number to mean.
 *
 * A suffixed number keeps its numeric part's kind (6א is urban, 240א intercity),
 * and a name with no leading digits can't be over 99, so it stays urban.
 *
 * (This replaced an earlier rule that parsed both endpoint cities out of the
 * MOT `route_long_name` and called a line urban only when both ends were inside
 * Tel Aviv. It classified more lines as intercity than the numbering does — a
 * line running from the city to a neighbouring one on a two-digit number came
 * out intercity — and it depended on a name format the feed is free to change.)
 */

export const ROUTE_KINDS = [
  { id: 'urban', label: 'עירוני' },
  { id: 'intercity', label: 'בין-עירוני' },
];

/** Highest line number still counted as urban. */
export const URBAN_MAX_LINE = 99;

/** The leading digits of a line name, or null when it doesn't start with any. */
function lineNumber(shortName) {
  const m = String(shortName ?? '').match(/^\d+/);
  return m ? Number(m[0]) : null;
}

/** 'urban' | 'intercity', by line number. */
export function routeKind(route) {
  const n = lineNumber(route?.route_short_name);
  return n != null && n > URBAN_MAX_LINE ? 'intercity' : 'urban';
}

/**
 * Sort key for a line number: 6 before 11 before 137, and 6 before 6א.
 * Names with no leading digits sort last, alphabetically.
 */
function sortKey(shortName) {
  const name = String(shortName ?? '');
  const m = name.match(/^(\d+)(.*)$/);
  return m ? [0, Number(m[1]), m[2]] : [1, 0, name];
}

export function compareRoutes(a, b) {
  const ka = sortKey(a.route_short_name);
  const kb = sortKey(b.route_short_name);
  return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2], 'he');
}

/**
 * Group routes into the ROUTE_KINDS order — urban first — each sorted by line
 * number. Empty groups are dropped so an area with no urban line doesn't show
 * an empty heading.
 */
export function groupByKind(routes) {
  return ROUTE_KINDS
    .map(kind => ({
      ...kind,
      routes: routes.filter(r => routeKind(r) === kind.id).sort(compareRoutes),
    }))
    .filter(group => group.routes.length > 0);
}
