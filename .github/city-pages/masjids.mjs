// Mosque Directory pages (step 3, 2026-10-20), built by build.mjs alongside the city pages:
//   /masjids/                         USA + Canada, states / provinces with counts
//   /masjids/<cc>/<state>/            every masjid in a state, by town
//   /masjids/<cc>/<state>/<slug>/     one masjid: location, map, nearest city's prayer
//                                     times (browser, from the widget data file), Qibla
//   /masjids/index.json               compact list for the React /mosque-directory
// Data: osm-masjids.json (scripts/masjids/fetch-osm.mjs; © OpenStreetMap contributors,
// ODbL) plus Masjid Connect masjids from the API (1 + one per masjid, paced by build.mjs).
// A Masjid Connect masjid within 300 m of an OSM one takes it over: the page links to its
// live iqamah times at /mosque/<id>; one with no OSM match is listed by its live page.
import fs from 'node:fs';
import path from 'node:path';

const REGIONS = {
  us: { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', PR: 'Puerto Rico' },
  ca: { AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon' },
};
const COUNTRY_NAMES = { us: 'United States', ca: 'Canada' };
// OSM denomination values -> label shown (owner decision 2026-10-20: list all, labelled).
const DENOMINATIONS = {
  sunni: 'Sunni', suni: 'Sunni', shia: 'Shia', ahmadiyya: 'Ahmadiyya', ahmadiyat: 'Ahmadiyya', ismaili: 'Ismaili',
  nation_of_islam: 'Nation of Islam', noi: 'Nation of Islam', sufi: 'Sufi', dawoodi_bohra: 'Dawoodi Bohra',
  nondenominational: 'Non-denominational', the_mosque_cares: 'The Mosque Cares',
};
const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const NEAR_CITY_KM = 50;

const denomination = (m) => DENOMINATIONS[String(m.denomination || '').toLowerCase()]
  || (/jama?t ?khana/i.test(m.name) ? 'Ismaili' : null);
const typeLabel = (m) => (m.type === 'musalla' ? 'Musalla' : 'Masjid');
const regionName = (cc, code) => REGIONS[cc]?.[code] || code || 'Other';
const regionSlug = (code) => String(code || 'other').toLowerCase();

export function loadMasjids(here) {
  for (const file of [path.join(here, 'osm-masjids.json'), path.join(here, '../masjids/osm-masjids.json')]) {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8')).masjids
        .filter((m) => m.lat != null && m.region)
        .map((m) => ({ ...m, cc: m.country.toLowerCase() }));
    }
  }
  return [];
}

// Masjid Connect: active masjids with coordinates. `get` is build.mjs's paced fetch.
export async function loadMasjidConnect(get, api) {
  try {
    const list = (await get(`${api}/alexa/masjids`))?.data?.masjids || [];
    const out = [];
    for (const m of list) {
      const d = (await get(`${api}/alexa/masjids/${encodeURIComponent(m.id)}`))?.data?.masjid;
      if (d?.latitude != null) out.push({ id: d.id, name: d.name, address: d.address, city: d.city, website: d.website, phone: d.phone, lat: Number(d.latitude), lon: Number(d.longitude) });
    }
    return out;
  } catch (err) {
    console.warn(`masjids: Masjid Connect unavailable (${err.message}); building without it`);
    return [];
  }
}

export function buildMasjids(ctx) {
  const { osm, connect, layout, esc, breadcrumb, qibla, compass, distanceKm, cityUrl, named, listed, SITE } = ctx;
  const hubUrl = '/masjids/';
  const regionUrl = (cc, code) => `/masjids/${cc}/${regionSlug(code)}/`;
  const pageUrl = (m) => `${regionUrl(m.cc, m.region)}${m.slug}/`;
  const credit = 'Masjid data © <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap contributors</a> (ODbL) and the masjids on Masjid Connect';

  // Masjid Connect takes over the nearest OSM entry within 300 m; the rest stand alone.
  const connectOnly = [];
  for (const c of connect) {
    let best = null;
    for (const m of osm) { const d = distanceKm(m, c); if (d < 0.3 && (!best || d < best.d)) best = { d, m }; }
    if (best) best.m.connect = c;
    else {
      const code = String(c.city || '').match(/,\s*([A-Z]{2})\b/)?.[1] || null;
      const cc = code && REGIONS.ca[code] && !REGIONS.us[code] ? 'ca' : 'us';
      connectOnly.push({ ...c, cc, region: code, town: String(c.city || '').split(',')[0] || null, live: `/mosque/${encodeURIComponent(c.id)}` });
    }
  }
  const linkOf = (m) => (m.live ? m.live : pageUrl(m));
  const all = [...osm, ...connectOnly];

  const nearestCity = (m) => {
    let best = null;
    for (const c of listed) {
      if (c.country !== m.cc) continue;
      const d = distanceKm(m, c);
      if (!best || d < best.d) best = { d, c };
    }
    return best && best.d <= NEAR_CITY_KM ? best : null;
  };
  const nearby = (m, n = 6, maxKm = 40) => all.filter((x) => x !== m)
    .map((x) => ({ x, d: distanceKm(m, x) })).filter((o) => o.d <= maxKm)
    .sort((a, b) => a.d - b.d).slice(0, n);
  const miles = (km) => `${Math.max(0.1, km * 0.621371).toFixed(km < 16 ? 1 : 0)} mi`;
  const fmtDist = (km, cc) => (cc === 'us' ? miles(km) : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`);
  const where = (m) => [m.town, m.region].filter(Boolean).join(', ');
  const safeUrl = (u) => {
    if (!u) return null;
    const href = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    try { return ['http:', 'https:'].includes(new URL(href).protocol) ? href : null; } catch { return null; }
  };

  const byRegion = new Map();
  for (const m of all) {
    const k = `${m.cc}/${m.region || 'other'}`;
    if (!byRegion.has(k)) byRegion.set(k, []);
    byRegion.get(k).push(m);
  }
  const regionsOf = (cc) => [...byRegion.entries()].filter(([k]) => k.startsWith(`${cc}/`))
    .map(([k, list]) => ({ code: k.split('/')[1], list }))
    .sort((a, b) => regionName(cc, a.code).localeCompare(regionName(cc, b.code)));

  const pages = [];

  // Hub
  {
    const total = all.length;
    const body = `
<main class="wrap">
  <p class="crumbs"><a href="/">iMuslim Life</a> › Masjids</p>
  <section class="hero">
    <h1>Mosque Directory: USA &amp; Canada</h1>
    <p class="sub">${total.toLocaleString('en-US')} masjids and musallas, with directions, Qibla and prayer times</p>
    <p class="btns" style="justify-content:center"><a class="btn" href="/mosque-directory/">Find a masjid near me</a></p>
  </section>
  ${['us', 'ca'].map((cc) => `<section class="card"><h2>Masjids in ${COUNTRY_NAMES[cc]}</h2><ul class="cities">${regionsOf(cc).map(({ code, list }) => `<li><a href="${regionUrl(cc, code)}">${esc(regionName(cc, code))}</a><span>${list.length} ${list.length === 1 ? 'masjid' : 'masjids'}</span></li>`).join('')}</ul></section>`).join('\n  ')}
  <section class="card"><h2>Is your masjid missing or out of date?</h2>
    <p>Masjids on <b>Masjid Connect</b> keep their own iqamah and Jumu&rsquo;ah times, announcements and Alexa reminders up to date here, for free. The rest of the list comes from OpenStreetMap, the free world map anyone can edit.</p>
    <p class="btns"><a class="btn" href="mailto:info@yzinfotech.com?subject=Add%20our%20masjid%20to%20iMuslim%20Life">Add your masjid</a></p>
  </section>
</main>`;
    pages.push([hubUrl, layout({
      title: `Mosque Directory: ${total.toLocaleString('en-US')} Masjids in the USA & Canada | iMuslim Life`,
      description: `Find a masjid in the United States or Canada: ${total.toLocaleString('en-US')} mosques and musallas by state and province, with directions, Qibla direction and today's prayer times.`,
      canonical: hubUrl,
      jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Masjids', hubUrl]])],
      credit,
      body,
    })]);
  }

  // State / province pages
  for (const cc of ['us', 'ca']) {
    for (const { code, list } of regionsOf(cc)) {
      const name = regionName(cc, code);
      const towns = new Map();
      for (const m of [...list].sort((a, b) => a.name.localeCompare(b.name))) {
        const t = m.town || 'Other';
        if (!towns.has(t)) towns.set(t, []);
        towns.get(t).push(m);
      }
      const townList = [...towns.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const cityPagesHere = listed.filter((c) => c.country === cc && list.some((m) => distanceKm(m, c) <= NEAR_CITY_KM));
      const url = regionUrl(cc, code);
      const body = `
<main class="wrap">
  <p class="crumbs"><a href="${hubUrl}">Masjids</a> › ${COUNTRY_NAMES[cc]} › ${esc(name)}</p>
  <section class="hero">
    <h1>Mosques in ${esc(name)}</h1>
    <p class="sub">${list.length} ${list.length === 1 ? 'masjid' : 'masjids and musallas'} in ${townList.length} ${townList.length === 1 ? 'town' : 'towns'}</p>
    <p class="btns" style="justify-content:center"><a class="btn" href="/mosque-directory/">Find a masjid near me</a></p>
  </section>
  <section class="card">
    ${townList.map(([town, ms]) => `<h2 class="town">${esc(town)}</h2><ul class="masjids">${ms.map((m) => `<li><a href="${linkOf(m)}">${esc(m.name)}</a>${m.live || m.connect ? ' <span class="tag ok">Iqamah times</span>' : ''}${m.type === 'musalla' ? ' <span class="tag">Musalla</span>' : ''}${denomination(m) ? ` <span class="tag">${esc(denomination(m))}</span>` : ''}<span>${esc(m.address || where(m))}</span></li>`).join('')}</ul>`).join('\n    ')}
  </section>
  ${cityPagesHere.length ? `<section class="card"><h2>Prayer times in ${esc(name)}</h2><ul class="cities">${cityPagesHere.map((c) => `<li><a href="${cityUrl(c)}">${esc(named(c))}</a><span>Prayer times &amp; Qibla</span></li>`).join('')}</ul></section>` : ''}
  <section class="card"><h2>Is your masjid missing?</h2><p>Add it on Masjid Connect to list your iqamah and Jumu&rsquo;ah times here, or add it to <a href="https://www.openstreetmap.org/" rel="noopener">OpenStreetMap</a>; this page follows OpenStreetMap.</p><p class="btns"><a class="btn" href="mailto:info@yzinfotech.com?subject=Add%20our%20masjid%20to%20iMuslim%20Life">Add your masjid</a></p></section>
</main>`;
      pages.push([url, layout({
        title: `Mosques in ${name}: ${list.length} Masjids, Directions & Prayer Times | iMuslim Life`,
        description: `${list.length} mosques and musallas in ${name}${townList.length > 1 ? `, in ${townList.slice(0, 4).map(([t]) => t).join(', ')} and more` : ''}: addresses, directions, Qibla and today's prayer times.`,
        canonical: url,
        jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Masjids', hubUrl], [name, url]])],
        credit,
        body,
      })]);
    }
  }

  // One page per OSM masjid
  for (const m of osm) {
    const url = pageUrl(m);
    const rname = regionName(m.cc, m.region);
    const near = nearestCity(m);
    const q = qibla(m.lat, m.lon);
    const site = safeUrl(m.connect?.website || m.website);
    const phone = m.connect?.phone || m.phone;
    const denom = denomination(m);
    const addressLine = m.address ? [m.address, m.town, m.region, m.postcode].filter(Boolean).join(', ') : null;
    const osmEdit = `https://www.openstreetmap.org/edit?${m.osm.split('/').slice(-2).join('=')}`;
    const d = 0.004;
    const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${(m.lon - d).toFixed(5)},${(m.lat - d * 0.7).toFixed(5)},${(m.lon + d).toFixed(5)},${(m.lat + d * 0.7).toFixed(5)}&layer=mapnik&marker=${m.lat},${m.lon}`;
    const close = nearby(m);
    const times = near
      ? `<section class="card" id="mt" data-src="/prayer-times/data/${near.c.country}-${near.c.slug}.json">
    <h2>Prayer times today</h2>
    <div class="today">${PRAYERS.map((p) => `<div class="slot" data-p="${p}"><span>${p}</span><b>—</b></div>`).join('')}</div>
    <p class="note">Calculated times for <a href="${cityUrl(near.c)}">${esc(named(near.c))}</a>, ${fmtDist(near.d, m.cc)} away. ${m.connect ? 'The masjid publishes its own iqamah times below.' : 'Iqamah times are set by the masjid and may differ.'}</p>
  </section>`
      : `<section class="card"><h2>Prayer times</h2><p>See today&rsquo;s prayer times for your exact location on <a href="/prayer-times/">iMuslim Life prayer times</a>. Iqamah times are set by the masjid.</p></section>`;
    const body = `
<main class="wrap">
  <p class="crumbs"><a href="${hubUrl}">Masjids</a> › <a href="${regionUrl(m.cc, m.region)}">${esc(rname)}</a> › ${esc(m.name)}</p>
  <section class="hero">
    <h1>${esc(m.name)}</h1>
    <p class="sub">${typeLabel(m)}${denom ? ` · ${esc(denom)}` : ''} · ${esc([m.town, rname].filter(Boolean).join(', '))}</p>
    <p class="btns" style="justify-content:center"><a class="btn" href="https://www.google.com/maps/dir/?api=1&amp;destination=${m.lat},${m.lon}" rel="noopener">Directions</a>${site ? `<a class="btn alt" href="${esc(site)}" rel="noopener nofollow">Website</a>` : ''}${phone ? `<a class="btn alt" href="tel:${esc(String(phone).replace(/[^\d+]/g, ''))}">Call</a>` : ''}</p>
  </section>
  ${m.connect ? `<section class="card cta"><h2>Iqamah &amp; Jumu&rsquo;ah times</h2><p>${esc(m.name)} keeps its iqamah and Jumu&rsquo;ah times and announcements up to date on Masjid Connect.</p><p class="btns"><a class="btn" href="/mosque/${encodeURIComponent(m.connect.id)}">Today&rsquo;s iqamah times</a></p></section>` : ''}
  ${times}
  <div class="two">
    <section class="card">
      <h2>Location</h2>
      <p>${addressLine ? esc(addressLine) : `Near ${esc(where(m) || rname)}. The map shows the exact spot.`}</p>
      ${phone ? `<p>Phone: <a href="tel:${esc(String(phone).replace(/[^\d+]/g, ''))}">${esc(phone)}</a></p>` : ''}
      ${site ? `<p>Website: <a href="${esc(site)}" rel="noopener nofollow">${esc(site.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></p>` : ''}
      <iframe class="map" title="Map of ${esc(m.name)}" src="${mapSrc}" loading="lazy"></iframe>
    </section>
    <section class="card">
      <h2>Qibla</h2>
      <div class="qibla"><svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true"><circle cx="50" cy="50" r="46" class="ring"/><text x="50" y="14" text-anchor="middle">N</text><g transform="rotate(${q.toFixed(1)} 50 50)"><path d="M50 14 L57 52 L50 46 L43 52 Z" class="needle"/></g><circle cx="50" cy="50" r="4" class="hub"/></svg>
      <p>From ${esc(m.name)}, the Qibla is <b>${Math.round(q)}°</b> from true north (${compass(q, 'en')}).</p></div>
    </section>
  </div>
  ${close.length ? `<section class="card"><h2>Masjids nearby</h2><ul class="cities">${close.map(({ x, d: dist }) => `<li><a href="${linkOf(x)}">${esc(x.name)}</a><span>${esc(x.town || '')}${x.town ? ' · ' : ''}${fmtDist(dist, m.cc)}</span></li>`).join('')}</ul></section>` : ''}
  <section class="card">
    <h2>Is this your masjid?</h2>
    <p>Add your iqamah and Jumu&rsquo;ah times, announcements and Alexa reminders on Masjid Connect, free. Something wrong here? Fix it on <a href="${osmEdit}" rel="noopener nofollow">OpenStreetMap</a> (this page follows it) or <a href="mailto:info@yzinfotech.com?subject=${encodeURIComponent(`Correction: ${m.name}`)}">tell us</a>.</p>
    <p class="btns"><a class="btn" href="mailto:info@yzinfotech.com?subject=${encodeURIComponent(`Claim ${m.name} on iMuslim Life`)}">Claim this masjid</a></p>
  </section>
</main>
${near ? `<script>(function(){var el=document.getElementById('mt');fetch(el.dataset.src).then(function(r){return r.json()}).then(function(D){var p={};new Intl.DateTimeFormat('en-CA',{timeZone:D.tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});var day=D.days.filter(function(d){return d.date===p.year+'-'+p.month+'-'+p.day})[0];if(!day)return;el.querySelectorAll('.slot').forEach(function(s){var t=(day.t[s.dataset.p]||'').match(/(\\d{1,2}):(\\d{2})/);if(!t)return;var h=+t[1];s.querySelector('b').textContent=((h+11)%12+1)+':'+t[2]+(h<12?' AM':' PM')})}).catch(function(){})})();</script>` : ''}`;
    const ld = {
      '@type': 'Mosque', name: m.name, url: `${SITE}${url}`,
      geo: { '@type': 'GeoCoordinates', latitude: m.lat, longitude: m.lon },
      address: { '@type': 'PostalAddress', ...(m.address ? { streetAddress: m.address } : {}), ...(m.town ? { addressLocality: m.town } : {}), addressRegion: m.region, ...(m.postcode ? { postalCode: m.postcode } : {}), addressCountry: m.country },
      ...(phone ? { telephone: phone } : {}),
      ...(site ? { sameAs: [site] } : {}),
    };
    pages.push([url, layout({
      title: `${m.name}, ${[m.town, m.region].filter(Boolean).join(', ')}: Directions, Prayer Times & Qibla | iMuslim Life`,
      description: `${m.name}${m.type === 'musalla' ? ' (musalla)' : ''} in ${[m.town, rname].filter(Boolean).join(', ')}: ${addressLine ? `${addressLine}. ` : ''}Directions, ${near ? "today's prayer times, " : ''}Qibla direction${close.length ? ' and masjids nearby' : ''}.`,
      canonical: url,
      jsonLd: [breadcrumb([['iMuslim Life', '/'], ['Masjids', hubUrl], [rname, regionUrl(m.cc, m.region)], [m.name, url]]), ld],
      credit,
      body,
    })]);
  }

  // For the React directory: short keys keep it small.
  const index = all.map((m) => ({
    n: m.name, u: linkOf(m), t: m.town || null, r: m.region || null, c: m.cc,
    la: Math.round(m.lat * 1e5) / 1e5, lo: Math.round(m.lon * 1e5) / 1e5,
    ...(m.type === 'musalla' ? { k: 'musalla' } : {}),
    ...(denomination(m) ? { d: denomination(m) } : {}),
    ...(m.live || m.connect ? { v: (m.connect || m).id } : {}),
  })).sort((a, b) => a.n.localeCompare(b.n));

  // For the city pages: masjids within NEAR_CITY_KM, nearest first.
  const nearCity = (city) => {
    if (!['us', 'ca'].includes(city.country)) return null;
    const list = all.map((m) => ({ m, d: distanceKm(m, city) })).filter((o) => o.d <= NEAR_CITY_KM).sort((a, b) => a.d - b.d);
    if (!list.length) return null;
    const top = list[0].m;
    return {
      count: list.length,
      html: `<section class="card"><h2>Masjids near ${esc(named(city))}</h2><ul class="cities">${list.slice(0, 8).map(({ m, d }) => `<li><a href="${linkOf(m)}">${esc(m.name)}</a><span>${esc(m.town || '')}${m.town ? ' · ' : ''}${fmtDist(d, city.country)}</span></li>`).join('')}</ul><p class="note"><a href="${regionUrl(top.cc, top.region)}">All masjids in ${esc(regionName(top.cc, top.region))}</a> · <a href="/mosque-directory/">Find a masjid near me</a></p></section>`,
    };
  };

  return { pages, index, nearCity, urls: pages.map(([u]) => u) };
}
