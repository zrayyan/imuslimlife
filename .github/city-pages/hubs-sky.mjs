// The prayer-times hub, the country lists and the monthly city pages in the Living Sky (task K04b).
// Pure, like city-sky.mjs: createSite() in render.mjs passes its helpers in (`h`), so the static build and the Worker
// render the same pages. Nothing here fetches or knows the visitor; the Worker paints the visitor's sky over the stored
// copy and fills the hub's "your city" slot per request (worker/src/families/hub-near.js).
import { LANGS } from './i18n.mjs';
import { SKY_TEXT } from './city-sky-i18n.mjs';
import { HUB_TEXT } from './hubs-sky-i18n.mjs';
import { METHODS } from './methods.mjs';
import { RAMADAN_TEXT } from './ramadan-sky-i18n.mjs';
import { indexable } from './indexing.mjs';
import { graphJson } from './schema.mjs';
import { CITY_SKY_CSS_URL } from './city-sky.mjs';
import { header, footer, ltr, esc } from '../sky/chrome.mjs';
import { FONTS, FONT_FILES } from '../sky/css.mjs';
import { stars, moon, scene } from '../sky/scene.mjs';

const SCHEDULE_SLOT = '__SKY_TIMES__';
export const NEAR_SLOT = '__HUB_NEAR__';
const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const DOT = '<svg aria-hidden="true"><defs><pattern id="k2" width="72" height="72" patternUnits="userSpaceOnUse"><path d="M36 6l8.8 21.2L66 36l-21.2 8.8L36 66l-8.8-21.2L6 36l21.2-8.8z" fill="none" stroke="#D9B46A" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#k2)"/></svg>';

// Filters a list of links as you type (progressive: without JavaScript the form searches the whole site at /search/).
const FILTER = `(function(){var f=document.getElementById('hb-q'),n=document.getElementById('hb-none');if(!f)return;function run(){var v=f.value.trim().toLowerCase(),any=false;[].forEach.call(document.querySelectorAll('[data-f]'),function(li){var m=!v||li.getAttribute('data-f').indexOf(v)>-1;li.hidden=!m;if(m)any=true});[].forEach.call(document.querySelectorAll('[data-g]'),function(g){g.hidden=!g.querySelector('[data-f]:not([hidden])')});if(n)n.hidden=any}f.addEventListener('input',run);f.form.addEventListener('submit',function(e){if(v())e.preventDefault();function v(){return f.value.trim()&&document.querySelector('[data-f]:not([hidden])')}})})();`;

const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** The whole document around a stage and a body. */
export function skyDoc(h, { L, title, description, canonical, alternates, jsonLd, noindex = false, robotsOnly = false, image = null, stage, main, scripts = '', hrefs = null, htmlAttrs = '', head = '' }) {
  const T = LANGS[L];
  const index = !noindex && indexable(canonical, h.TODAY);
  const seo = index ? alternates.filter(([, u]) => indexable(u, h.TODAY)) : [];
  const hreflang = seo.length >= 1 ? `\n${seo.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${h.SITE}${u}">`).join('\n')}\n<link rel="alternate" hreflang="x-default" href="${h.SITE}${seo[0][1]}">` : '';
  const hr = hrefs || Object.fromEntries(alternates.length ? alternates : [[L, canonical]]);
  return `<!DOCTYPE html>
