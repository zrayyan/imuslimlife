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
import fs from 'node:fs';
import path from 'node:path';
import { LANGS, LANG_COUNTRIES } from './i18n.mjs';
import { cityData, embedPage, builderBody } from './widget.mjs';

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
const SITE = 'https://imuslimlife.com';
const BEACON = `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "3937a625dcce4781b04cf88f4f50fe59"}'></script><!-- End Cloudflare Web Analytics -->`;
const KAABA = { lat: 21.4225, lon: 39.8262 };
const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
// Where Muslim Companion (the Alexa skill) is available; elsewhere the pages point to the app.
const SKILL_COUNTRIES = new Set(['us', 'ca', 'uk', 'in', 'au', 'sa']);
const ALL_LANGS = ['en', ...Object.keys(LANG_COUNTRIES)];

const readJson = (file, fallback) => (fs.existsSync(path.join(HERE, file)) ? JSON.parse(fs.readFileSync(path.join(HERE, file), 'utf8')) : fallback);
const { countries, cities } = readJson('cities.json');
// Other spellings people search for (aliases.json): shown in English as "Makkah (Mecca)".
const ALIASES = readJson('aliases.json', {});
// City, region and country names in the page languages (names.json, from GeoNames).
const NAMES = readJson('names.json', { cities: {}, regions: {}, countries: {} });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const key = (c) => `${c.country}/${c.slug}`;
const langsOf = (cc) => ['en', ...Object.keys(LANG_COUNTRIES).filter((l) => LANG_COUNTRIES[l].includes(cc))];
const pre = (L) => (L === 'en' ? '' : `/${L}`);
const cityUrl = (c, L = 'en') => `${pre(L)}/prayer-times/${c.country}/${c.slug}/`;
const monthUrl = (c, m, L = 'en') => `${cityUrl(c, L)}${MONTHS[m - 1]}/`;
const countryUrl = (cc, L = 'en') => `${pre(L)}/prayer-times/${cc}/`;
const countriesUrl = (L = 'en') => `${pre(L)}/prayer-times/countries/`;
const rootUrl = (L) => (L === 'en' ? '/prayer-times/' : countriesUrl(L));

// Names in a language (English: the list's names; "named" adds the alias).
const cname = (c, L) => (L === 'en' ? c.name : NAMES.cities[key(c)]?.[L] || c.name);
const named = (c, L = 'en') => (L === 'en' && ALIASES[key(c)] ? `${c.name} (${ALIASES[key(c)]})` : cname(c, L));
const rname = (c, L) => (!c.region ? '' : L === 'en' ? c.region : NAMES.regions[`${c.country}/${c.region}`]?.[L] || c.region);
const kname = (cc, L) => (L === 'en' ? countries[cc].name : NAMES.countries[cc]?.[L] || countries[cc].name);
const mname = (cc, L) => LANGS[L].methods[countries[cc].params.method] || countries[cc].methodName;
const aname = (cc, L) => (L === 'en' ? countries[cc].asrName : LANGS[L].asr[countries[cc].params.school ? 1 : 0]);
const sep = (L) => (LANGS[L].dir === 'rtl' ? '، ' : ', ');
const place = (c, L) => (c.region ? `${cname(c, L)}${sep(L)}${rname(c, L)}` : cname(c, L));

// Share image per city (made once by og-images.mjs); the logo where there is none.
const ogImage = (c) => {
  const rel = `/prayer-times/og/${c.country}-${c.slug}.jpg`;
  return fs.existsSync(path.join(OUT, rel)) ? rel : null;
};

const hhmm = (s) => String(s).match(/\d{1,2}:\d{2}/)?.[0] || '';
// A time in a language: 12-hour with AM/PM (or ص/م) where the language uses it, else 24-hour.
function clock(s, L) {
  const [h, m] = hhmm(s).split(':').map(Number);
  if (Number.isNaN(h)) return { t: '—', suffix: '' };
  const { clock: c, ampm } = LANGS[L];
  if (c === 24) return { t: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, suffix: '' };
  return { t: `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`, suffix: ampm?.[h < 12 ? 0 : 1] || '' };
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const monthName = (m, L = 'en') => (L === 'en' ? cap(MONTHS[m - 1]) : new Intl.DateTimeFormat(LANGS[L].locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m - 1, 15))));
const hijri = (h, L) => {
  const map = LANGS[L].hijri;
  const p = map && String(h).match(/^(\d+) (.+) (\d+)$/);
  return p && map[p[2]] ? `${p[1]} ${map[p[2]]} ${p[3]}` : h;
};
const dateIn = (iso, L, opts) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(LANGS[L].locale, { timeZone: 'UTC', ...opts });

