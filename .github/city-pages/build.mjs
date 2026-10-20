// City prayer-time pages for imuslimlife.com (pilot, 2026-10-20).
//
//   node build.mjs --out <site root>
//
// Writes <out>/prayer-times/<country>/<city>/index.html, one page per country,
// <out>/prayer-times/cities.css and <out>/sitemap-cities.xml. Times come from the
// same API the app uses (/v1/calendar, read-only): this month and next, per city.
// "Today", the next prayer and the countdown are worked out in the browser from
// the embedded month, in the city's timezone, so a page only changes when the
// month does. Runs nightly from the imuslimlife repo's GitHub Action; a city
// whose API call fails keeps its previous page.
import fs from 'node:fs';
import path from 'node:path';

const HERE = import.meta.dirname;
const outArg = process.argv.indexOf('--out');
const OUT = path.resolve(outArg > -1 ? process.argv[outArg + 1] : path.join(HERE, '../../build'));
const API = process.env.CITY_PAGES_API || 'https://node-api.imuslimlife.com/v1/calendar';
const SITE = 'https://imuslimlife.com';
const BEACON = `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "3937a625dcce4781b04cf88f4f50fe59"}'></script><!-- End Cloudflare Web Analytics -->`;
const KAABA = { lat: 21.4225, lon: 39.8262 };
const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// The city list lives in the React app (src/config/cities.json) so the Prayer Times page can link to it;
// the imuslimlife repo keeps a copy next to this script (see publish-site.sh).
const listFile = [path.join(HERE, 'cities.json'), path.join(HERE, '../../src/config/cities.json')].find((f) => fs.existsSync(f));
const { countries, cities } = JSON.parse(fs.readFileSync(listFile, 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cityUrl = (c) => `/prayer-times/${c.country}/${c.slug}/`;
const countryUrl = (cc) => `/prayer-times/${cc}/`;
const hhmm = (s) => String(s).match(/\d{1,2}:\d{2}/)?.[0] || '';
const to12 = (s) => {
  const [h, m] = hhmm(s).split(':').map(Number);
  if (Number.isNaN(h)) return '—';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};
const monthName = (y, m) => new Date(Date.UTC(y, m - 1, 15)).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

function todayIn(tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month) };
}