<html lang="${L}"${T.dir === 'rtl' ? ' dir="rtl"' : ''} data-sky="dhuhr" data-sky-times="${SCHEDULE_SLOT}"${htmlAttrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${index ? '' : '\n<meta name="robots" content="noindex,follow">'}
<link rel="canonical" href="${h.SITE}${canonical}">${hreflang}
<meta property="og:type" content="website">
<meta property="og:site_name" content="iMuslim Life">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${h.SITE}${canonical}">
<meta property="og:image" content="${h.SITE}${image || '/logo512.png'}">${image ? '\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">' : ''}
<meta name="theme-color" content="#07150F">${head}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" as="font" type="font/woff2" href="${FONT_FILES.marcellus}" crossorigin><link rel="preload" as="font" type="font/woff2" href="${FONT_FILES.inter}" crossorigin>
<link rel="stylesheet" href="${CITY_SKY_CSS_URL}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${FONTS}"></noscript>
<script type="application/ld+json">${graphJson(jsonLd)}</script>
${h.BEACON}
</head>
<body>
${stage}
<main class="ct ct-main">
${main}
</main>
${h.footLine ? h.footLine(L) : ''}
${footer({ lang: L, path: canonical, hrefs: hr })}
${scripts}
</body>
</html>
`;
}

/** The sky stage under the header: breadcrumb, h1, a sentence, optional extra (search) and an aside card. */
export function stage(L, { crumbs, h1, sub = '', extra = '', aside = '' }) {
  return `<div class="sk-stage ct-stage">${stars()}${moon()}${scene()}${header({ lang: L, current: 'times' })}
<div class="sk-content ct" id="main"><div class="ct-top"><div class="ct-id"><nav class="ct-crumbs" aria-label="Breadcrumb">${crumbs}</nav><h1 class="ct-h1">${h1}</h1>${sub ? `<p class="hb-sub">${sub}</p>` : ''}${extra}</div>${aside}</div></div></div>
<div class="ct-ground"></div>`;
}

const searchForm = (L, { id = 'hb-q', placeholder, label }) => {
  const H = HUB_TEXT[L] || HUB_TEXT.en;
  return `<form class="hb-search" role="search" action="${L === 'en' ? '' : `/${L}`}/search/" method="get"><label class="sk-sr" for="${id}">${esc(label || placeholder)}</label><input id="${id}" name="q" type="search" placeholder="${esc(placeholder)}" autocomplete="off"><button type="submit">${esc(H.go)}</button></form>`;
};

const itemList = (name, items) => ({ '@type': 'ItemList', name, numberOfItems: items.length, itemListElement: items.map(([n, url], i) => ({ '@type': 'ListItem', position: i + 1, name: n, url })) });

/** How many cities each country shows in the hub's country list, and the cities the hub names first (the list's own order is by search interest). */
const POPULAR = 24;

/** The prayer-times hub, /prayer-times/ (English). Its "your city" card is the slot NEAR_SLOT, filled per visitor. */
export function hubPage(h, { opts = {} } = {}) {
  const L = 'en';
  const T = LANGS.en;
  const H = HUB_TEXT.en;
  const all = h.inLang(L);
  const countries = h.countriesIn(L);
  const popular = all.slice(0, POPULAR);
  const counts = new Map(countries.map(([cc]) => [cc, all.filter((c) => c.country === cc).length]));
  // Facts computed from the site's own engine for today (task 152): extremes, methods and where they are used.
  const f = h.hubFacts();
  const t12 = (t) => { const { t: v, suffix } = h.clock(t, L); return `${v}${suffix ? ` ${suffix}` : ''}`; };
  const cityLink = (c) => `<a href="${h.cityUrl(c, L)}">${esc(h.cname(c, L))}</a>, ${esc(h.kname(c.country, L))}`;
  const span = (min) => `${Math.floor(min / 60)} h ${min % 60} min`;
  const ccList = (ccs, n = 4) => { const names = ccs.map((cc) => h.kname(cc, L)); return names.length <= n ? names.join(', ') : `${names.slice(0, n).join(', ')} and ${names.length - n} more`; };
  const fact = (label, x, fmt) => `<li><small>${label}</small><b>${fmt(x.value)}</b><span>${cityLink(x.city)}</span></li>`;
  const todayLong = h.dateIn(f.date, L, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const rm = opts.ramadan;
  const ramLong = (iso) => h.dateIn(iso, L, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const methodCards = f.methods.slice(0, 6).map((m) => `<div class="ct-card"><h3>${esc(m.name)}</h3><p>Used for ${esc(H.count(m.cities))} in ${esc(ccList(m.ccs))}.</p></div>`).join('');
  const canonical = '/prayer-times/';
  const crumbs = `<a href="/">iMuslim Life</a> › ${esc(T.root)}`;
  const popularHtml = `<ul class="hb-chips">${popular.map((c) => `<li><a href="${h.cityUrl(c, L)}"><b>${esc(h.named(c, L))}</b><span>${esc(h.rname(c, L) ? `${h.rname(c, L)}, ` : '')}${esc(h.kname(c.country, L))}</span></a></li>`).join('')}</ul>`;
  const countriesHtml = `<ul class="hb-chips">${countries.map(([cc]) => `<li><a href="${h.countryUrl(cc, L)}"><b>${esc(h.kname(cc, L))}</b><span>${esc(H.count(counts.get(cc)))}</span></a></li>`).join('')}</ul>`;
  const st = stage(L, {
    crumbs, h1: 'Prayer times for your city',
    sub: `Today’s Fajr, Dhuhr, Asr, Maghrib and Isha for ${all.length} cities in ${countries.length} countries, with monthly timetables, Hijri dates and the Qibla direction.`,
    extra: searchForm(L, { placeholder: 'Ask: prayer times in Orlando', label: 'Ask about a city or a prayer time' }),
    aside: NEAR_SLOT,
  });
  const ramadanHtml = rm ? `
<section class="hb-sec" aria-labelledby="ram-h"><h2 id="ram-h">Ramadan ${esc(rm.hijriYear)}</h2>
<p>By the Umm al-Qura calendar of Makkah, Ramadan ${esc(rm.hijriYear)} begins on ${esc(ramLong(rm.start))}${rm.eid ? ` and Eid al-Fitr falls on ${esc(ramLong(rm.eid))}` : ''}. Local moon sighting can move either date by a day. Each city below has its own timetable for the whole month, with Suhoor and Iftar, and a calendar file you can subscribe to.</p>
<ul class="hb-chips">${popular.slice(0, 8).map((c) => `<li><a href="${h.ramadanCityUrl(c, L)}"><b>${esc(h.named(c, L))}</b><span>Ramadan ${esc(rm.hijriYear)} timetable</span></a></li>`).join('')}</ul>
<p><a href="${rm.url}">All of Ramadan ${esc(rm.year)}</a></p></section>` : '';
  const dayHtml = !f.fajr.earliest ? '' : `
<section class="hb-sec" aria-labelledby="day-h"><h2 id="day-h">Today across ${f.cities} cities</h2>
<p>On ${esc(todayLong)}, read on each city’s own clock, Fajr is earliest in ${cityLink(f.fajr.earliest.city)} and latest in ${cityLink(f.fajr.latest.city)}. Maghrib is earliest in ${cityLink(f.maghrib.earliest.city)} and latest in ${cityLink(f.maghrib.latest.city)}. The spread comes from latitude, season and daylight-saving clocks: the longest listed day is ${span(f.day.longest.value)} in ${cityLink(f.day.longest.city)} and the shortest ${span(f.day.shortest.value)} in ${cityLink(f.day.shortest.city)}.</p>
<ul class="hb-facts">${fact('Earliest Fajr', f.fajr.earliest, t12)}${fact('Latest Fajr', f.fajr.latest, t12)}${fact('Earliest Maghrib', f.maghrib.earliest, t12)}${fact('Latest Maghrib', f.maghrib.latest, t12)}${fact('Longest day, sunrise to Maghrib', f.day.longest, span)}${fact('Shortest day, sunrise to Maghrib', f.day.shortest, span)}</ul></section>`;
  const main = `${dayHtml}
<section class="hb-sec" aria-labelledby="pop-h"><h2 id="pop-h">Popular cities</h2>${popularHtml}</section>${ramadanHtml}
<section class="hb-sec" aria-labelledby="cty-h"><h2 id="cty-h">Prayer times by country</h2>${countriesHtml}<p><a href="${h.countriesUrl(L)}">All ${all.length} cities in ${countries.length} countries</a></p></section>
<section class="hb-sec" aria-labelledby="how-h"><h2 id="how-h">How the times are calculated</h2>
<p>There are five daily prayers, and each begins from the sun’s position at your city’s coordinates, in its time zone.</p>
<dl class="hb-prayers">
<div><dt>Fajr</dt><dd>Dawn. It begins when the first light spreads across the sky, with the sun about 15 to 19.5 degrees below the horizon depending on the method, and ends at sunrise.</dd></div>
<div><dt>Dhuhr</dt><dd>Midday. It begins just after the sun passes its highest point and lasts until Asr.</dd></div>
<div><dt>Asr</dt><dd>Afternoon. It begins when an object’s shadow reaches its own length (standard) or twice its length (Hanafi), plus the shadow at noon.</dd></div>
<div><dt>Maghrib</dt><dd>Sunset. It begins as the sun sets, which is also when a fast is broken.</dd></div>
<div><dt>Isha</dt><dd>Night. It begins when the evening twilight has gone, with the sun about 15 to 18 degrees below the horizon, or a fixed time after Maghrib in a few methods.</dd></div>
</dl>
<h3 class="hb-h3">Calculation methods in use</h3>
<p>Countries and communities agree on different twilight angles, so every city here uses the method of its own country. ${f.methods.length} methods are in use across the ${f.cities} cities, and you can change the method on any city page with the <a href="${h.cityUrl(popular[0], L)}#pt-calc">method picker</a>.</p>
<div class="hb-how">${methodCards}</div>
<h3 class="hb-h3">Asr: two schools</h3>
<p>The standard rule (Shafi’i, Maliki and Hanbali) is used for ${esc(H.count(f.asr.standard.cities))} in ${f.asr.standard.ccs.length} countries. ${f.asr.hanafi.cities ? `The Hanafi rule, with its later Asr, is used for ${esc(H.count(f.asr.hanafi.cities))} in ${esc(ccList(f.asr.hanafi.ccs, 5))}.` : ''}</p>
<h3 class="hb-h3">Far north and far south</h3>
${f.north ? `<p>Beyond about 48 degrees of latitude the sky may never get dark enough for the usual Fajr and Isha angles in summer. Where that happens the times are set from a share of the night instead (the angle-based rule). The northernmost city listed is ${cityLink(f.north.city)} at ${esc(f.north.lat.toFixed(1))}° ${f.north.city.lat < 0 ? 'south' : 'north'}.</p>` : ''}
<p>Your masjid’s timetable may differ by a few minutes, because a masjid sets its own iqāmah. <a href="/about/methodology/">Read the full method</a>.</p></section>
<section class="hb-sec" aria-labelledby="more-h"><h2 id="more-h">More for the month and the year</h2><div class="hb-links"><a href="${h.hubUrl(L)}">${esc(T.cal.all)}</a>${opts.ramadan ? `<a href="${opts.ramadan.url}">${esc(T.foot.ramadan(opts.ramadan.year))}</a>` : ''}<a href="/qibla/">Qibla direction</a><a href="/places/">Masjids and halal food near you</a><a href="/mobile-app/">Get the app</a></div></section>`;
  const jsonLd = [
    h.breadcrumb([['iMuslim Life', '/'], [T.root, canonical]]),
    { '@type': 'CollectionPage', name: 'Prayer times for your city', url: `${h.SITE}${canonical}`, inLanguage: 'en', dateModified: f.date, about: { '@type': 'Thing', name: 'Islamic prayer times' }, isPartOf: { '@id': `${h.SITE}/#website` } },
    itemList('Popular cities', popular.map((c) => [h.named(c, L), `${h.SITE}${h.cityUrl(c, L)}`])),
    itemList('Countries', countries.map(([cc]) => [h.kname(cc, L), `${h.SITE}${h.countryUrl(cc, L)}`])),
  ];
  return skyDoc(h, {
    L, title: `Prayer Times Worldwide: ${all.length} Cities in ${countries.length} Countries | iMuslim Life`,
    description: `Prayer times for your city: today’s Fajr, Dhuhr, Asr, Maghrib and Isha for ${all.length} cities in ${countries.length} countries, monthly timetables with Hijri dates, and the Qibla direction. Free and ad-free.`,
    canonical, alternates: [['en', canonical]], jsonLd, stage: st, main, scripts: '',
  });
}

