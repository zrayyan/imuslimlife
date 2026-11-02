// The Islamic calendar hub (2026-11-02): /islamic-calendar/ (the coming events),
// /islamic-calendar/<year>/ (every event and Hijri month start in a Gregorian year) and
// /islamic-calendar/<event>-<year>/ (one event: date, meaning, prayer times by city).
// Dates are the calculated Umm al-Qura calendar from Intl (islamic-umalqura), which gives
// the same Hijri date as the API for every day (checked 2026-11-02, 365 of 365 in Makkah),
// so it costs no API requests and reaches any year. Owner's choices: Umm al-Qura with a
// moon-sighting note; Mawlid and 15 Sha'ban included, worded neutrally.

export const HIJRI_MONTHS = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'];

// [slug, name, Hijri month, day, days, what it is]. `night` events begin at Maghrib the evening before.
const EVENTS = [
  { slug: 'islamic-new-year', name: 'Islamic New Year', hm: 1, hd: 1, about: 'The first day of Muharram begins the new Hijri year, counted from the Prophet’s ﷺ migration (Hijrah) from Makkah to Madinah.' },
  { slug: 'ashura', name: 'Day of Ashura', hm: 1, hd: 10, about: 'The 10th of Muharram. The Prophet ﷺ fasted on this day and encouraged fasting it, together with the 9th or the 11th.' },
  { slug: 'mawlid', name: 'Mawlid an-Nabi', hm: 3, hd: 12, about: 'The 12th of Rabi al-Awwal, observed by many Muslims as the birthday of the Prophet Muhammad ﷺ. Practice differs between communities and schools.' },
  { slug: 'isra-miraj', name: 'Isra and Mi’raj', hm: 7, hd: 27, night: true, about: 'Many Muslims remember the Prophet’s ﷺ night journey to Jerusalem and ascension on the night of 27 Rajab; the exact date is not agreed upon.' },
  { slug: 'mid-shaban', name: '15 Sha’ban (Laylat al-Bara’ah)', hm: 8, hd: 15, night: true, about: 'The night of the 15th of Sha’ban, which many Muslims spend in prayer and supplication. Practice differs between communities and schools.' },
  { slug: 'ramadan', name: 'Start of Ramadan', hm: 9, hd: 1, about: 'The first day of fasting. Taraweeh begins the evening before; Suhoor ends at Fajr and Iftar is at Maghrib.' },
  { slug: 'laylat-al-qadr', name: 'Laylat al-Qadr (27th night)', hm: 9, hd: 27, night: true, about: 'The Night of Decree, better than a thousand months, is sought in the odd nights of the last ten days of Ramadan; many Muslims give special attention to the 27th night.' },
  { slug: 'eid-al-fitr', name: 'Eid al-Fitr', hm: 10, hd: 1, about: 'The festival marking the end of Ramadan. Zakat al-Fitr is given before the Eid prayer, which is prayed after sunrise.' },
  { slug: 'dhul-hijjah', name: 'First ten days of Dhul Hijjah', hm: 12, hd: 1, days: 10, about: 'The best days of the year for good deeds, ending with Eid al-Adha.' },
  { slug: 'day-of-arafah', name: 'Day of Arafah', hm: 12, hd: 9, about: 'Pilgrims stand at Arafah; for those not on Hajj, fasting this day is greatly recommended.' },
  { slug: 'eid-al-adha', name: 'Eid al-Adha', hm: 12, hd: 10, about: 'The festival of sacrifice, during Hajj. The Eid prayer is after sunrise and the Udhiyah (Qurbani) follows it, through the 13th of Dhul Hijjah.' },
];

const umq = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' });
const iso = (t) => new Date(t).toISOString().slice(0, 10);
export function hijriOf(date) {
  const p = Object.fromEntries(umq.formatToParts(new Date(`${date}T12:00:00Z`)).map((x) => [x.type, x.value]));
  return { d: +p.day, m: +p.month, y: +String(p.year).split(' ')[0] };
}
const addDays = (date, n) => iso(Date.parse(`${date}T12:00:00Z`) + n * 864e5);

