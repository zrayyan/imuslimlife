// What makes one month page different from another (task 152 step 3, 2026-11-14).
//
// Google demoted the site on 2026-11-08 for near-duplicate generated pages: Lahore's and
// Karachi's month pages differed only in the numbers of the table. monthFacts() reads the
// month's own times and Hijri dates and returns the facts the page states in words: the
// earliest and latest Fajr and Maghrib, how the day lengthens or shortens, a clock change,
// and Ramadan or Eid if they fall in the month. Nothing here is template filler.

const mins = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

function extremes(days, p) {
  let lo = days[0];
  let hi = days[0];
  for (const d of days) {
    if (mins(d.t[p]) < mins(lo.t[p])) lo = d;
    if (mins(d.t[p]) > mins(hi.t[p])) hi = d;
  }
  return { earliest: { date: lo.date, t: lo.t[p] }, latest: { date: hi.date, t: hi.t[p] } };
}

const hijriParts = (h) => String(h).match(/^(\d+) (.+) (\d+)$/)?.slice(1) || [];
const findHijri = (days, day, month) => days.find((d) => {
  const [dd, mm] = hijriParts(d.hijri);
  return Number(dd) === day && mm === month;
});

// month: { y, m, days: [{ date, hijri: '1 Ramadan 1448', t: { Fajr: '05:12', ... } }] }
export function monthFacts(month) {
  const { days } = month;
  const first = days[0];
  const last = days[days.length - 1];
  const daylight = (d) => mins(d.t.Maghrib) - mins(d.t.Sunrise);
  // A clock change shows as Dhuhr jumping by about an hour overnight (solar noon moves
  // by under a minute a day).
  let dst = null;
  for (let i = 1; i < days.length; i++) {
    const jump = mins(days[i].t.Dhuhr) - mins(days[i - 1].t.Dhuhr);
    if (Math.abs(jump) >= 45) dst = { date: days[i].date, minutes: jump > 0 ? 60 : -60 };
  }
  const ramadanStart = findHijri(days, 1, 'Ramadan');
  const ramadanAny = days.find((d) => hijriParts(d.hijri)[1] === 'Ramadan');
  return {
    fajr: extremes(days, 'Fajr'),
    maghrib: extremes(days, 'Maghrib'),
    daylight: { first: daylight(first), last: daylight(last), change: daylight(last) - daylight(first) },
    dst,
    ramadan: ramadanAny ? { start: ramadanStart?.date || null, year: hijriParts(ramadanAny.hijri)[2] } : null,
    eidFitr: findHijri(days, 1, 'Shawwal')?.date || null,
    eidAdha: findHijri(days, 10, 'Dhu al-Hijjah')?.date || findHijri(days, 10, 'Dhul Hijjah')?.date || null,
  };
}

// "10 h 41 min" style parts for a number of minutes.
export const hm = (n) => ({ h: Math.floor(Math.abs(n) / 60), m: Math.abs(n) % 60 });