function todayIn(tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month) };
}
// The occurrence each month page shows: this year's if the month hasn't ended yet, else next year's.
const yearFor = (m, now) => (m >= now.m ? now.y : now.y + 1);

const rad = (d) => (d * Math.PI) / 180;
function qibla(lat, lon) {
  const [φ1, φ2, Δλ] = [rad(lat), rad(KAABA.lat), rad(KAABA.lon - lon)];
  return ((Math.atan2(Math.sin(Δλ), Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ)) * 180) / Math.PI + 360) % 360;
}
function distanceKm(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const compass = (deg, L) => LANGS[L].points[Math.round(deg / 22.5) % 16];
const KM = { ar: 'كم', ur: 'کلومیٹر' };
const fmtDistance = (km, cc, L) => (L === 'en' && (cc === 'us' || cc === 'uk')
  ? `${Math.round(km * 0.621371).toLocaleString('en-US')} miles`
  : `${Math.round(km).toLocaleString(L === 'en' ? 'en-US' : LANGS[L].locale)} ${KM[L] || 'km'}`);

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
      const days = (json.days || []).map((d) => ({
        date: d.date,
        hijri: d.hijri ? `${Number(d.hijri.day)} ${d.hijri.month?.en} ${d.hijri.year}` : '',
        t: Object.fromEntries(PRAYERS.map((p) => [p, hhmm(d.timings?.[p])])),
      }));
      if (days.length < 28 || days.some((d) => PRAYERS.some((p) => !d.t[p]))) throw new Error('incomplete month');
      return { y, m, days };
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

let listed = cities; // the cities that have pages; set before anything is rendered
let ramadan = null; // the coming Ramadan (from Makkah's Umm al-Qura dates); set before rendering
const inLang = (L) => listed.filter((c) => langsOf(c.country).includes(L));
const countriesIn = (L) => Object.entries(countries).filter(([cc]) => inLang(L).some((c) => c.country === cc));
const listedCountries = () => countriesIn('en');
function footerCountries(L) {
  return countriesIn(L)
    .map(([cc]) => [cc, inLang(L).filter((x) => x.country === cc).length])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

const RTL_FONT = 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600&display=swap';

function layout({ L = 'en', title, description, canonical, alternates = [], jsonLd, body, image = null }) {
  const T = LANGS[L];
  const hreflang = alternates.length > 1
    ? `\n${alternates.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${u}">`).join('\n')}\n<link rel="alternate" hreflang="x-default" href="${SITE}${alternates[0][1]}">`
    : '';
  const switcher = alternates.length > 1
    ? `\n<nav class="langs wrap" aria-label="Language">${alternates.map(([l, u]) => (l === L ? `<b lang="${l}">${LANGS[l].label}</b>` : `<a href="${u}" lang="${l}" hreflang="${l}">${LANGS[l].label}</a>`)).join(' · ')}</nav>`
    : '';
  const rtlFont = T.dir === 'rtl' ? `\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="${RTL_FONT}" rel="stylesheet" media="print" onload="this.media='all'">` : '';
  return `<!DOCTYPE html>
<html lang="${L}"${T.dir === 'rtl' ? ' dir="rtl"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">${hreflang}
<meta property="og:type" content="website">
<meta property="og:site_name" content="iMuslim Life">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}${image || '/logo512.png'}">${image ? '\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">' : ''}
<meta name="theme-color" content="#006400">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/prayer-times/cities.css">${rtlFont}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLd }).replace(/</g, '\\u003c')}</script>
${BEACON}
</head>
<body>
<header class="bar">
  <div class="wrap bar-in">
    <a class="brand" href="/" dir="ltr"><span aria-hidden="true">🕋</span> i<b>Muslim</b> Life</a>
    <nav><a href="/prayer-times/">${T.nav.times}</a><a href="${countriesUrl(L)}">${T.nav.cities}</a><a href="/quran/">${T.nav.quran}</a><a href="/alexa-athan/">${T.nav.alexa}</a></nav>
  </div>
</header>${switcher}
${body}
<footer class="foot wrap">
  <p><a href="/">iMuslim Life</a> · ${ramadan ? `<a href="${ramadan.url}">${T.foot.ramadan(ramadan.year)}</a> · ` : ''}${footerCountries(L).map(([cc]) => `<a href="${countryUrl(cc, L)}">${esc(kname(cc, L))}</a>`).join(' · ')} · <a href="${countriesUrl(L)}">${T.foot.all}</a></p>
  <p><a href="/widget/">${T.foot.widget}</a> · <a href="/privacy-policy/">${T.foot.privacy}</a> · <a href="/terms/">${T.foot.terms}</a> · ${T.foot.adfree} · ${T.foot.data} <a href="https://www.geonames.org/" rel="noopener">GeoNames</a> (CC BY 4.0)</p>
</footer>
</body>
</html>
`;
}

const breadcrumb = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${url}` })),
});
const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

