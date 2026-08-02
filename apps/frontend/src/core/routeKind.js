/**
 * Splitting bus lines into urban (עירוני) and intercity (בין-עירוני).
 *
 * The generated route records carry no such flag — GTFS `routes.txt` has no
 * urban/intercity column, and the MOT feed's supplementary cluster file isn't
 * part of the export set. What it does carry is a strictly formatted
 * `route_long_name`:
 *
 *     <origin stop>-<origin city><-><destination stop>-<destination city>-<code>
 *     מסוף עתידים-תל אביב יפו<->ת. רכבת אוניברסיטה/הורדה-תל אביב יפו-11
 *
 * so both endpoint cities are recoverable from the string. A line is urban when
 * both ends sit in the city under analysis; anything that leaves it is
 * intercity, which is what עירוני / בין-עירוני mean formally.
 *
 * Checked against the full 700-route index: every name parses, and the urban
 * set comes out as Tel Aviv's recognisable internal network (2–16, 31, 44, 52,
 * 54, 79, 80, 114, 6א). Same-city-but-not-Tel-Aviv lines are deliberately NOT
 * urban here — Holon's internal 4/5/6 and the 800-series park-and-ride shuttles
 * (both ends חניון שפיים) are not Tel Aviv urban lines.
 */

/** The city the dashboard analyses. Changing the study area changes this. */
export const HOME_CITY = 'תל אביב יפו';

// The trailing token is a direction/alternative code: 10, 20, 11, 1#, 2#, 1ז…
const DIRECTION_CODE = /^\d+[#֐-׿]?$/;

export const ROUTE_KINDS = [
  { id: 'urban', label: 'עירוני' },
  { id: 'intercity', label: 'בין-עירוני' },
];

/** The two endpoint cities of a route, or null when the name doesn't parse. */
export function endpointCities(longName) {
  const split = longName ? longName.indexOf('<->') : -1;
  if (split < 0) return null;

  const left = longName.slice(0, split);
  let right = longName.slice(split + 3);

  // Drop the trailing direction code so the city is the last dash-segment.
  const cut = right.lastIndexOf('-');
  if (cut > 0 && DIRECTION_CODE.test(right.slice(cut + 1).trim())) {
    right = right.slice(0, cut);
  }

  const from = left.slice(left.lastIndexOf('-') + 1).trim();
  const to = right.slice(right.lastIndexOf('-') + 1).trim();

  return from && to ? [from, to] : null;
}

/** 'urban' | 'intercity'. An unparseable name is treated as intercity. */
export function routeKind(route) {
  const cities = endpointCities(route?.route_long_name);
  return cities && cities[0] === HOME_CITY && cities[1] === HOME_CITY
    ? 'urban'
    : 'intercity';
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