/** The hub's slot for a visitor with no known place, or one far from every city. */
export const nearFallback = () => `<aside class="ct-next hb-near" aria-label="Find your city">${DOT}<span class="ct-eyebrow">Your city</span><span class="ct-nrow"><span class="ct-nn">Find your city</span></span><span class="ct-nc">Search above, or choose a country below, for today’s times.</span><a class="hb-go" href="/prayer-times/countries/">All countries →</a></aside>`;

/**
 * The "your city" card.
 * @param {object} h render.mjs helpers
 * @param {{city:object, km:number, iso:string, day:object, nowMin:number}} o day: {Fajr..Isha: 'HH:MM'}, nowMin: minutes since local midnight
 */
export function nearCard(h, { city, km, iso, day, nowMin }) {
  const L = 'en';
  const T = LANGS.en;
  const mins = (t) => { const [a, b] = String(t).split(':').map(Number); return a * 60 + b; };
  const five = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  let next = five.find((p) => mins(day[p]) > nowMin);
  let tomorrow = false;
  if (!next) { next = 'Fajr'; tomorrow = true; }
  const at = mins(day[next]) + (tomorrow ? 1440 : 0);
  const left = Math.max(0, at - Math.floor(nowMin));
  const lh = Math.floor(left / 60), lm = left % 60;
  const t12 = (t) => { const { t: v, suffix } = h.clock(t, L); return `${v}${suffix ? ` ${suffix}` : ''}`; };
  const n = h.cname(city, L);
  const own = km <= 40;
  const date = h.dateIn(iso, L, { weekday: 'long', day: 'numeric', month: 'long' });
  return `<aside class="ct-next hb-near" aria-label="${own ? 'Your city' : 'Nearest city'}">${DOT}<span class="ct-eyebrow">${own ? 'Your city' : `Nearest city · ${Math.round(km)} km`}</span><span class="ct-nrow"><a class="ct-nn" href="${h.cityUrl(city, L)}">${esc(n)}</a><span class="ct-nt">${esc(T.prayers[next])} ${ltr(t12(day[next]))}</span></span><span class="ct-nc">${esc(date)} · ${tomorrow ? 'Fajr tomorrow, ' : 'next prayer '}in ${lh ? `${lh} h ` : ''}${lm} min</span><ul class="hb-times">${PRAYERS.map((p) => `<li${p === next && !tomorrow ? ' class="is-next"' : ''}><span>${esc(T.prayers[p])}</span><b>${ltr(t12(day[p]))}</b></li>`).join('')}</ul><a class="hb-go" href="${h.cityUrl(city, L)}">All times for ${esc(n)} →</a><span class="hb-note">${esc(h.mname(city.country, L))}</span></aside>`;
}

