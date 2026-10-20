// City prayer-time pages for imuslimlife.com (pilot 2026-10-20; 500 cities + month pages 2026-10-20).
//
//   node build.mjs --out <site root> [--full]
//
// For every city in cities.json (made by make-list.mjs) it writes:
//   /prayer-times/<country>/<city>/          today, next prayer, this month's timetable, Qibla
//   /prayer-times/<country>/<city>/<month>/  12 month pages with no year in the URL; each shows
//                                            the current or next occurrence of that month
// plus one page per country, /prayer-times/countries/, cities.css and sitemap-cities.xml.
//
// Times come from the API the app uses (/v1/calendar, read-only), gently: one request at
// a time, CITY_PAGES_INTERVAL_MS apart (default 2,500), at most CITY_PAGES_BUDGET requests
// per run (default 6,600). Month pages already holding the right year are reused, so after
// the first build (~6,000 calls, ~4 h) a night costs nothing except on the 1st of a month,
// when each city's finished month rolls to next year (~500 calls). A run that hits the
// budget carries on the next night; pages, country lists and the sitemap only ever link
// to cities that have pages. --full refetches everything (e.g. after an API correction).
// "Today", the next prayer and the countdown are worked out in the browser.
// 2026-10-20: an unpaced first build (3 parallel, ~10 req/s) crashed prayer-api twice;
// see docs/INCIDENT_PRAYER_API_OOM_CITY_PAGES_BUILD_2026-10-20.md.
import fs from 'node:fs';
import path from 'node:path';

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

