// What the prayer-times hub can say that no other page says (task 152, 2026-11-28).
//
// The hub was "Crawled - currently not indexed": a list of links plus method text every prayer-times site repeats.
// hubFacts() runs the site's own engine once for every listed city for one date and returns the facts the hub states
// in words: the earliest and latest Fajr and Maghrib, the longest and shortest day, which methods and Asr rules the
// cities use and where. Pure and deterministic for (cities, countries, date); render.mjs memoises it per day, so the
// cost (about 500 one-day calculations) is paid once per isolate per day, never per request.
//
// The engine is passed in (`compute`, the Worker's calc-src.mjs) because the nightly build copies these modules into a
// repo that has no adhan engine; without it the day's extremes are null and the hub leaves that section out.

const mins = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ''));
  return m ? +m[1] * 60 + +m[2] : null;
};

/** The row with the lowest (dir < 0) or highest (dir > 0) value of `by`; the first one on a tie. */
function pick(rows, by, dir) {
  let best = null;
  for (const r of rows) if (!best || (dir < 0 ? r[by] < best[by] : r[by] > best[by])) best = r;
  return best;
}

const hhmm = (n) => { const v = n % 1440; return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };

/**
 * @param {{cities: object[], countries: object, date: string}} o date: 'YYYY-MM-DD', the day the times are for (read on each city's own clock)
 * @returns {{date, cities, countries, fajr:{earliest,latest}, maghrib:{earliest,latest}, day:{longest,shortest}, methods:object[], asr:{hanafi:object, standard:object}, north:object|null}}
 */
export function hubFacts({ cities, countries, date, compute = null }) {
  const rows = [];
  for (const city of compute ? cities : []) {
    let t;
    try {
      const { method, school } = countries[city.country].params;
      t = compute([{ date, hijri: '' }], { lat: city.lat, lon: city.lon, tz: city.tz, method, school })[0];
    } catch { continue; } // one bad city must not break the hub
    const fajr = mins(t?.Fajr), sunrise = mins(t?.Sunrise);
    let maghrib = mins(t?.Maghrib);
    if (fajr === null || maghrib === null || sunrise === null) continue; // never state a time the engine could not give
    if (maghrib < sunrise) maghrib += 1440; // summer far north: Maghrib after midnight, on the day's own timeline
    rows.push({ city, fajr, maghrib, length: maghrib - sunrise });
  }
  const at = (r, by) => r && by && { city: r.city, value: by === 'length' ? r.length : hhmm(r[by]) };

  // Methods: the cities and countries that use each, most cities first, then by name.
  const byMethod = new Map();
  const school = { hanafi: { cities: 0, ccs: new Set() }, standard: { cities: 0, ccs: new Set() } };
  for (const city of cities) {
    const c = countries[city.country];
    const e = byMethod.get(c.params.method) || { method: c.params.method, name: c.methodName, cities: 0, ccs: new Set() };
    e.cities++; e.ccs.add(city.country);
    byMethod.set(c.params.method, e);
    const s = c.params.school ? school.hanafi : school.standard;
    s.cities++; s.ccs.add(city.country);
  }
  const methods = [...byMethod.values()].map((e) => ({ ...e, ccs: [...e.ccs] })).sort((a, b) => b.cities - a.cities || a.name.localeCompare(b.name));
  const north = cities.reduce((a, c) => (!a || Math.abs(c.lat) > Math.abs(a.lat) ? c : a), null);
  return {
    date,
    cities: cities.length,
    countries: new Set(cities.map((c) => c.country)).size,
    fajr: { earliest: at(pick(rows, 'fajr', -1), 'fajr'), latest: at(pick(rows, 'fajr', 1), 'fajr') },
    maghrib: { earliest: at(pick(rows, 'maghrib', -1), 'maghrib'), latest: at(pick(rows, 'maghrib', 1), 'maghrib') },
    day: { longest: at(pick(rows, 'length', 1), 'length'), shortest: at(pick(rows, 'length', -1), 'length') },
    methods,
    asr: { hanafi: { cities: school.hanafi.cities, ccs: [...school.hanafi.ccs] }, standard: { cities: school.standard.cities, ccs: [...school.standard.ccs] } },
    north: north && { city: north, lat: Math.abs(north.lat) },
  };
}