/** /prayer-times/countries/ in a language: every country, its cities, a filter. */
export function countriesSkyPage(h, L) {
  const T = LANGS[L];
  const H = HUB_TEXT[L] || HUB_TEXT.en;
  const list = h.countriesIn(L);
  const cs = h.inLang(L);
  const canonical = h.countriesUrl(L);
  const crumbs = `<a href="${h.rootUrl(L)}">${esc(T.root)}</a> › ${esc(T.countriesCrumb)}`;
  const st = stage(L, { crumbs, h1: esc(T.countries.h1), sub: esc(T.countries.sub(cs.length, list.length)), extra: searchForm(L, { id: 'hb-q', placeholder: H.filter }) });
  const main = `<div class="hb-all">${list.map(([cc]) => { const mine = cs.filter((x) => x.country === cc); return `<section class="hb-country" data-g aria-labelledby="c-${cc}"><h2 id="c-${cc}"><a href="${h.countryUrl(cc, L)}">${esc(h.kname(cc, L))}</a><small>${esc(H.count(mine.length))}</small></h2><ul class="hb-city-list">${mine.map((x) => `<li data-f="${esc(fold(`${h.named(x, L)} ${h.cname(x, 'en')} ${h.kname(cc, L)}`))}"><a href="${h.cityUrl(x, L)}">${esc(h.named(x, L))}</a></li>`).join('')}</ul></section>`; }).join('')}</div>
<p class="hb-none" id="hb-none" hidden>${esc(H.none)}</p>`;
  const jsonLd = [
    h.breadcrumb([['iMuslim Life', '/'], [T.root, h.rootUrl(L)], [T.countriesCrumb, canonical]]),
    itemList(T.countries.h1, list.map(([cc]) => [h.kname(cc, L), `${h.SITE}${h.countryUrl(cc, L)}`])),
  ];
  return skyDoc(h, { L, title: T.countries.title(cs.length), description: T.countries.description(cs.length, list.length), canonical, alternates: h.ALL_LANGS.map((l) => [l, h.countriesUrl(l)]), jsonLd, stage: st, main, scripts: `<script>${FILTER}</script>` });
}