// Every event occurrence starting from `from` for `count` days: [{ ev, date, end, hijri }].
export function occurrences(from, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const date = addDays(from, i);
    const h = hijriOf(date);
    for (const ev of EVENTS) if (h.m === ev.hm && h.d === ev.hd) out.push({ ev, date, end: ev.days ? addDays(date, ev.days - 1) : null, hijri: h });
  }
  return out;
}
// The first day of each Hijri month in a Gregorian year.
function monthStarts(year) {
  const out = [];
  for (let date = `${year}-01-01`; date.startsWith(String(year)); date = addDays(date, 1)) {
    const h = hijriOf(date);
    if (h.d === 1) out.push({ date, hijri: h });
  }
  return out;
}
const daysIn = (y) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);
export const eventUrl = (o) => `/islamic-calendar/${o.ev.slug}-${o.date.slice(0, 4)}/`;
export const yearUrl = (y) => `/islamic-calendar/${y}/`;
const HUB = '/islamic-calendar/';

export function buildCalendar({ layout, esc, breadcrumb, faqLd, listed, countries, cityUrl, monthUrl, named, monthYearShown, ramadan, today }) {
  const fmt = (d, opts = {}) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC', ...opts });
  const hj = (h) => `${h.d} ${HIJRI_MONTHS[h.m - 1]} ${h.y} AH`;
  const when = (o) => (o.end ? `${fmt(o.date)} – ${fmt(o.end)}` : fmt(o.date));
  const note = '<p class="note">Dates follow the calculated Umm al-Qura calendar. Where your community follows a local moon sighting, the month, and so the event, may begin a day later; follow your masjid.</p>';
  const nightNote = (o) => (o.ev.night ? ` The night begins at Maghrib on ${fmt(addDays(o.date, -1), { weekday: 'long', year: undefined })}.` : '');
  const y0 = Number(today.slice(0, 4));
  const years = [y0, y0 + 1];
  const pages = new Map();
  const urls = [];
  const put = (url, html) => { pages.set(url, html); urls.push(url); };
  // The first city of each country (cities.json lists the largest first).
  const capitals = Object.keys(countries).map((cc) => listed.find((c) => c.country === cc)).filter(Boolean);

  // An event can fall twice in one Gregorian year (about every 33 years); the first one has the page.
  const firstOf = new Map();
  const linked = (o) => firstOf.get(eventUrl(o)) === o.date;
  const table = (occ) => `<table class="tt cal"><thead><tr><th scope="col">Event</th><th scope="col">Date</th><th scope="col">Hijri</th></tr></thead><tbody>${occ.map((o) => `<tr data-date="${o.date}"><th scope="row">${linked(o) ? `<a href="${eventUrl(o)}">${esc(o.ev.name)}</a>` : esc(o.ev.name)}</th><td>${when(o)}</td><td>${hj(o.hijri)}</td></tr>`).join('')}</tbody></table>`;
  const yearLinks = `<p>${years.map((y) => `<a class="btn alt" href="${yearUrl(y)}">Islamic calendar ${y}</a>`).join(' ')}</p>`;

  const all = years.flatMap((y) => occurrences(`${y}-01-01`, daysIn(y)));
  for (const o of all) if (!firstOf.has(eventUrl(o))) firstOf.set(eventUrl(o), o.date);
  for (const y of years) {
    const occ = all.filter((o) => o.date.startsWith(String(y)));
    const starts = monthStarts(y);
    const hy = [...new Set(starts.map((s) => s.hijri.y))].join('–');
    const body = `
<main class="wrap">
  <p class="crumbs"><a href="${HUB}">Islamic calendar</a> › ${y}</p>
  <section class="hero"><h1>Islamic Calendar ${y} (${hy} AH)</h1><p class="sub">Islamic holidays and Hijri month dates for ${y}</p></section>
  <section class="card"><h2>Islamic holidays ${y}</h2>${table(occ)}${note}</section>
  <section class="card"><h2>Hijri months in ${y}</h2><table class="tt cal"><thead><tr><th scope="col">Month</th><th scope="col">Begins</th></tr></thead><tbody>${starts.map((s) => `<tr><th scope="row">${HIJRI_MONTHS[s.hijri.m - 1]} ${s.hijri.y}</th><td>${fmt(s.date)}</td></tr>`).join('')}</tbody></table></section>
  <section class="card"><h2>Other years</h2>${yearLinks}<p><a href="/prayer-times/countries/">Prayer times in ${listed.length} cities</a></p></section>
</main>`;
    put(yearUrl(y), layout({
      title: `Islamic Calendar ${y}: Ramadan, Eid and Islamic Holidays (${hy} AH)`,
      description: `Islamic holidays in ${y}: ${occ.filter((o) => ['ramadan', 'eid-al-fitr', 'eid-al-adha'].includes(o.ev.slug)).map((o) => `${o.ev.name} ${fmt(o.date, { weekday: undefined })}`).join(', ')}, with every Hijri month date.`,
      canonical: yearUrl(y),
      jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Islamic calendar', HUB], [String(y), yearUrl(y)]])],
      body,
    }));
  }

  for (const o of all) {
    const y = o.date.slice(0, 4);
    const m = Number(o.date.slice(5, 7));
    // Month pages show one occurrence of each month; link the ones that show this event's.
    const cityLinks = capitals.filter((c) => monthYearShown(c, m) === Number(y));
    const faq = [
      [`When is ${o.ev.name} ${y}?`, `By the calculated Umm al-Qura calendar, ${o.ev.name} ${y} is on ${when(o)} (${hj(o.hijri)}).${nightNote(o)} Where the month begins with a local moon sighting it may be a day later.`],
      [`What is ${o.ev.name}?`, o.ev.about],
    ];
    const body = `
<main class="wrap">
  <p class="crumbs"><a href="${HUB}">Islamic calendar</a> › <a href="${yearUrl(y)}">${y}</a> › ${esc(o.ev.name)}</p>
  <section class="hero"><h1>${esc(o.ev.name)} ${y}</h1><p class="sub">${when(o)} · ${hj(o.hijri)}</p></section>
  <section class="card"><h2>About ${esc(o.ev.name)}</h2><p>${esc(o.ev.about)}${nightNote(o)}</p>${note}${o.ev.slug === 'ramadan' && ramadan ? `<p><a class="btn" href="${ramadan.url}">Ramadan ${ramadan.year} timetables by city</a></p>` : ''}</section>
  ${cityLinks.length ? `<section class="card"><h2>Prayer times on ${esc(o.ev.name)} by city</h2><ul class="cities">${cityLinks.map((c) => `<li><a href="${monthUrl(c, m)}">${esc(named(c))}</a><span>${esc(countries[c.country].name)}</span></li>`).join('')}</ul><p><a href="/prayer-times/countries/">All ${listed.length} cities</a></p></section>` : ''}
  <section class="card"><h2>Questions</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
  <section class="card"><h2>More Islamic dates</h2>${yearLinks}</section>
</main>`;
    if (!linked(o)) continue;
    put(eventUrl(o), layout({
      title: `${o.ev.name} ${y}: Date and Meaning (${o.hijri.y} AH)`,
      description: `${o.ev.name} ${y} is on ${fmt(o.date)} (${hj(o.hijri)}) by the Umm al-Qura calendar. What it is, and prayer times on the day in your city.`,
      canonical: eventUrl(o),
      jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Islamic calendar', HUB], [y, yearUrl(y)], [o.ev.name, eventUrl(o)]]), faqLd(faq),
        { '@type': 'Event', name: `${o.ev.name} ${y}`, startDate: o.date, endDate: o.end || o.date, eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled', location: { '@type': 'Place', name: 'Worldwide', address: 'Worldwide' }, description: o.ev.about }],
      body,
    }));
  }

  // The hub: the next twelve months of events.
  const coming = occurrences(today, 366);
  put(HUB, layout({
    title: `Islamic Calendar ${y0}–${y0 + 1}: Upcoming Islamic Holidays and Hijri Dates`,
    description: `The next Islamic holidays: ${coming.slice(0, 4).map((o) => `${o.ev.name} ${fmt(o.date, { weekday: undefined })}`).join(', ')}, by the Umm al-Qura calendar, with every Hijri month date.`,
    canonical: HUB,
    jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Islamic calendar', HUB]])],
    body: `
<main class="wrap">
  <p class="crumbs"><a href="/prayer-times/">Prayer times</a> › Islamic calendar</p>
  <section class="hero"><h1>Islamic Calendar</h1><p class="sub">Upcoming Islamic holidays and Hijri dates</p></section>
  <section class="card"><h2>The next twelve months</h2>${table(coming)}${note}</section>
  <section class="card"><h2>By year</h2>${yearLinks}<p><a href="/prayer-times/countries/">Prayer times in ${listed.length} cities</a>${ramadan ? ` · <a href="${ramadan.url}">Ramadan ${ramadan.year}</a>` : ''}</p></section>
</main>`,
  }));

  return { pages, urls, coming };
}
