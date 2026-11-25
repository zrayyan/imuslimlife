// City prayer-time pages for imuslimlife.com (pilot 2026-10-20; 500 cities + month pages;
// alternate names, share images, Ramadan hub; Arabic, Urdu, Indonesian and Malay, all 2026-10-20).
//
//   node build.mjs --out <site root> [--full]
//
// For every city in cities.json (made by make-list.mjs) it writes:
//   /prayer-times/<country>/<city>/          today, next prayer, this month's timetable, Qibla
//   /prayer-times/<country>/<city>/<month>/  12 month pages with no year in the URL; each shows
//                                            the current or next occurrence of that month
// plus one page per country, /prayer-times/countries/, /ramadan/<year>/, cities.css and
// sitemap-cities.xml. Cities in the countries of i18n.mjs LANG_COUNTRIES also get the same
// pages under /<lang>/prayer-times/... (ar, ur, id, ms), linked with hreflang.
//
// Times come from the API the app uses (/v1/calendar, read-only), gently: one request at
// a time, CITY_PAGES_INTERVAL_MS apart (default 2,500), at most CITY_PAGES_BUDGET requests
// per run (default 6,600). Month pages already holding the right year are reused (the
// English page's embedded data is the cache), so after the first build a night costs
// nothing except on the 1st of a month, when each city's finished month rolls to next
// year (~500 calls). A run that hits the budget carries on the next night; pages, lists
// and the sitemap only link to cities that have pages. --full refetches everything.
// "Today", the next prayer and the countdown are worked out in the browser.
// 2026-10-20: an unpaced first build (3 parallel, ~10 req/s) crashed prayer-api twice;
// see docs/INCIDENT_PRAYER_API_OOM_CITY_PAGES_BUILD_2026-10-20.md.
// Masjid pages (masjids.mjs, 2026-10-20): /masjids/** from osm-masjids.json, approved
// additions (1 request) and Masjid Connect (1 + one request per masjid), same pacing, own
// cap MASJID_CONNECT_MAX (default 50), so a 0-budget publish still lists them.
import fs from 'node:fs';
import path from 'node:path';
import { LANGS, LANG_COUNTRIES } from './i18n.mjs';
import { cityData, embedPage, builderBody } from './widget.mjs';
import { METHODS } from './methods.mjs';
import { buildQibla } from './qibla.mjs';
import { monthFacts, hm } from './month-facts.mjs';
import { MONTH_TEXT } from './month-i18n.mjs';
import { aboutPages } from './about.mjs';
import { citiesSkyCss } from '../sky/cities-sky.mjs';
import { buildCalendar, occurrences, eventUrl, hubUrl, HIJRI_MONTHS } from './calendar.mjs';
import { loadMasjids, loadMasjidAdditions, loadMasjidConnect, buildMasjids } from './masjids.mjs';
import { cityPagesUrls, citySitemap } from './sitemap.mjs';
import { createSite, parseMonth, computeRamadan, SITE, BEACON, KAABA, PRAYERS, MONTHS, SKILL_COUNTRIES, ALL_LANGS } from './render.mjs';

const HERE = import.meta.dirname;
const arg = (name) => process.argv.includes(name);
const outArg = process.argv.indexOf('--out');
const OUT = path.resolve(outArg > -1 ? process.argv[outArg + 1] : path.join(HERE, '../../build'));
const FULL = arg('--full');
const API = process.env.CITY_PAGES_API || 'https://node-api.imuslimlife.com/v1/calendar';
const INTERVAL_MS = Number(process.env.CITY_PAGES_INTERVAL_MS || 2500);
let budget = Number(process.env.CITY_PAGES_BUDGET || 6600);
let lastRequest = 0;
async function pace() {
  const wait = lastRequest + INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

const readJson = (file, fallback) => (fs.existsSync(path.join(HERE, file)) ? JSON.parse(fs.readFileSync(path.join(HERE, file), 'utf8')) : fallback);
const { countries, cities } = readJson('cities.json');
// Other spellings people search for (aliases.json): shown in English as "Makkah (Mecca)".
const ALIASES = readJson('aliases.json', {});
// City, region and country names in the page languages (names.json, from GeoNames).
const NAMES = readJson('names.json', { cities: {}, regions: {}, countries: {} });
const site = createSite({ countries, cities, ALIASES, NAMES, today: new Date().toISOString().slice(0, 10),
  hasOg: (rel) => fs.existsSync(path.join(OUT, rel)) });
const { esc, key, langsOf, pre, cityUrl, monthUrl, countryUrl, countriesUrl, rootUrl, cname, named, rname, kname, mname, aname, sep, place, ogImage, hhmm, clock, cap, monthName, hijri, dateIn, todayIn, yearFor, rad, qibla, distanceKm, compass, KM, fmtDistance, inLang, countriesIn, listedCountries, footerCountries, RTL_FONT, layout, breadcrumb, faqLd, monthTable, ramadanDays, ctaCard, monthLinks, nearbyCities, CLIENT_TODAY, clientWords, calcCard, TODAY, upcoming, eventsCard, calcData, CLIENT_CALC, calcScripts, dataScript, cityPage, monthPage, countryPage, countriesPage, longDate, ramadanPage } = site;
let listed = cities;
let masjidDir = null;
let ramadan = null;
async function fetchMonth(city, y, m) {
  const params = new URLSearchParams({ latitude: city.lat, longitude: city.lon, timezonestring: city.tz, ...countries[city.country].params });
  const url = `${API}/${y}/${m}?${params}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await pace();
      budget--;
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return parseMonth(json, y, m);
    } catch (err) {
      if (attempt === 3) throw new Error(`${city.country}/${city.slug} ${y}-${m}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 10000 * attempt));
    }
  }
}