/** /prayer-times/<cc>/ in a language: the country's cities as tiles, with a filter. */
export function countrySkyPage(h, cc, L) {
  const T = LANGS[L];
  const H = HUB_TEXT[L] || HUB_TEXT.en;
  const list = h.inLang(L).filter((c) => c.country === cc);
  const k = h.kname(cc, L);
  const canonical = h.countryUrl(cc, L);
  const crumbs = `<a href="${h.rootUrl(L)}">${esc(T.root)}</a> › <a href="${h.countriesUrl(L)}">${esc(T.countriesCrumb)}</a> › ${esc(k)}`;
  const st = stage(L, { crumbs, h1: esc(T.country.h1(k)), sub: `${esc(T.country.sub(h.mname(cc, L), h.aname(cc, L)))} ${esc(H.count(list.length))}.`, extra: list.length > 8 ? searchForm(L, { id: 'hb-q', placeholder: H.filter }) : '' });
  const others = h.countriesIn(L).filter(([x]) => x !== cc).slice(0, 12);
  const main = `<section class="hb-sec" aria-labelledby="cit-h"><h2 id="cit-h">${esc(T.country.cities)}</h2><ul class="hb-chips">${list.map((c) => `<li data-f="${esc(fold(`${h.named(c, L)} ${h.cname(c, 'en')} ${h.rname(c, L)}`))}"><a href="${h.cityUrl(c, L)}"><b>${esc(h.named(c, L))}</b><span>${esc(h.rname(c, L))}</span></a></li>`).join('')}</ul><p class="hb-none" id="hb-none" hidden>${esc(H.none)}</p></section>
<section class="hb-sec" aria-labelledby="oth-h"><h2 id="oth-h">${esc(T.country.others)}</h2><ul class="hb-city-list">${others.map(([x]) => `<li><a href="${h.countryUrl(x, L)}">${esc(h.kname(x, L))}</a></li>`).join('')}</ul><p><a href="${h.countriesUrl(L)}">${esc(T.country.all(h.countriesIn(L).length, h.inLang(L).length))}</a></p></section>`;
  const jsonLd = [
    h.breadcrumb([['iMuslim Life', '/'], [T.root, h.rootUrl(L)], [k, canonical]]),
    itemList(T.country.h1(k), list.map((c) => [h.named(c, L), `${h.SITE}${h.cityUrl(c, L)}`])),
  ];
  return skyDoc(h, {
    L, title: T.country.title(k, list.slice(0, list.length > 2 ? 3 : 2).map((c) => h.cname(c, L)), list.length > 2),
    description: T.country.description(k, list.length, h.mname(cc, L)), canonical, alternates: h.langsOf(cc).map((l) => [l, h.countryUrl(cc, l)]), jsonLd, stage: st, main,
    scripts: list.length > 8 ? `<script>${FILTER}</script>` : '',
  });
}