function monthTable(month, caption, L) {
  const T = LANGS[L];
  return `<table class="tt">
<caption>${esc(caption)}</caption>
<thead><tr><th scope="col">${T.date}</th>${PRAYERS.map((p) => `<th scope="col">${T.prayers[p]}</th>`).join('')}</tr></thead>
<tbody>${month.days.map((d) => {
    const label = dateIn(d.date, L, { weekday: 'short', day: 'numeric' });
    const ram = /^\d+ Ramadan /.test(d.hijri) ? ' class="ramadan"' : '';
    return `<tr data-date="${d.date}"${ram}><th scope="row">${label}<small>${esc(hijri(d.hijri, L))}</small></th>${PRAYERS.map((p) => {
      const { t, suffix } = clock(d.t[p], L);
      return `<td>${t}${suffix ? `<i> ${suffix}</i>` : ''}</td>`;
    }).join('')}</tr>`;
  }).join('')}</tbody>
</table>`;
}

const ramadanDays = (month) => month.days.filter((d) => /^\d+ Ramadan /.test(d.hijri));

function ctaCard(city, L) {
  const T = LANGS[L].cta;
  return SKILL_COUNTRIES.has(city.country) && T.skill
    ? `<section class="card cta noprint"><h2>${T.skillH}</h2><p>${T.skill}</p><p class="btns"><a class="btn" href="/alexa-athan/">${T.skillBtn}</a><a class="btn alt" href="/mobile-app/">${T.appBtn}</a></p></section>`
    : `<section class="card cta noprint"><h2>${T.appH}</h2><p>${T.app}</p><p class="btns"><a class="btn" href="/mobile-app/">${T.appBtn}</a></p></section>`;
}

function monthLinks(city, now, current, L) {
  return `<ul class="months">${MONTHS.map((_, i) => {
    const m = i + 1;
    return `<li${m === current ? ' class="is-current"' : ''}><a href="${monthUrl(city, m, L)}">${monthName(m, L)} <span>${yearFor(m, now)}</span></a></li>`;
  }).join('')}</ul>`;
}