// A month page's embedded data (English page), reused when it is already for the right year.
function existingMonth(file, y, m) {
  if (FULL || !fs.existsSync(file)) return null;
  const json = fs.readFileSync(file, 'utf8').match(/<script type="application\/json" id="pt-data">(.*?)<\/script>/s)?.[1];
  if (!json) return null;
  const data = JSON.parse(json);
  return data.y === y && data.m === m && data.days?.length >= 28 ? { y, m, days: data.days } : null;
}

let changed = 0;
function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  changed++;
}
const outFile = (url) => path.join(OUT, url.slice(1), 'index.html');

// Pass 1: each city's 12 months: reuse month pages that already hold the right year,
// fetch the rest while the budget lasts. Pilot cities first, then by size.
const order = [...cities].sort((a, b) => (a.muslims ?? Infinity) > (b.muslims ?? Infinity) ? -1 : 1);
const data = new Map();
const failed = [];
let fetched = 0;
let outOfBudget = 0;
for (const city of order) {
  const now = todayIn(city.tz);
  const months = [];
  try {
    for (let m = 1; m <= 12; m++) {
      const y = yearFor(m, now);
      months[m] = existingMonth(outFile(monthUrl(city, m)), y, m);
      if (!months[m]) {
        if (budget <= 0) throw Object.assign(new Error('budget'), { budget: true });
        months[m] = await fetchMonth(city, y, m);
        fetched++;
      }
    }
    data.set(city, { now, months });
  } catch (err) {
    if (err.budget) outOfBudget++;
    else failed.push(err.message);
  }
  if (fetched && fetched % 300 === 0) console.log(`city-pages: ${fetched} months fetched, ${data.size} cities ready`);
}

// The coming Ramadan, from Makkah's months (computeRamadan in render.mjs).
ramadan = computeRamadan([...data].find(([c]) => c.country === 'sa' && c.slug === 'makkah')?.[1]?.months, new Date().toISOString().slice(0, 10));