/**
 * /prayer-times/<cc>/<city>/<month>/: the K04 look for a whole month, with Jumuʿah rows. The times are the page's own month data.
 * @param {object} o {city, month, now, L, faq, intro:{h, paras}, ram, ramYear, label}
 */
export function monthSkyPage(h, { city, month, now, L, faq, intro, ram, ramYear, label }) {
  const T = LANGS[L];
  const S = SKY_TEXT[L] || SKY_TEXT.en;
  const cc = city.country;
  const n = h.cname(city, L);
  const first = month.days[0], last = month.days[month.days.length - 1];
  const canonical = h.monthUrl(city, month.m, L);
  const timeOf = (t) => { const { t: v, suffix } = h.clock(t, L); return suffix ? `${v} ${suffix}` : v; };
  const crumbs = `<a href="${h.rootUrl(L)}">${esc(T.root)}</a> › <a href="${h.countryUrl(cc, L)}">${esc(h.kname(cc, L))}</a> › <a href="${h.cityUrl(city, L)}">${esc(n)}</a> › ${esc(h.monthName(month.m, L))}`;
  const sub = `${esc(h.place(city, L))}${h.sep(L)}${esc(h.kname(cc, L))} · ${esc(h.hijri(first.hijri, L))} – ${esc(h.hijri(last.hijri, L))} · ${esc(T.month.sub(h.mname(cc, L), h.aname(cc, L)))}`;
  const ramLink = ` <a href="${h.cityUrl(city, L)}ramadan/">${esc(RAMADAN_TEXT[L].whole(n))}</a>`; // K13
  const ramNote = ram.length ? `<p class="ct-answer">${T.month.ramNote(esc(ramYear), h.dateIn(ram[0].date, L, { month: 'long', day: 'numeric' }))}${ramLink}</p>` : '';
  const extra = `${ramNote}<p class="ct-btns top"><a class="ct-btn" href="${h.cityUrl(city, L)}">${esc(T.month.today(n))}</a><button class="ct-btn alt" type="button" onclick="window.print()">${esc(T.month.print)}</button></p>`;
  const st = stage(L, { crumbs, h1: esc(T.month.h1(h.named(city, L), label)), sub, extra });
  const rows = month.days.map((d) => {
    const isFri = new Date(`${d.date}T12:00:00Z`).getUTCDay() === 5;
    const isRam = /^\d+ Ramadan /.test(d.hijri);
    const cls = `${isFri ? 'is-fri ' : ''}${isRam ? 'is-ram' : ''}`.trim();
    const hj = h.hijri(d.hijri, L).replace(/ \d+$/, '');
    return `<tr data-date="${d.date}"${cls ? ` class="${cls}"` : ''}><th scope="row">${h.dateIn(d.date, L, { weekday: 'short', day: 'numeric' })} <span class="ct-tag">${isFri ? S.jumuah : ''}</span></th><td class="sf">${esc(hj)}</td>${PRAYERS.map((p) => `<td${p === 'Sunrise' ? ' class="sf"' : ''}>${ltr(timeOf(d.t[p]))}</td>`).join('')}</tr>`;
  }).join('');
  const caption = T.month.caption(h.place(city, L), label);
  const table = `<div class="ct-tw"><table data-tz="${esc(city.tz)}"><caption>${esc(caption)}</caption><thead><tr><th scope="col">${T.date}</th><th scope="col">${S.hijriCol}</th>${PRAYERS.map((p) => `<th scope="col">${T.prayers[p]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const placesHref = `${L === 'en' ? '' : `/${L}`}/places/search/?q=${encodeURIComponent(n)}`;
  const jam = `<section class="ct-card ct-jam" aria-labelledby="jam-h"><div class="ct-jh"><h2 id="jam-h">${S.jamH}</h2><span class="ct-badge">Masjid Connect</span></div><p>${esc(S.jamSub(n))}</p><a class="all" href="${placesHref}">${esc(S.jamAll(n))} →</a></section>`;
  const method = `<section class="ct-card" aria-labelledby="mt-h"><h2 id="mt-h">${esc(T.pick.method)}</h2><p>${esc(h.mname(cc, L))}, ${esc(h.aname(cc, L))}.</p><a href="${h.cityUrl(city, L)}#times">${esc(T.pick.h)} →</a></section>`;
  const body = `
<section class="ct-cols"><section class="ct-month" aria-labelledby="month-h"><div class="ct-mh"><h2 id="month-h">${esc(caption)}</h2></div>${table}<p class="ct-printnote">imuslimlife.com${canonical} · ${esc(T.month.printnote(h.mname(cc, L)))}</p></section>
<aside class="ct-side">${jam}${method}</aside></section>
<section class="ct-sec"><h2>${esc(intro.h)}</h2>${intro.paras.map((p) => `<p>${p}</p>`).join('')}</section>
<section class="ct-sec"><h2>${esc(T.month.others(n))}</h2>${h.monthLinks(city, now, month.m, L).replace('class="months"', 'class="ct-months"')}</section>
${h.ctaSky(city, L)}
<section class="ct-faq" aria-labelledby="faq-h"><h2 id="faq-h">${T.city.questions}</h2>${faq.map(([qq, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(qq)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
  const today = `<script>(function(){var t=document.querySelector('table[data-tz]');if(!t)return;var p={};new Intl.DateTimeFormat('en-CA',{timeZone:t.getAttribute('data-tz'),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});var r=t.querySelector('tr[data-date="'+p.year+'-'+p.month+'-'+p.day+'"]');if(r){r.classList.add('is-today');var g=r.querySelector('.ct-tag');if(g&&!g.textContent)g.textContent=${JSON.stringify(S.todayTag)}}})();</script>`;
  const jsonLd = [h.breadcrumb([['iMuslim Life', '/'], [T.root, h.rootUrl(L)], [h.kname(cc, L), h.countryUrl(cc, L)], [n, h.cityUrl(city, L)], [label, canonical]]), h.faqLd(faq)];
  return skyDoc(h, {
    L, title: T.month.title(h.named(city, L), label, ram.length > 0), description: T.month.description(n, label, ram.length ? ramYear : null), canonical,
    alternates: h.langsOf(cc).map((l) => [l, h.monthUrl(city, month.m, l)]), image: h.ogImage(city), jsonLd, stage: st, main: body, scripts: today,
  });
}