function nearbyCities(city, L) {
  return inLang(L)
    .filter((c) => c !== city)
    .map((c) => ({ c, d: distanceKm(city, c) + (c.country === city.country ? 0 : 5000) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)
    .map(({ c }) => c);
}

// Runs in the browser: today's times, the next prayer and a countdown, in the city's time zone.
// D.i carries the page language's words and time format.
const CLIENT_TODAY = `(function(){
var D=JSON.parse(document.getElementById('pt-data').textContent),I=D.i;
var P=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
function now(){var p={};new Intl.DateTimeFormat('en-CA',{timeZone:D.tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});return{date:p.year+'-'+p.month+'-'+p.day,min:(+p.hour)*60+(+p.minute)+(+p.second)/60}}
function mins(s){var a=s.split(':');return +a[0]*60+(+a[1])}
function fmt(s){var a=s.split(':'),h=+a[0];if(I.clock===24)return(h<10?'0':'')+h+':'+a[1];return((h+11)%12+1)+':'+a[1]+(I.ampm&&I.ampm[0]?' '+I.ampm[h<12?0:1]:'')}
function hij(h){var m=h.match(/^(\\d+) (.+) (\\d+)$/);return m&&I.hm&&I.hm[m[2]]?m[1]+' '+I.hm[m[2]]+' '+m[3]:h}
var n=now(),i=-1;for(var k=0;k<D.days.length;k++)if(D.days[k].date===n.date)i=k;
var row=document.querySelector('tr[data-date="'+n.date+'"]');if(row)row.classList.add('is-today');
if(i<0||!document.querySelector('.today'))return;var d=D.days[i];
document.querySelectorAll('.today .slot').forEach(function(el){el.querySelector('b').textContent=fmt(d.t[el.dataset.p])});
document.getElementById('pt-date').textContent=new Date(n.date+'T12:00:00Z').toLocaleDateString(I.locale,{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})+(d.hijri?' · '+hij(d.hijri):'');
function tick(){var n2=now(),day=D.days[i],next=null,at=0,label;
if(n2.date!==n.date){location.reload();return}
for(var j=0;j<P.length;j++){if(mins(day.t[P[j]])>n2.min){next=P[j];at=mins(day.t[P[j]]);break}}
if(next){label=I.names[next]}else if(D.days[i+1]){next='Fajr';at=mins(D.days[i+1].t.Fajr)+1440;label=I.names.Fajr+' '+I.tomorrow}
document.querySelectorAll('.today .slot').forEach(function(el){el.classList.toggle('is-next',el.dataset.p===next&&label===I.names[next])});
if(!next){document.getElementById('pt-next').textContent='';return}
var left=Math.max(0,Math.round(at-n2.min)),h=Math.floor(left/60),m=left%60;
document.getElementById('pt-next').innerHTML=I.next+' <b>'+label+'</b> '+(h?I.leftH.replace('{h}',h):I.leftM).replace('{m}',m)}
tick();setInterval(tick,30000)})();`;

const clientWords = (L) => {
  const T = LANGS[L];
  return { locale: T.locale, clock: T.clock, ampm: T.ampm, names: T.prayers, hm: T.hijri, next: T.client.next, tomorrow: T.client.tomorrow, leftH: T.client.left('{h}', '{m}'), leftM: T.client.left(0, '{m}') };
};
const dataScript = (data) => `<script type="application/json" id="pt-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

function cityPage(city, cur, nxt, now, L) {
  const T = LANGS[L];
  const cc = city.country;
  const n = cname(city, L);
  const q = qibla(city.lat, city.lon);
  const deg = Math.round(q);
  const dist = fmtDistance(distanceKm(city, KAABA), cc, L);
  const curLabel = `${monthName(cur.m, L)} ${cur.y}`;
  const placeTail = `${city.region ? `${sep(L)}${rname(city, L)}` : ''}${sep(L)}${kname(cc, L)}`;
  const faq = T.city.faq(n, mname(cc, L), aname(cc, L), deg, compass(q, L), dist);
  const body = `
<main class="wrap">
  <p class="crumbs"><a href="${rootUrl(L)}">${T.root}</a> › <a href="${countryUrl(cc, L)}">${esc(kname(cc, L))}</a> › ${esc(n)}</p>
  <section class="hero">
    <h1>${esc(T.city.h1(named(city, L)))}</h1>
    <p class="sub">${city.region ? `${esc(rname(city, L))}${sep(L)}` : ''}${esc(kname(cc, L))} · <span id="pt-date">${curLabel}</span></p>
    <div class="today" aria-live="polite">${PRAYERS.map((p) => `<div class="slot" data-p="${p}"><span>${T.prayers[p]}</span><b>—</b></div>`).join('')}</div>
    <p class="next" id="pt-next">&nbsp;</p>
  </section>

  <section class="card">
    <h2>${esc(T.city.timetable(n, curLabel))}</h2>
    ${monthTable(cur, T.city.caption(place(city, L), curLabel), L)}
    <h3>${T.city.monthly}</h3>
    ${monthLinks(city, now, cur.m, L)}
  </section>

  <div class="two">
    <section class="card">
      <h2>${esc(T.city.qiblaH(n))}</h2>
      <div class="qibla"><svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true"><circle cx="50" cy="50" r="46" class="ring"/><text x="50" y="14" text-anchor="middle">N</text><g transform="rotate(${q.toFixed(1)} 50 50)"><path d="M50 14 L57 52 L50 46 L43 52 Z" class="needle"/></g><circle cx="50" cy="50" r="4" class="hub"/></svg>
      <p>${T.city.qibla(deg, compass(q, L), dist, esc(n))}</p></div>
    </section>
    <section class="card">
      <h2>${T.city.aboutH}</h2>
      <p>${T.city.about(esc(mname(cc, L)), esc(aname(cc, L)), esc(city.tz.replace(/_/g, ' ')))}</p>
    </section>
  </div>

  ${ctaCard(city, L)}

  <section class="card">
    <h2>${esc(T.city.nearby(n))}</h2>
    <ul class="cities">${nearbyCities(city, L).map((c) => `<li><a href="${cityUrl(c, L)}">${esc(named(c, L))}</a><span>${esc(rname(c, L) || kname(c.country, L))}</span></li>`).join('')}</ul>
  </section>

  <section class="card">
    <h2>${T.city.questions}</h2>
    ${faq.map(([qq, a]) => `<details><summary>${esc(qq)}</summary><p>${esc(a)}</p></details>`).join('')}
  </section>
</main>
${dataScript({ tz: city.tz, days: [...cur.days, ...nxt.days], i: clientWords(L) })}
<script>${CLIENT_TODAY}</script>`;
  return layout({
    L,
    title: T.city.title(named(city, L)),
    description: T.city.description(named(city, L), placeTail),
    canonical: cityUrl(city, L),
    alternates: langsOf(cc).map((l) => [l, cityUrl(city, l)]),
    image: ogImage(city),
    jsonLd: [breadcrumb([['iMuslim Life', '/'], [T.root, rootUrl(L)], [kname(cc, L), countryUrl(cc, L)], [n, cityUrl(city, L)]]), faqLd(faq)],
    body,
  });
}

function monthPage(city, month, now, L) {
  const T = LANGS[L];
  const cc = city.country;
  const n = cname(city, L);
  const label = `${monthName(month.m, L)} ${month.y}`;
  const ram = ramadanDays(month);
  const ramYear = ram[0]?.hijri.split(' ').pop();
  const first = month.days[0];
  const last = month.days[month.days.length - 1];
  const ramNote = ram.length ? `<p class="note">${T.month.ramNote(esc(ramYear), dateIn(ram[0].date, L, { month: 'long', day: 'numeric' }))}</p>` : '';
  const body = `
<main class="wrap">
  <p class="crumbs noprint"><a href="${rootUrl(L)}">${T.root}</a> › <a href="${countryUrl(cc, L)}">${esc(kname(cc, L))}</a> › <a href="${cityUrl(city, L)}">${esc(n)}</a> › ${monthName(month.m, L)}</p>
  <section class="card month">
    <h1>${esc(T.month.h1(named(city, L), label))}</h1>
    <p class="sub">${esc(place(city, L))}${sep(L)}${esc(kname(cc, L))} · ${esc(hijri(first.hijri, L))} – ${esc(hijri(last.hijri, L))} · ${esc(T.month.sub(mname(cc, L), aname(cc, L)))}</p>
    ${ramNote}
    <p class="noprint"><button class="btn" type="button" onclick="window.print()">${T.month.print}</button> <a class="btn alt" href="${cityUrl(city, L)}">${esc(T.month.today(n))}</a></p>
    ${monthTable(month, T.month.caption(place(city, L), label), L)}
    <p class="printnote">imuslimlife.com${monthUrl(city, month.m, L)} · ${esc(T.month.printnote(mname(cc, L)))}</p>
  </section>
  <section class="card noprint">
    <h2>${esc(T.month.others(n))}</h2>
    ${monthLinks(city, now, month.m, L)}
  </section>
  ${ctaCard(city, L)}
</main>
${dataScript({ tz: city.tz, y: month.y, m: month.m, days: month.days })}
<script>(function(){var D=JSON.parse(document.getElementById('pt-data').textContent);var p={};new Intl.DateTimeFormat('en-CA',{timeZone:D.tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});var r=document.querySelector('tr[data-date="'+p.year+'-'+p.month+'-'+p.day+'"]');if(r)r.classList.add('is-today')})();</script>`;
  return layout({
    L,
    title: T.month.title(named(city, L), label, ram.length > 0),
    description: T.month.description(n, label, ram.length ? ramYear : null),
    canonical: monthUrl(city, month.m, L),
    alternates: langsOf(cc).map((l) => [l, monthUrl(city, month.m, l)]),
    image: ogImage(city),
    jsonLd: [breadcrumb([['iMuslim Life', '/'], [T.root, rootUrl(L)], [kname(cc, L), countryUrl(cc, L)], [n, cityUrl(city, L)], [label, monthUrl(city, month.m, L)]])],
    body,
  });
}

function countryPage(cc, L) {
  const T = LANGS[L];
  const list = inLang(L).filter((c) => c.country === cc);
  const k = kname(cc, L);
  const body = `
<main class="wrap">
  <p class="crumbs"><a href="${rootUrl(L)}">${T.root}</a> › <a href="${countriesUrl(L)}">${T.countriesCrumb}</a> › ${esc(k)}</p>
  <section class="hero"><h1>${esc(T.country.h1(k))}</h1>
  <p class="sub">${esc(T.country.sub(mname(cc, L), aname(cc, L)))}</p></section>
  <section class="card"><h2>${T.country.cities}</h2>
  <ul class="cities">${list.map((c) => `<li><a href="${cityUrl(c, L)}">${esc(named(c, L))}</a><span>${esc(rname(c, L))}</span></li>`).join('')}</ul></section>
  <section class="card"><h2>${T.country.others}</h2><p><a href="${countriesUrl(L)}">${T.country.all(countriesIn(L).length, inLang(L).length)}</a></p></section>
</main>`;
  return layout({
    L,
    title: T.country.title(k, list.slice(0, list.length > 2 ? 3 : 2).map((c) => cname(c, L)), list.length > 2),
    description: T.country.description(k, list.length, mname(cc, L)),
    canonical: countryUrl(cc, L),
    alternates: langsOf(cc).map((l) => [l, countryUrl(cc, l)]),
    jsonLd: [breadcrumb([['iMuslim Life', '/'], [T.root, rootUrl(L)], [k, countryUrl(cc, L)]])],
    body,
  });
}

function countriesPage(L) {
  const T = LANGS[L];
  const list = countriesIn(L);
  const cs = inLang(L);
  const body = `
<main class="wrap">
  <p class="crumbs"><a href="${rootUrl(L)}">${T.root}</a> › ${T.countriesCrumb}</p>
  <section class="hero"><h1>${T.countries.h1}</h1><p class="sub">${T.countries.sub(cs.length, list.length)}</p></section>
  ${list.map(([cc]) => `<section class="card"><h2><a href="${countryUrl(cc, L)}">${esc(kname(cc, L))}</a></h2><ul class="cities">${cs.filter((x) => x.country === cc).map((x) => `<li><a href="${cityUrl(x, L)}">${esc(named(x, L))}</a></li>`).join('')}</ul></section>`).join('\n  ')}
</main>`;
  return layout({
    L,
    title: T.countries.title(cs.length),
    description: T.countries.description(cs.length, list.length),
    canonical: countriesUrl(L),
    alternates: ALL_LANGS.map((l) => [l, countriesUrl(l)]),
    jsonLd: [breadcrumb([['iMuslim Life', '/'], [T.root, rootUrl(L)], [T.countriesCrumb, countriesUrl(L)]])],
    body,
  });
}

const longDate = (iso, opts = {}) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC', ...opts });

// The Ramadan hub (English).
function ramadanPage() {
  const { year, hijriYear, start, eid, oddNights, firstTaraweeh } = ramadan;
  const ramadanMonths = (c) => {
    const d = data.get(c);
    if (!d) return [];
    return d.months.slice(1).filter((mo) => ramadanDays(mo).length && String(mo.y) === year || ramadanDays(mo).some((x) => x.date.startsWith(year)));
  };
  const faq = [
    [`When does Ramadan ${year} start?`, `By the calculated Umm al-Qura calendar, Ramadan ${hijriYear} begins on ${longDate(start)}, so the first Taraweeh is on the evening of ${longDate(firstTaraweeh, { weekday: undefined })} and the first fast that day. The actual start depends on the moon sighting your community follows and can be a day later.`],
    ...(eid ? [[`When is Eid al-Fitr ${year}?`, `By the same calendar, Eid al-Fitr is on ${longDate(eid)}, depending on the sighting of the Shawwal moon.`]] : []),
    ['What time is Suhoor and Iftar in my city?', 'Suhoor ends at Fajr and Iftar is at Maghrib. Choose your city below for the full Ramadan timetable with both times for every day.'],
  ];
  const body = `
<main class="wrap">
  <p class="crumbs"><a href="/prayer-times/">Prayer times</a> › Ramadan ${year}</p>
  <section class="hero">
    <h1>Ramadan ${year} (${hijriYear} AH)</h1>
    <p class="sub">Expected dates, Suhoor and Iftar times, and Ramadan timetables for ${listed.length} cities</p>
    <div class="today ramadan-dates">
      <div class="slot"><span>Ramadan begins</span><b>${longDate(start, { weekday: 'short', year: undefined })}</b></div>
      ${eid ? `<div class="slot"><span>Eid al-Fitr</span><b>${longDate(eid, { weekday: 'short', year: undefined })}</b></div>` : ''}
      <div class="slot"><span>First Taraweeh</span><b>${longDate(firstTaraweeh, { weekday: 'short', year: undefined })}</b></div>
    </div>
    <p class="next" id="rm-count" data-start="${start}">&nbsp;</p>
  </section>

  <section class="card">
    <h2>Expected dates</h2>
    <p>By the calculated Umm al-Qura calendar, the first day of Ramadan ${hijriYear} is <b>${longDate(start)}</b>${eid ? ` and Eid al-Fitr is <b>${longDate(eid)}</b>` : ''}. The month begins with the sighting of the new moon, so where your community follows a local sighting, Ramadan and Eid may begin a day later. Each city's timetable below shows its own calculated Hijri dates.</p>
    <p class="note">Taraweeh is prayed on the night before each fast: the first Taraweeh is on the evening of ${longDate(firstTaraweeh, { weekday: undefined })}.</p>
  </section>

  <section class="card">
    <h2>Suhoor and Iftar</h2>
    <p><b>Suhoor</b>, the meal before dawn, ends at <b>Fajr</b>. <b>Iftar</b>, breaking the fast, is at <b>Maghrib</b>. Both times change a little every day; your city's Ramadan timetable lists them for the whole month, and the timetables print on one page.</p>
  </section>

  <section class="card">
    <h2>The last ten nights</h2>
    <p>Laylat al-Qadr is sought in the odd nights of the last ten. Each night begins at Maghrib on the evening before the day:</p>
    <ul class="cities">${oddNights.map((n) => `<li><b>Night ${n.night}</b><span>evening of ${longDate(n.date, { year: undefined })}</span></li>`).join('')}</ul>
  </section>

  ${listedCountries().map(([cc, c]) => `<section class="card"><h2><a href="${countryUrl(cc)}">Ramadan timetable ${year}: ${esc(c.name)}</a></h2><ul class="cities">${listed.filter((x) => x.country === cc).map((x) => {
    const mos = ramadanMonths(x);
    return `<li><a href="${mos[0] ? monthUrl(x, mos[0].m) : cityUrl(x)}">${esc(named(x))}</a><span>${mos.map((mo) => `<a href="${monthUrl(x, mo.m)}">${monthName(mo.m)}</a>`).join(' · ')}</span></li>`;
  }).join('')}</ul></section>`).join('\n  ')}

  <section class="card cta"><h2>Ramadan on your Echo and iPhone</h2><p>Muslim Companion's Ramadan mode reminds you before Suhoor ends, announces Iftar with the Maghrib Athan and plays Taraweeh from Makkah. The Salat-e-Mustaqeem app brings the same times to your iPhone.</p><p class="btns"><a class="btn" href="/alexa-athan/ramadan/">Ramadan on Alexa</a><a class="btn alt" href="/mobile-app/">Get the app</a></p></section>

  <section class="card"><h2>Questions</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
</main>
<script>(function(){var el=document.getElementById('rm-count'),s=new Date(el.dataset.start+'T00:00:00'),d=Math.ceil((s-new Date())/864e5);if(d>1)el.innerHTML='<b>'+d+' days</b> until Ramadan';else if(d===1)el.innerHTML='Ramadan begins <b>tomorrow</b>';})();</script>`;
  return layout({
    title: `Ramadan ${year}: Dates, Suhoor & Iftar Times for ${listed.length} Cities`,
    description: `Ramadan ${year} (${hijriYear} AH) is expected to begin on ${longDate(start, { weekday: undefined })}${eid ? ` with Eid al-Fitr on ${longDate(eid, { weekday: undefined })}` : ''}. Suhoor and Iftar timetables for ${listed.length} cities, printable.`,
    canonical: ramadan.url,
    jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Prayer times', '/prayer-times/'], [`Ramadan ${year}`, ramadan.url]]), faqLd(faq)],
    body,
  });
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

// The coming Ramadan, by the calculated Umm al-Qura calendar (Makkah's embedded months):
// first day, Eid al-Fitr and the odd nights of the last ten. Cities may differ by a day.
{
  const makkah = [...data].find(([c]) => c.country === 'sa' && c.slug === 'makkah')?.[1];
  const today = new Date().toISOString().slice(0, 10);
  const days = makkah ? makkah.months.slice(1).flatMap((mo) => mo.days).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const hd = (d) => d.hijri.match(/^(\d+) (\S.*) (\d+)$/) || [];
  const startIdx = days.findIndex((d) => d.date >= today && hd(d)[1] === '1' && hd(d)[2] === 'Ramadan');
  const ongoing = days.findIndex((d) => d.date === today && hd(d)[2] === 'Ramadan');
  const from = ongoing > -1 ? days.findIndex((d) => hd(d)[2] === 'Ramadan') : startIdx;
  if (from > -1) {
    const start = days[from];
    const eid = days.slice(from).find((d) => hd(d)[1] === '1' && hd(d)[2] === 'Shawwal');
    const year = start.date.slice(0, 4);
    const evening = (n) => {
      const d = days.slice(from).find((x) => hd(x)[1] === String(n - 1) && hd(x)[2] === 'Ramadan');
      return d && { night: n, date: d.date };
    };
    ramadan = {
      year, hijriYear: hd(start)[3], start: start.date, eid: eid?.date, url: `/ramadan/${year}/`,
      oddNights: [21, 23, 25, 27, 29].map(evening).filter(Boolean),
      firstTaraweeh: days[from - 1]?.date,
    };
  }
}

// Pass 2: pages, in every language of each city. Link only to cities that are ready now or
// already have a page.
listed = cities.filter((c) => data.has(c) || fs.existsSync(outFile(cityUrl(c))));
for (const [city, { now, months }] of data) {
  for (const L of langsOf(city.country)) {
    writeIfChanged(outFile(cityUrl(city, L)), cityPage(city, months[now.m], months[(now.m % 12) + 1], now, L));
    for (let m = 1; m <= 12; m++) writeIfChanged(outFile(monthUrl(city, m, L)), monthPage(city, months[m], now, L));
  }
}
for (const L of ALL_LANGS) {
  for (const [cc] of countriesIn(L)) writeIfChanged(outFile(countryUrl(cc, L)), countryPage(cc, L));
  writeIfChanged(outFile(countriesUrl(L)), countriesPage(L));
}
if (ramadan) writeIfChanged(outFile(ramadan.url), ramadanPage());
writeIfChanged(path.join(OUT, 'prayer-times', 'cities.css'), fs.readFileSync(path.join(HERE, 'cities.css'), 'utf8'));

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

const month = new Date().toISOString().slice(0, 7);
const built = (c) => data.has(c) || fs.existsSync(outFile(monthUrl(c, 1)));
const urls = [
  '/widget/',
  ...(ramadan ? [ramadan.url] : []),
  ...ALL_LANGS.flatMap((L) => [countriesUrl(L), ...countriesIn(L).map(([cc]) => countryUrl(cc, L))]),
  ...listed.filter(built).flatMap((c) => langsOf(c.country).flatMap((L) => [cityUrl(c, L), ...MONTHS.map((_, i) => monthUrl(c, i + 1, L))])),
];
writeIfChanged(path.join(OUT, 'sitemap-cities.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${month}-01</lastmod></url>`).join('\n')}
</urlset>
`);

console.log(`city-pages: ${data.size}/${cities.length} cities built (${fetched} months fetched, ${outOfBudget} left for the next run), ${listed.length} listed, ${changed} files changed, ${urls.length} URLs, out ${OUT}`);
if (failed.length) {
  console.error(`city-pages: kept the previous pages for ${failed.length} cities:\n  ${failed.join('\n  ')}`);
  process.exitCode = failed.length > 50 ? 1 : 0;
}