// Pass 2: pages, in every language of each city. Link only to cities that are ready now or
// already have a page.
site.set({ ramadan, data });
listed = cities.filter((c) => data.has(c) || fs.existsSync(outFile(cityUrl(c))));
site.set({ listed });
{
  let connectLeft = Number(process.env.MASJID_CONNECT_MAX || 50);
  const get = async (url) => {
    if (connectLeft-- <= 0) throw new Error('MASJID_CONNECT_MAX reached');
    await pace();
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  const base = API.replace(/\/calendar$/, '');
  const additions = await loadMasjidAdditions(get, base);
  const connect = await loadMasjidConnect(get, base);
  masjidDir = buildMasjids({ osm: loadMasjids(HERE), additions, connect, layout, esc, breadcrumb, qibla, compass, distanceKm, cityUrl, named, listed, SITE });
  site.set({ masjidDir });
  for (const [url, html] of masjidDir.pages) writeIfChanged(outFile(url), html);
  writeIfChanged(path.join(OUT, 'masjids', 'index.json'), `${JSON.stringify(masjidDir.index)}\n`);
}
for (const [city, { now, months }] of data) {
  for (const L of langsOf(city.country)) {
    writeIfChanged(outFile(cityUrl(city, L)), cityPage(city, months[now.m], months[(now.m % 12) + 1], now, L, months));
    for (let m = 1; m <= 12; m++) writeIfChanged(outFile(monthUrl(city, m, L)), monthPage(city, months[m], now, L));
  }
}
for (const L of ALL_LANGS) {
  for (const [cc] of countriesIn(L)) writeIfChanged(outFile(countryUrl(cc, L)), countryPage(cc, L));
  writeIfChanged(outFile(countriesUrl(L)), countriesPage(L));
}
if (ramadan) writeIfChanged(outFile(ramadan.url), ramadanPage());
// The Islamic calendar hub (calendar.mjs, 2026-11-02), in every page language.
const calendar = buildCalendar({
  LANGS, langs: ALL_LANGS, layout, esc, breadcrumb, faqLd, inLang, countries, cityUrl, monthUrl, named, kname, countriesUrl, rootUrl, ramadan,
  monthYearShown: (c, m) => yearFor(m, todayIn(c.tz)),
  today: TODAY,
});
for (const [url, html] of calendar.pages) writeIfChanged(outFile(url), html);
// Qibla direction pages (qibla.mjs, 2026-11-06): one per city and country, no API requests.
const qiblaPages = buildQibla({ listed, langsOf, ALL_LANGS, countriesIn, layout, esc, breadcrumb, qibla, compass, distanceKm, fmtDistance, named, kname, cityUrl, KAABA, SITE });
for (const [url, html] of qiblaPages.pages) writeIfChanged(outFile(url), html);
writeIfChanged(path.join(OUT, 'prayer-times', 'cities.css'), fs.readFileSync(path.join(HERE, 'cities.css'), 'utf8'));
writeIfChanged(path.join(OUT, 'prayer-times', 'cities-sky.css'), citiesSkyCss(fs.readFileSync(path.join(HERE, 'cities.css'), 'utf8')));
writeIfChanged(path.join(OUT, 'prayer-times', 'calc.js'), fs.readFileSync(path.join(HERE, 'calc.js'), 'utf8'));

// The masjid widget (widget.mjs): a data file per city, the city index, the embed and builder pages.
for (const [city, { now, months }] of data) {
  const langs = langsOf(city.country);
  writeIfChanged(path.join(OUT, 'prayer-times', 'data', `${city.country}-${city.slug}.json`), cityData({
    city, now, months, langs, SITE,
    names: Object.fromEntries(langs.map((l) => [l, named(city, l)])),
    country: Object.fromEntries(langs.map((l) => [l, kname(city.country, l)])),
    urls: Object.fromEntries(langs.map((l) => [l, cityUrl(city, l)])),
  }));
}
writeIfChanged(path.join(OUT, 'prayer-times', 'data', 'index.json'), `${JSON.stringify(listed.filter((c) => fs.existsSync(path.join(OUT, 'prayer-times', 'data', `${c.country}-${c.slug}.json`)))
  .map((c) => ({ k: key(c), n: named(c), country: countries[c.country].name, tz: c.tz, u: cityUrl(c), langs: langsOf(c.country) }))
  .sort((a, b) => a.country.localeCompare(b.country) || a.n.localeCompare(b.n)))}\n`);
writeIfChanged(outFile('/widget/embed/'), embedPage({ BEACON }));
writeIfChanged(outFile('/widget/'), layout({
  title: 'Free Prayer Times Widget for Masjid Websites | iMuslim Life',
  description: `Add today's prayer times, the next prayer and the Hijri date to your masjid's website: a free widget for ${listed.length} cities in English, Arabic, Urdu, Indonesian and Malay. No ads, no account.`,
  canonical: '/widget/',
  jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Prayer times', '/prayer-times/'], ['Widget', '/widget/']])],
  body: builderBody(),
}));

// Trust pages (about.mjs, task 152 step 5).
const about = aboutPages({ layout, esc, breadcrumb, countries, listed, SITE });
for (const [url, html] of about.pages) writeIfChanged(outFile(url), html);

// The sitemap (sitemap.mjs, shared with the Worker): only pages Google should index (task 152).
const built = (c) => data.has(c) || fs.existsSync(outFile(monthUrl(c, 1)));
const urls = cityPagesUrls({ aboutUrls: about.urls, masjidDir, ramadan, calendar, qibla: qiblaPages, ALL_LANGS, countriesUrl, countriesIn, countryUrl, cities: listed.filter(built), langsOf, cityUrl, monthUrl, MONTHS });
const sitemap = citySitemap(urls, TODAY);
writeIfChanged(path.join(OUT, 'sitemap-cities.xml'), sitemap.xml);

console.log(`city-pages: ${data.size}/${cities.length} cities built (${fetched} months fetched, ${outOfBudget} left for the next run), ${listed.length} listed, ${changed} files changed, ${sitemap.count}/${urls.length} URLs in the sitemap, out ${OUT}`);
if (failed.length) {
  console.error(`city-pages: kept the previous pages for ${failed.length} cities:\n  ${failed.join('\n  ')}`);
  process.exitCode = failed.length > 50 ? 1 : 0;
}
