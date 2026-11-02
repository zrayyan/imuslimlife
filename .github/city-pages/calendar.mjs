// The Islamic calendar hub (2026-11-02): /islamic-calendar/ (the coming events),
// /islamic-calendar/<year>/ (every event and Hijri month start in a Gregorian year) and
// /islamic-calendar/<event>-<year>/ (one event: date, meaning, prayer times by city).
// Dates are the calculated Umm al-Qura calendar from Intl (islamic-umalqura), which gives
// the same Hijri date as the API for every day (checked 2026-11-02, 365 of 365 in Makkah),
// so it costs no API requests and reaches any year. Owner's choices: Umm al-Qura with a
// moon-sighting note; Mawlid and 15 Sha'ban included, worded neutrally. In every page
// language since 2026-11-02 (words in calendar-i18n.mjs).
import { CAL } from './calendar-i18n.mjs';

export const HIJRI_MONTHS = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'];

// Hijri month and day of each event; `days` spans several days; `night` events begin at
// Maghrib the evening before. Names: LANGS[L].cal.events; text: CAL[L].about (calendar-i18n.mjs).
const EVENTS = [
  { slug: 'islamic-new-year', hm: 1, hd: 1 },
  { slug: 'ashura', hm: 1, hd: 10 },
  { slug: 'mawlid', hm: 3, hd: 12 },
  { slug: 'isra-miraj', hm: 7, hd: 27, night: true },
  { slug: 'mid-shaban', hm: 8, hd: 15, night: true },
  { slug: 'ramadan', hm: 9, hd: 1 },
  { slug: 'laylat-al-qadr', hm: 9, hd: 27, night: true },
  { slug: 'eid-al-fitr', hm: 10, hd: 1 },
  { slug: 'dhul-hijjah', hm: 12, hd: 1, days: 10 },
  { slug: 'day-of-arafah', hm: 12, hd: 9 },
  { slug: 'eid-al-adha', hm: 12, hd: 10 },
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
const pre = (L) => (L === 'en' ? '' : `/${L}`);
export const hubUrl = (L = 'en') => `${pre(L)}/islamic-calendar/`;
export const eventUrl = (o, L = 'en') => `${hubUrl(L)}${o.ev.slug}-${o.date.slice(0, 4)}/`;
export const yearUrl = (y, L = 'en') => `${hubUrl(L)}${y}/`;

// Pages in every language of ALL_LANGS, linked with hreflang. City links on an event page
// go to the largest city of each country that has pages in that language.
export function buildCalendar({ LANGS, langs, layout, esc, breadcrumb, faqLd, inLang, countries, cityUrl, monthUrl, named, kname, countriesUrl, rootUrl, monthYearShown, ramadan, today }) {
  const y0 = Number(today.slice(0, 4));
  const years = [y0, y0 + 1];
  const pages = new Map();
  const urls = [];
  const put = (url, html) => { pages.set(url, html); urls.push(url); };
  const all = years.flatMap((y) => occurrences(`${y}-01-01`, daysIn(y)));
  const coming = occurrences(today, 366);
  // An event can fall twice in one Gregorian year (about every 33 years); the first one has the page.
  const firstOf = new Map();
  for (const o of all) if (!firstOf.has(eventUrl(o))) firstOf.set(eventUrl(o), o.date);
  const linked = (o) => firstOf.get(eventUrl(o)) === o.date;
  const alts = (url) => langs.map((l) => [l, url(l)]);

  for (const L of langs) {
    const T = CAL[L];
    const LT = LANGS[L];
    const name = (o) => LT.cal.events[o.ev.slug];
    const fmt = (d, opts = {}) => new Date(`${d}T12:00:00Z`).toLocaleDateString(LT.locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC', ...opts });
    const mon = (m) => (LT.hijri ? LT.hijri[HIJRI_MONTHS[m - 1]] : HIJRI_MONTHS[m - 1]);
    const hj = (h) => `${h.d} ${mon(h.m)} ${h.y} ${T.ah}`;
    const when = (o) => (o.end ? `${fmt(o.date)} – ${fmt(o.end)}` : fmt(o.date));
    const night = (o) => (o.ev.night ? T.night(fmt(addDays(o.date, -1), { year: undefined })) : '');
    const note = `<p class="note">${T.note}</p>`;
    const cs = inLang(L);
    const capitals = Object.keys(countries).map((cc) => cs.find((c) => c.country === cc)).filter(Boolean);
    const table = (occ) => `<table class="tt cal"><thead><tr>${T.th.map((t) => `<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${occ.map((o) => `<tr data-date="${o.date}"><th scope="row">${linked(o) ? `<a href="${eventUrl(o, L)}">${esc(name(o))}</a>` : esc(name(o))}</th><td>${when(o)}</td><td>${hj(o.hijri)}</td></tr>`).join('')}</tbody></table>`;
    const yearLinks = `<p>${years.map((y) => `<a class="btn alt" href="${yearUrl(y, L)}">${T.yearBtn(y)}</a>`).join(' ')}</p>`;
    const citiesLink = `<a href="${countriesUrl(L)}">${T.cities(cs.length)}</a>`;
    const big = (occ) => occ.filter((o) => ['ramadan', 'eid-al-fitr', 'eid-al-adha'].includes(o.ev.slug)).map((o) => `${name(o)} ${fmt(o.date, { weekday: undefined })}`).join(', ');

    for (const y of years) {
      const occ = all.filter((o) => o.date.startsWith(String(y)));
      const starts = monthStarts(y);
      const hy = [...new Set(starts.map((s) => s.hijri.y))].join('–');
      put(yearUrl(y, L), layout({
        L,
        title: T.yearTitle(y, hy),
        description: T.yearDesc(y, big(occ)),
        canonical: yearUrl(y, L),
        alternates: alts((l) => yearUrl(y, l)),
        jsonLd: [breadcrumb([['iMuslim Life', '/'], [T.crumb, hubUrl(L)], [String(y), yearUrl(y, L)]])],
        body: `
<main class="wrap">
  <p class="crumbs"><a href="${hubUrl(L)}">${T.crumb}</a> › ${y}</p>
  <section class="hero"><h1>${T.yearH1(y, hy)}</h1><p class="sub">${T.yearSub(y)}</p></section>
  <section class="card"><h2>${T.holidays(y)}</h2>${table(occ)}${note}</section>
  <section class="card"><h2>${T.months(y)}</h2><table class="tt cal"><thead><tr><th scope="col">${T.month}</th><th scope="col">${T.begins}</th></tr></thead><tbody>${starts.map((s) => `<tr><th scope="row">${mon(s.hijri.m)} ${s.hijri.y}</th><td>${fmt(s.date)}</td></tr>`).join('')}</tbody></table></section>
  <section class="card"><h2>${T.other}</h2>${yearLinks}<p>${citiesLink}</p></section>
</main>`,
      }));
    }

    for (const o of all) {
      if (!linked(o)) continue;
      const y = o.date.slice(0, 4);
      const m = Number(o.date.slice(5, 7));
      const n = name(o);
      // Month pages show one occurrence of each month; link the ones that show this event's.
      const cityLinks = capitals.filter((c) => monthYearShown(c, m) === Number(y));
      const faq = [[T.faqWhen(n, y), T.faqWhenA(n, y, when(o), hj(o.hijri), night(o))], [T.faqWhat(n), T.about[o.ev.slug]]];
      put(eventUrl(o, L), layout({
        L,
        title: T.evTitle(n, y, o.hijri.y),
        description: T.evDesc(n, y, fmt(o.date), hj(o.hijri)),
        canonical: eventUrl(o, L),
        alternates: alts((l) => eventUrl(o, l)),
        jsonLd: [breadcrumb([['iMuslim Life', '/'], [T.crumb, hubUrl(L)], [y, yearUrl(y, L)], [n, eventUrl(o, L)]]), faqLd(faq),
          { '@type': 'Event', name: `${n} ${y}`, inLanguage: L, startDate: o.date, endDate: o.end || o.date, eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled', location: { '@type': 'Place', name: 'Worldwide', address: 'Worldwide' }, description: T.about[o.ev.slug] }],
        body: `
<main class="wrap">
  <p class="crumbs"><a href="${hubUrl(L)}">${T.crumb}</a> › <a href="${yearUrl(y, L)}">${y}</a> › ${esc(n)}</p>
  <section class="hero"><h1>${esc(n)} ${y}</h1><p class="sub">${when(o)} · ${hj(o.hijri)}</p></section>
  <section class="card"><h2>${esc(T.aboutH(n))}</h2><p>${esc(T.about[o.ev.slug])}${night(o)}</p>${note}${o.ev.slug === 'ramadan' && ramadan ? `<p><a class="btn" href="${ramadan.url}">${T.ramadanBtn(ramadan.year)}</a></p>` : ''}</section>
  ${cityLinks.length ? `<section class="card"><h2>${esc(T.byCity(n))}</h2><ul class="cities">${cityLinks.map((c) => `<li><a href="${monthUrl(c, m, L)}">${esc(named(c, L))}</a><span>${esc(kname(c.country, L))}</span></li>`).join('')}</ul><p><a href="${countriesUrl(L)}">${T.all(cs.length)}</a></p></section>` : ''}
  <section class="card"><h2>${T.questions}</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
  <section class="card"><h2>${T.more}</h2>${yearLinks}</section>
</main>`,
      }));
    }

    // The hub: the next twelve months of events.
    put(hubUrl(L), layout({
      L,
      title: T.hubTitle(y0, y0 + 1),
      description: T.hubDesc(coming.slice(0, 4).map((o) => `${name(o)} ${fmt(o.date, { weekday: undefined })}`).join(', ')),
      canonical: hubUrl(L),
      alternates: alts(hubUrl),
      jsonLd: [breadcrumb([['iMuslim Life', '/'], [T.crumb, hubUrl(L)]])],
      body: `
<main class="wrap">
  <p class="crumbs"><a href="${rootUrl(L)}">${LT.root}</a> › ${T.crumb}</p>
  <section class="hero"><h1>${T.hubH1}</h1><p class="sub">${T.hubSub}</p></section>
  <section class="card"><h2>${T.next}</h2>${table(coming)}${note}</section>
  <section class="card"><h2>${T.byYear}</h2>${yearLinks}<p>${citiesLink}${ramadan ? ` · <a href="${ramadan.url}">${T.ramadan(ramadan.year)}</a>` : ''}</p></section>
</main>`,
    }));
  }

  return { pages, urls, coming };
}