const rad = (d) => (d * Math.PI) / 180;
function qibla(lat, lon) {
  const [φ1, φ2, Δλ] = [rad(lat), rad(KAABA.lat), rad(KAABA.lon - lon)];
  const bearing = (Math.atan2(Math.sin(Δλ), Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ)) * 180) / Math.PI;
  return (bearing + 360) % 360;
}
function distanceKm(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
const POINTS = ['north', 'north-northeast', 'northeast', 'east-northeast', 'east', 'east-southeast', 'southeast', 'south-southeast', 'south', 'south-southwest', 'southwest', 'west-southwest', 'west', 'west-northwest', 'northwest', 'north-northwest'];
const compass = (deg) => POINTS[Math.round(deg / 22.5) % 16];
const usesMiles = (cc) => cc === 'us' || cc === 'uk';
const fmtDistance = (km, cc) => (usesMiles(cc) ? `${Math.round(km * 0.621371).toLocaleString('en-US')} miles` : `${Math.round(km).toLocaleString('en-US')} km`);

async function fetchMonth(city, y, m) {
  const params = new URLSearchParams({ latitude: city.lat, longitude: city.lon, timezonestring: city.tz, ...countries[city.country].params });
  const url = `${API}/${y}/${m}?${params}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
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
      if (attempt === 3) throw new Error(`${city.slug} ${y}-${m}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

function layout({ title, description, canonical, jsonLd, body }) {
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
<meta property="og:image" content="${SITE}/logo512.png">
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
    <nav><a href="/prayer-times/">Prayer Times</a><a href="/quran/">Quran</a><a href="/alexa-athan/">Athan on Alexa</a></nav>
  </div>
</header>
${body}
<footer class="foot wrap">
  <p><a href="/">iMuslim Life</a> · <a href="/prayer-times/">Prayer times</a> · ${Object.entries(countries).map(([cc, c]) => `<a href="${countryUrl(cc)}">${esc(c.name)}</a>`).join(' · ')}</p>
  <p><a href="/privacy-policy/">Privacy</a> · <a href="/terms/">Terms</a> · Always ad-free</p>
</footer>
</body>
</html>
`;
}

const breadcrumb = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `${SITE}${url}` })),
});

function monthTable(month, caption) {
  return `<table class="tt">
<caption>${esc(caption)}</caption>
<thead><tr><th scope="col">Date</th>${PRAYERS.map((p) => `<th scope="col">${p}</th>`).join('')}</tr></thead>
<tbody>${month.days.map((d) => {
    const dt = new Date(`${d.date}T12:00:00Z`);
    const label = dt.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });
    return `<tr data-date="${d.date}"><th scope="row">${label}<small>${esc(d.hijri)}</small></th>${PRAYERS.map((p) => `<td>${to12(d.t[p]).replace(/ (AM|PM)$/, '<i> $1</i>')}</td>`).join('')}</tr>`;
  }).join('')}</tbody>
</table>`;
}

function cityPage(city, months) {
  const country = countries[city.country];
  const [cur, next] = months;
  const q = qibla(city.lat, city.lon);
  const km = distanceKm(city, KAABA);
  const nearby = cities
    .filter((c) => c !== city)
    .map((c) => ({ c, d: distanceKm(city, c) + (c.country === city.country ? 0 : 5000) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)
    .map(({ c }) => c);
  const place = `${city.name}, ${city.region}`;
  const title = `${city.name} Prayer Times Today: Fajr, Dhuhr, Asr, Maghrib, Isha`;
  const description = `Prayer times for ${place}: today's Fajr, Sunrise, Dhuhr, Asr, Maghrib and Isha, the ${monthName(cur.y, cur.m)} timetable with Hijri dates, and the Qibla direction.`;
  const faq = [
    [`How are the prayer times for ${city.name} calculated?`, `With the ${country.methodName} method, which is widely used in ${country.name}, and the ${country.asrName} time for Asr, for ${city.name}'s coordinates and local time zone. Your masjid's timetable may differ by a few minutes.`],
    [`Which direction is the Qibla in ${city.name}?`, `The Qibla in ${city.name} is ${Math.round(q)}° from true north, roughly ${compass(q)}. Makkah is about ${fmtDistance(km, city.country)} away.`],
    [`When does Suhoor end and when is Iftar in ${city.name}?`, `Suhoor ends at Fajr and Iftar is at Maghrib. Both are in the timetable above for every day of the month.`],
  ];
  const data = { tz: city.tz, days: months.flatMap((mo) => mo.days.map((d) => ({ date: d.date, hijri: d.hijri, t: d.t }))) };
  const body = `
<main class="wrap">
  <p class="crumbs"><a href="/prayer-times/">Prayer times</a> › <a href="${countryUrl(city.country)}">${esc(country.name)}</a> › ${esc(city.name)}</p>
  <section class="hero">
    <h1>Prayer times in ${esc(city.name)}</h1>
    <p class="sub">${esc(city.region)}, ${esc(country.name)} · <span id="pt-date">${monthName(cur.y, cur.m)} ${cur.y}</span></p>
    <div class="today" aria-live="polite">
      ${PRAYERS.map((p) => `<div class="slot" data-p="${p}"><span>${p}</span><b>—</b></div>`).join('')}
    </div>
    <p class="next" id="pt-next">&nbsp;</p>
  </section>

  <section class="card">
    <h2>${esc(city.name)} prayer timetable, ${monthName(cur.y, cur.m)} ${cur.y}</h2>
    ${monthTable(cur, `Daily prayer times in ${place}, ${monthName(cur.y, cur.m)} ${cur.y}, with Hijri dates`)}
    <details><summary>${monthName(next.y, next.m)} ${next.y}</summary>${monthTable(next, `Daily prayer times in ${place}, ${monthName(next.y, next.m)} ${next.y}`)}</details>
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

  <section class="card cta">
    <h2>Hear the Athan at these times</h2>
    <p>Muslim Companion plays the Athan on your Amazon Echo at your local prayer times, free. The Salat-e-Mustaqeem app brings the same times to your iPhone and Apple Watch.</p>
    <p class="btns"><a class="btn" href="/alexa-athan/">Athan on Alexa</a><a class="btn alt" href="/mobile-app/">Get the app</a></p>
  </section>

  <section class="card">
    <h2>Prayer times near ${esc(city.name)}</h2>
    <ul class="cities">${nearby.map((c) => `<li><a href="${cityUrl(c)}">${esc(c.name)}</a><span>${esc(c.region)}</span></li>`).join('')}</ul>
  </section>

  <section class="card">
    <h2>Questions</h2>
    ${faq.map(([qq, a]) => `<details><summary>${esc(qq)}</summary><p>${esc(a)}</p></details>`).join('')}
  </section>
</main>
<script type="application/json" id="pt-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script>${CLIENT_JS}</script>`;
  return layout({
    title,
    description,
    canonical: cityUrl(city),
    jsonLd: [
      breadcrumb([['iMuslim Life', '/'], ['Prayer times', '/prayer-times/'], [country.name, countryUrl(city.country)], [city.name, cityUrl(city)]]),
      { '@type': 'FAQPage', mainEntity: faq.map(([qq, a]) => ({ '@type': 'Question', name: qq, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
    body,
  });
}

// Runs in the browser: today's times, the next prayer and a countdown, in the city's time zone.
const CLIENT_JS = `(function(){
var D=JSON.parse(document.getElementById('pt-data').textContent);
var P=['Fajr','Dhuhr','Asr','Maghrib','Isha'];
function now(){var p={};new Intl.DateTimeFormat('en-CA',{timeZone:D.tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});return{date:p.year+'-'+p.month+'-'+p.day,min:(+p.hour)*60+(+p.minute)+(+p.second)/60}}
function mins(s){var a=s.split(':');return +a[0]*60+(+a[1])}
function h12(s){var a=s.split(':'),h=+a[0];return((h+11)%12+1)+':'+a[1]+(h<12?' AM':' PM')}
var n=now(),i=-1;for(var k=0;k<D.days.length;k++)if(D.days[k].date===n.date)i=k;
if(i<0)return;var d=D.days[i];
document.querySelectorAll('.today .slot').forEach(function(el){el.querySelector('b').textContent=h12(d.t[el.dataset.p])});
var dt=new Date(n.date+'T12:00:00Z');
document.getElementById('pt-date').textContent=dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})+(d.hijri?' · '+d.hijri:'');
var row=document.querySelector('tr[data-date="'+n.date+'"]');if(row)row.classList.add('is-today');
function tick(){var n2=now(),day=D.days[i],next=null,at=0;
if(n2.date!==n.date){location.reload();return}
for(var j=0;j<P.length;j++){if(mins(day.t[P[j]])>n2.min){next=P[j];at=mins(day.t[P[j]]);break}}
var label;if(next){label=next}else if(D.days[i+1]){next='Fajr';at=mins(D.days[i+1].t.Fajr)+1440;label='Fajr (tomorrow)'}
document.querySelectorAll('.today .slot').forEach(function(el){el.classList.toggle('is-next',el.dataset.p===next&&!!day.t&&label===next)});
if(!next){document.getElementById('pt-next').textContent='';return}
var left=Math.max(0,Math.round(at-n2.min)),h=Math.floor(left/60),m=left%60;
document.getElementById('pt-next').innerHTML='Next: <b>'+label+'</b> in '+(h?h+' h ':'')+m+' min'}
tick();setInterval(tick,30000)})();`;

function countryPage(cc) {
  const country = countries[cc];
  const list = cities.filter((c) => c.country === cc);
  const title = `Prayer Times in ${country.name}: ${list.slice(0, 3).map((c) => c.name).join(', ')} and More`;
  const description = `Prayer times for cities in ${country.name}, calculated with ${country.methodName}: daily Fajr, Dhuhr, Asr, Maghrib and Isha, monthly timetables and the Qibla direction.`;
  const body = `
<main class="wrap">
  <p class="crumbs"><a href="/prayer-times/">Prayer times</a> › ${esc(country.name)}</p>
  <section class="hero"><h1>Prayer times in ${esc(country.name)}</h1>
  <p class="sub">Daily times and monthly timetables, calculated with ${esc(country.methodName)} and the ${esc(country.asrName)} Asr time.</p></section>
  <section class="card"><h2>Cities</h2>
  <ul class="cities">${list.map((c) => `<li><a href="${cityUrl(c)}">${esc(c.name)}</a><span>${esc(c.region)}</span></li>`).join('')}</ul></section>
  <section class="card"><h2>Other countries</h2>
  <ul class="cities">${Object.entries(countries).filter(([k]) => k !== cc).map(([k, c]) => `<li><a href="${countryUrl(k)}">${esc(c.name)}</a><span>${cities.filter((x) => x.country === k).length} cities</span></li>`).join('')}</ul></section>
  <section class="card cta"><h2>Hear the Athan at home</h2><p>Muslim Companion plays the Athan on your Amazon Echo at your local prayer times, free.</p><p class="btns"><a class="btn" href="/alexa-athan/">Athan on Alexa</a><a class="btn alt" href="/mobile-app/">Get the app</a></p></section>
</main>`;
  return layout({ title, description, canonical: countryUrl(cc), jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Prayer times', '/prayer-times/'], [country.name, countryUrl(cc)]])], body });
}

function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

let changed = 0;
const failed = [];
for (const city of cities) {
  const { y, m } = todayIn(city.tz);
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1];
  try {
    const months = [await fetchMonth(city, y, m), await fetchMonth(city, ny, nm)];
    if (writeIfChanged(path.join(OUT, 'prayer-times', city.country, city.slug, 'index.html'), cityPage(city, months))) changed++;
  } catch (err) {
    failed.push(err.message);
  }
}
for (const cc of Object.keys(countries)) if (writeIfChanged(path.join(OUT, 'prayer-times', cc, 'index.html'), countryPage(cc))) changed++;
if (writeIfChanged(path.join(OUT, 'prayer-times', 'cities.css'), fs.readFileSync(path.join(HERE, 'cities.css'), 'utf8'))) changed++;

const month = new Date().toISOString().slice(0, 7);
const urls = [...Object.keys(countries).map(countryUrl), ...cities.map(cityUrl)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${month}-01</lastmod></url>`).join('\n')}
</urlset>
`;
if (writeIfChanged(path.join(OUT, 'sitemap-cities.xml'), sitemap)) changed++;

console.log(`city-pages: ${cities.length - failed.length}/${cities.length} cities ok, ${changed} files changed, out ${OUT}`);
if (failed.length) {
  console.error(`city-pages: kept the previous page for ${failed.length} cities:\n  ${failed.join('\n  ')}`);
  process.exitCode = failed.length > cities.length / 2 ? 1 : 0;
}