const { countries, cities } = JSON.parse(fs.readFileSync(path.join(HERE, 'cities.json'), 'utf8'));
// Other spellings people search for (aliases.json): shown as "Makkah (Mecca)".
const aliasFile = path.join(HERE, 'aliases.json');
const ALIASES = fs.existsSync(aliasFile) ? JSON.parse(fs.readFileSync(aliasFile, 'utf8')) : {};
const named = (c) => (ALIASES[`${c.country}/${c.slug}`] ? `${c.name} (${ALIASES[`${c.country}/${c.slug}`]})` : c.name);
// Share image per city (made once by og-images.mjs); the logo where there is none.
const ogImage = (c) => {
  const rel = `/prayer-times/og/${c.country}-${c.slug}.jpg`;
  return fs.existsSync(path.join(OUT, rel)) ? rel : null;
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cityUrl = (c) => `/prayer-times/${c.country}/${c.slug}/`;
const monthUrl = (c, m) => `${cityUrl(c)}${MONTHS[m - 1]}/`;
const countryUrl = (cc) => `/prayer-times/${cc}/`;
const hhmm = (s) => String(s).match(/\d{1,2}:\d{2}/)?.[0] || '';
const to12 = (s) => {
  const [h, m] = hhmm(s).split(':').map(Number);
  if (Number.isNaN(h)) return '—';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const monthName = (m) => cap(MONTHS[m - 1]);

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
const POINTS = ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast', 'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest'];
const compass = (deg) => POINTS[Math.round(deg / 22.5) % 16];
const fmtDistance = (km, cc) => (cc === 'us' || cc === 'uk' ? `${Math.round(km * 0.621371).toLocaleString('en-US')} miles` : `${Math.round(km).toLocaleString('en-US')} km`);
const place = (c) => (c.region ? `${c.name}, ${c.region}` : c.name);

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

// A month page's embedded data, reused when it is already for the right year.
function existingMonth(file, y, m) {
  if (FULL || !fs.existsSync(file)) return null;
  const json = fs.readFileSync(file, 'utf8').match(/<script type="application\/json" id="pt-data">(.*?)<\/script>/s)?.[1];
  if (!json) return null;
  const data = JSON.parse(json);
  return data.y === y && data.m === m && data.days?.length >= 28 ? { y, m, days: data.days } : null;
}

let listed = cities; // the cities that have pages; set before anything is rendered
let footerCountries = [];

function layout({ title, description, canonical, jsonLd, body, image = null }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="iMuslim Life">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}${image || '/logo512.png'}">${image ? '\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">' : ''}
<meta name="theme-color" content="#006400">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/prayer-times/cities.css">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonLd }).replace(/</g, '\\u003c')}</script>
${BEACON}
</head>
<body>
<header class="bar">
  <div class="wrap bar-in">
    <a class="brand" href="/"><span aria-hidden="true">🕋</span> i<b>Muslim</b> Life</a>
    <nav><a href="/prayer-times/">Prayer Times</a><a href="/prayer-times/countries/">Cities</a><a href="/quran/">Quran</a><a href="/alexa-athan/">Athan on Alexa</a></nav>
  </div>
</header>
${body}
<footer class="foot wrap">
  <p><a href="/">iMuslim Life</a> · ${footerCountries.map(([cc, c]) => `<a href="${countryUrl(cc)}">${esc(c.name)}</a>`).join(' · ')} · <a href="/prayer-times/countries/">All countries</a></p>
  <p><a href="/privacy-policy/">Privacy</a> · <a href="/terms/">Terms</a> · Always ad-free · City data © <a href="https://www.geonames.org/" rel="noopener">GeoNames</a> (CC BY 4.0)</p>
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

function monthTable(month, caption) {
  return `<table class="tt">
<caption>${esc(caption)}</caption>
<thead><tr><th scope="col">Date</th>${PRAYERS.map((p) => `<th scope="col">${p}</th>`).join('')}</tr></thead>
<tbody>${month.days.map((d) => {
    const label = new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
    const ramadan = /^\d+ Ramadan /.test(d.hijri) ? ' class="ramadan"' : '';
    return `<tr data-date="${d.date}"${ramadan}><th scope="row">${label}<small>${esc(d.hijri)}</small></th>${PRAYERS.map((p) => `<td>${to12(d.t[p]).replace(/ (AM|PM)$/, '<i> $1</i>')}</td>`).join('')}</tr>`;
  }).join('')}</tbody>
</table>`;
}

const ramadanDays = (month) => month.days.filter((d) => /^\d+ Ramadan /.test(d.hijri));

function ctaCard(city) {
  return SKILL_COUNTRIES.has(city.country)
    ? `<section class="card cta noprint"><h2>Hear the Athan at these times</h2><p>Muslim Companion plays the Athan on your Amazon Echo at your local prayer times, free. The Salat-e-Mustaqeem app brings the same times to your iPhone and Apple Watch.</p><p class="btns"><a class="btn" href="/alexa-athan/">Athan on Alexa</a><a class="btn alt" href="/mobile-app/">Get the app</a></p></section>`
    : `<section class="card cta noprint"><h2>Never miss a prayer</h2><p>The free Salat-e-Mustaqeem app gives you these times with Athan notifications on your iPhone and Apple Watch, ad-free.</p><p class="btns"><a class="btn" href="/mobile-app/">Get the app</a></p></section>`;
}

function monthLinks(city, now, current) {
  return `<ul class="months">${MONTHS.map((_, i) => {
    const m = i + 1;
    const y = yearFor(m, now);
    return `<li${m === current ? ' class="is-current"' : ''}><a href="${monthUrl(city, m)}">${monthName(m)} <span>${y}</span></a></li>`;
  }).join('')}</ul>`;
}

function nearbyCities(city) {
  return listed
    .filter((c) => c !== city)
    .map((c) => ({ c, d: distanceKm(city, c) + (c.country === city.country ? 0 : 5000) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)
    .map(({ c }) => c);
}

// Runs in the browser: today's times, the next prayer and a countdown, in the city's time zone.
const CLIENT_TODAY = `(function(){
var D=JSON.parse(document.getElementById('pt-data').textContent);
var P=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
function now(){var p={};new Intl.DateTimeFormat('en-CA',{timeZone:D.tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});return{date:p.year+'-'+p.month+'-'+p.day,min:(+p.hour)*60+(+p.minute)+(+p.second)/60}}
function mins(s){var a=s.split(':');return +a[0]*60+(+a[1])}
function h12(s){var a=s.split(':'),h=+a[0];return((h+11)%12+1)+':'+a[1]+(h<12?' AM':' PM')}
var n=now(),i=-1;for(var k=0;k<D.days.length;k++)if(D.days[k].date===n.date)i=k;
var row=document.querySelector('tr[data-date="'+n.date+'"]');if(row)row.classList.add('is-today');
if(i<0||!document.querySelector('.today'))return;var d=D.days[i];
document.querySelectorAll('.today .slot').forEach(function(el){el.querySelector('b').textContent=h12(d.t[el.dataset.p])});
document.getElementById('pt-date').textContent=new Date(n.date+'T12:00:00Z').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})+(d.hijri?' · '+d.hijri:'');
function tick(){var n2=now(),day=D.days[i],next=null,at=0,label;
if(n2.date!==n.date){location.reload();return}
for(var j=0;j<P.length;j++){if(mins(day.t[P[j]])>n2.min){next=P[j];at=mins(day.t[P[j]]);break}}
if(next){label=next}else if(D.days[i+1]){next='Fajr';at=mins(D.days[i+1].t.Fajr)+1440;label='Fajr (tomorrow)'}
document.querySelectorAll('.today .slot').forEach(function(el){el.classList.toggle('is-next',el.dataset.p===next&&label===next)});
if(!next){document.getElementById('pt-next').textContent='';return}
var left=Math.max(0,Math.round(at-n2.min)),h=Math.floor(left/60),m=left%60;
document.getElementById('pt-next').innerHTML='Next: <b>'+label+'</b> in '+(h?h+' h ':'')+m+' min'}
tick();setInterval(tick,30000)})();`;

const dataScript = (data) => `<script type="application/json" id="pt-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

function cityPage(city, cur, nxt, now) {
  const country = countries[city.country];
  const q = qibla(city.lat, city.lon);
  const km = distanceKm(city, KAABA);
  const title = `${named(city)} Prayer Times Today: Fajr, Dhuhr, Asr, Maghrib, Isha`;
  const description = `Prayer times for ${named(city)}${city.region ? `, ${city.region}` : ''}, ${country.name}: today's Fajr, Sunrise, Dhuhr, Asr, Maghrib and Isha, monthly timetables with Hijri dates, and the Qibla direction.`;
  const faq = [
    [`How are the prayer times for ${city.name} calculated?`, `With the ${country.methodName} method and the ${country.asrName} time for Asr, for ${city.name}'s coordinates and local time zone. Your masjid's timetable may differ by a few minutes.`],
    [`Which direction is the Qibla in ${city.name}?`, `The Qibla in ${city.name} is ${Math.round(q)}° from true north, roughly ${compass(q)}. Makkah is about ${fmtDistance(km, city.country)} away.`],
    [`When does Suhoor end and when is Iftar in ${city.name}?`, `Suhoor ends at Fajr and Iftar is at Maghrib. Both are in the monthly timetables for every day of the year.`],
  ];
  const body = `
<main class="wrap">
  <p class="crumbs"><a href="/prayer-times/">Prayer times</a> › <a href="${countryUrl(city.country)}">${esc(country.name)}</a> › ${esc(city.name)}</p>
  <section class="hero">
    <h1>Prayer times in ${esc(named(city))}</h1>
    <p class="sub">${city.region ? `${esc(city.region)}, ` : ''}${esc(country.name)} · <span id="pt-date">${monthName(cur.m)} ${cur.y}</span></p>
    <div class="today" aria-live="polite">${PRAYERS.map((p) => `<div class="slot" data-p="${p}"><span>${p}</span><b>—</b></div>`).join('')}</div>
    <p class="next" id="pt-next">&nbsp;</p>
  </section>

  <section class="card">
    <h2>${esc(city.name)} prayer timetable, ${monthName(cur.m)} ${cur.y}</h2>
    ${monthTable(cur, `Daily prayer times in ${place(city)}, ${monthName(cur.m)} ${cur.y}, with Hijri dates`)}
    <h3>Monthly timetables</h3>
    ${monthLinks(city, now, cur.m)}
  </section>

  <div class="two">
    <section class="card">
      <h2>Qibla direction from ${esc(city.name)}</h2>
      <div class="qibla"><svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true"><circle cx="50" cy="50" r="46" class="ring"/><text x="50" y="14" text-anchor="middle">N</text><g transform="rotate(${q.toFixed(1)} 50 50)"><path d="M50 14 L57 52 L50 46 L43 52 Z" class="needle"/></g><circle cx="50" cy="50" r="4" class="hub"/></svg>
      <p>Face <b>${Math.round(q)}°</b> from true north (${compass(q)}). Makkah is about <b>${fmtDistance(km, city.country)}</b> from ${esc(city.name)}.</p></div>
    </section>
    <section class="card">
      <h2>About these times</h2>
      <p>Calculated with <b>${esc(country.methodName)}</b>, Asr <b>${esc(country.asrName)}</b>, in ${esc(city.tz.replace(/_/g, ' '))} time. Your masjid may use a different method or add a few minutes; follow its timetable for congregation.</p>
    </section>
  </div>

  ${ctaCard(city)}

  <section class="card">
    <h2>Prayer times near ${esc(city.name)}</h2>
    <ul class="cities">${nearbyCities(city).map((c) => `<li><a href="${cityUrl(c)}">${esc(named(c))}</a><span>${esc(c.region || countries[c.country].name)}</span></li>`).join('')}</ul>
  </section>

  <section class="card">
    <h2>Questions</h2>
    ${faq.map(([qq, a]) => `<details><summary>${esc(qq)}</summary><p>${esc(a)}</p></details>`).join('')}
  </section>
</main>
${dataScript({ tz: city.tz, days: [...cur.days, ...nxt.days] })}
<script>${CLIENT_TODAY}</script>`;
  return layout({
    title, description, canonical: cityUrl(city), image: ogImage(city),
    jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Prayer times', '/prayer-times/'], [country.name, countryUrl(city.country)], [city.name, cityUrl(city)]]), faqLd(faq)],
    body,
  });
}

function monthPage(city, month, now) {
  const country = countries[city.country];
  const label = `${monthName(month.m)} ${month.y}`;
  const ram = ramadanDays(month);
  const ramYear = ram[0]?.hijri.split(' ').pop();
  const title = ram.length
    ? `${named(city)} Prayer Times ${label}: Ramadan Timetable`
    : `${named(city)} Prayer Times ${label} | Monthly Timetable`;
  const first = month.days[0];
  const last = month.days[month.days.length - 1];
  const description = `${city.name} prayer timetable for ${label}: Fajr, Sunrise, Dhuhr, Asr, Maghrib and Isha for every day${ram.length ? `, including Ramadan ${ramYear} (Suhoor ends at Fajr, Iftar at Maghrib)` : ''}, with Hijri dates. Printable.`;
  const ramNote = ram.length
    ? `<p class="note">Ramadan ${esc(ramYear)} falls in this month from <b>${new Date(`${ram[0].date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}</b> (highlighted), by the calculated Hijri calendar; the start depends on the moon sighting your community follows. Suhoor ends at Fajr and Iftar is at Maghrib.</p>`
    : '';
  const body = `
<main class="wrap">
  <p class="crumbs noprint"><a href="/prayer-times/">Prayer times</a> › <a href="${countryUrl(city.country)}">${esc(country.name)}</a> › <a href="${cityUrl(city)}">${esc(city.name)}</a> › ${monthName(month.m)}</p>
  <section class="card month">
    <h1>${esc(named(city))} prayer times, ${label}</h1>
    <p class="sub">${esc(place(city))}, ${esc(country.name)} · ${esc(first.hijri)} – ${esc(last.hijri)} · ${esc(country.methodName)}, Asr ${esc(country.asrName)}</p>
    ${ramNote}
    <p class="noprint"><button class="btn" type="button" onclick="window.print()">Print this timetable</button> <a class="btn alt" href="${cityUrl(city)}">Today in ${esc(city.name)}</a></p>
    ${monthTable(month, `Daily prayer times in ${place(city)}, ${label}`)}
    <p class="printnote">imuslimlife.com${monthUrl(city, month.m)} · Times by ${esc(country.methodName)}. Your masjid's timetable may differ by a few minutes.</p>
  </section>
  <section class="card noprint">
    <h2>Other months in ${esc(city.name)}</h2>
    ${monthLinks(city, now, month.m)}
  </section>
  ${ctaCard(city)}
</main>
${dataScript({ tz: city.tz, y: month.y, m: month.m, days: month.days })}
<script>(function(){var D=JSON.parse(document.getElementById('pt-data').textContent);var p={};new Intl.DateTimeFormat('en-CA',{timeZone:D.tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});var r=document.querySelector('tr[data-date="'+p.year+'-'+p.month+'-'+p.day+'"]');if(r)r.classList.add('is-today')})();</script>`;
  return layout({
    title, description, canonical: monthUrl(city, month.m), image: ogImage(city),
    jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Prayer times', '/prayer-times/'], [country.name, countryUrl(city.country)], [city.name, cityUrl(city)], [label, monthUrl(city, month.m)]])],
    body,
  });
}

function countryPage(cc) {
  const country = countries[cc];
  const list = listed.filter((c) => c.country === cc);
  const title = list.length > 2
    ? `Prayer Times in ${country.name}: ${list.slice(0, 3).map((c) => c.name).join(', ')} and More`
    : `Prayer Times in ${country.name}: ${list.map((c) => c.name).join(' and ')}`;
  const description = `Prayer times for ${list.length} ${list.length === 1 ? 'city' : 'cities'} in ${country.name}, calculated with ${country.methodName}: daily Fajr, Dhuhr, Asr, Maghrib and Isha, monthly timetables and the Qibla direction.`;
  const body = `
<main class="wrap">
  <p class="crumbs"><a href="/prayer-times/">Prayer times</a> › <a href="/prayer-times/countries/">Countries</a> › ${esc(country.name)}</p>
  <section class="hero"><h1>Prayer times in ${esc(country.name)}</h1>
  <p class="sub">Daily times and monthly timetables, calculated with ${esc(country.methodName)} and the ${esc(country.asrName)} Asr time.</p></section>
  <section class="card"><h2>Cities</h2>
  <ul class="cities">${list.map((c) => `<li><a href="${cityUrl(c)}">${esc(named(c))}</a><span>${esc(c.region || '')}</span></li>`).join('')}</ul></section>
  <section class="card"><h2>Other countries</h2><p><a href="/prayer-times/countries/">All ${listedCountries().length} countries and ${listed.length} cities</a></p></section>
</main>`;
  return layout({ title, description, canonical: countryUrl(cc), jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Prayer times', '/prayer-times/'], [country.name, countryUrl(cc)]])], body });
}

const listedCountries = () => Object.entries(countries).filter(([cc]) => listed.some((c) => c.country === cc));
function countriesPage() {
  const list = listedCountries();
  const body = `
<main class="wrap">
  <p class="crumbs"><a href="/prayer-times/">Prayer times</a> › Countries</p>
  <section class="hero"><h1>Prayer times by country</h1><p class="sub">${listed.length} cities in ${list.length} countries: today's times, monthly timetables and the Qibla direction.</p></section>
  ${list.map(([cc, c]) => `<section class="card"><h2><a href="${countryUrl(cc)}">${esc(c.name)}</a></h2><ul class="cities">${listed.filter((x) => x.country === cc).map((x) => `<li><a href="${cityUrl(x)}">${esc(named(x))}</a></li>`).join('')}</ul></section>`).join('\n  ')}
</main>`;
  return layout({
    title: `Prayer Times in ${listed.length} Cities Worldwide, by Country`,
    description: `Prayer times for ${listed.length} cities in ${list.length} countries, from Makkah and Istanbul to London and New York: daily times, monthly timetables and the Qibla direction.`,
    canonical: '/prayer-times/countries/',
    jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Prayer times', '/prayer-times/'], ['Countries', '/prayer-times/countries/']])],
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

// Pass 1: each city's 12 months: reuse month pages that already hold the right year,
// fetch the rest while the budget lasts. Pilot cities first, then by size.
const cityDir = (city) => path.join(OUT, 'prayer-times', city.country, city.slug);
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
      months[m] = existingMonth(path.join(cityDir(city), MONTHS[m - 1], 'index.html'), y, m);
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

// Pass 2: pages. Link only to cities that are ready now or already have a page.
listed = cities.filter((c) => data.has(c) || fs.existsSync(path.join(cityDir(c), 'index.html')));
footerCountries = Object.entries(countries)
  .map(([cc, c]) => [cc, c, listed.filter((x) => x.country === cc).length])
  .filter(([, , n]) => n)
  .sort((a, b) => b[2] - a[2])
  .slice(0, 8);
for (const [city, { now, months }] of data) {
  const nxt = months[(now.m % 12) + 1];
  writeIfChanged(path.join(cityDir(city), 'index.html'), cityPage(city, months[now.m], nxt, now));
  for (let m = 1; m <= 12; m++) writeIfChanged(path.join(cityDir(city), MONTHS[m - 1], 'index.html'), monthPage(city, months[m], now));
}

for (const [cc] of listedCountries()) writeIfChanged(path.join(OUT, 'prayer-times', cc, 'index.html'), countryPage(cc));
writeIfChanged(path.join(OUT, 'prayer-times', 'countries', 'index.html'), countriesPage());
writeIfChanged(path.join(OUT, 'prayer-times', 'cities.css'), fs.readFileSync(path.join(HERE, 'cities.css'), 'utf8'));

const month = new Date().toISOString().slice(0, 7);
const urls = ['/prayer-times/countries/', ...listedCountries().map(([cc]) => countryUrl(cc)), ...listed.filter((c) => data.has(c) || fs.existsSync(path.join(cityDir(c), MONTHS[0], 'index.html'))).flatMap((c) => [cityUrl(c), ...MONTHS.map((_, i) => monthUrl(c, i + 1))])];
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
