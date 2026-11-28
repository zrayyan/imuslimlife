// One city's whole Ramadan (task K13). Ramadan rarely fits one Gregorian month (1448 runs
// 8 Feb - 9 Mar 2027), so the month pages each hold only part of it. ramadanFast() joins the
// city's months, keeps the Ramadan days in order and states each fast: suhoor ends at Fajr,
// iftar is at Maghrib. Pure: no file or network access, shared by the build and the Worker.

const mins = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
};
const parts = (h) => String(h).match(/^(\d+) (.+) (\d+)$/)?.slice(1) || [];

// months: [{ y, m, days: [{ date, hijri: '1 Ramadan 1448', t: { Fajr, Maghrib, ... } }] }]
export function ramadanFast(months) {
  const all = (months || []).flatMap((mo) => mo.days).sort((a, b) => a.date.localeCompare(b.date));
  const from = all.findIndex((d) => parts(d.hijri)[1] === 'Ramadan');
  if (from < 0) return null;
  const hijriYear = parts(all[from].hijri)[2];
  const days = [];
  for (let i = from; i < all.length && parts(all[i].hijri)[1] === 'Ramadan'; i++) {
    const d = all[i];
    days.push({ n: Number(parts(d.hijri)[0]), date: d.date, hijri: d.hijri, suhoor: d.t.Fajr, iftar: d.t.Maghrib, fast: mins(d.t.Maghrib) - mins(d.t.Fajr) });
  }
  const after = all[from + days.length];
  const eid = after && parts(after.hijri)[0] === '1' && parts(after.hijri)[1] === 'Shawwal' ? after.date : null;
  const pick = (better) => days.reduce((a, b) => (better(b.fast, a.fast) ? b : a));
  const evening = (night) => days.find((d) => d.n === night - 1);
  return {
    hijriYear,
    days,
    complete: days[0].n === 1 && days.length >= 29 && eid !== null,
    shortest: pick((x, y) => x < y),
    longest: pick((x, y) => x > y),
    eid,
    firstTaraweeh: days[0].n === 1 ? all[from - 1]?.date || null : null,
    oddNights: [21, 23, 25, 27, 29].map((night) => evening(night) && { night, date: evening(night).date }).filter(Boolean),
  };
}

// A wall-clock time in a time zone ('2027-02-08', '05:28', 'Asia/Karachi') as an iCalendar UTC stamp.
// The zone's offset is read at that instant (twice, so a DST change the same day lands right).
export function utcStamp(date, hhmm, tz) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const offset = (at) => {
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(new Date(at)).forEach((x) => { p[x.type] = Number(x.value); });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - at;
  };
  let t = wall - offset(wall);
  t = wall - offset(t);
  return new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const BYTES = new TextEncoder();
// RFC 5545 line folding: at most 75 octets, continuation lines start with a space.
function fold(line) {
  const out = [];
  let cur = '';
  for (const ch of line) {
    if (BYTES.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ''; }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const plus = (stamp, min) => new Date(Date.parse(stamp.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z')) + min * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/**
 * The city's Ramadan as a calendar people subscribe to (K13 step 5): each day a 20-minute "Suhoor ends"
 * event ending at Fajr and a 20-minute "Iftar" event from Maghrib, each with a reminder at its start.
 * Stable UIDs, so a refreshed subscription updates the same events (e.g. when the moon-sighting date moves).
 */
export function ramadanIcs(city, f, { name, url, timeOf, words = {} }) {
  const W = { suhoor: 'Suhoor ends', iftar: 'Iftar', ramadan: 'Ramadan', ...words };
  const year = f.days[0].date.slice(0, 4);
  const stamp = `${f.days[0].date.replace(/-/g, '')}T000000Z`;
  const id = `${city.country}-${city.slug}@imuslimlife.com`;
  const event = (d, kind, start, end, at) => [
    'BEGIN:VEVENT', `UID:${d.date}-${kind}-${id}`, `DTSTAMP:${stamp}`,
    `SUMMARY:${icsText(`${W[kind]} ${timeOf(at)} · ${W.ramadan} ${d.n}`)}`, `DTSTART:${start}`, `DTEND:${end}`, `URL:${url}`, 'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(W[kind])}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT',
  ];
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//iMuslim Life//Ramadan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsText(`${W.ramadan} ${year} · ${name}`)}`, `X-WR-TIMEZONE:${city.tz}`, 'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D',
    ...f.days.flatMap((d) => {
      const fajr = utcStamp(d.date, d.suhoor, city.tz), maghrib = utcStamp(d.date, d.iftar, city.tz);
      return [...event(d, 'suhoor', plus(fajr, -20), fajr, d.suhoor), ...event(d, 'iftar', maghrib, plus(maghrib, 20), d.iftar)];
    }),
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
