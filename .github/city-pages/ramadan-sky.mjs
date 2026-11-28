// A city's whole Ramadan on one page, in the Living Sky (task K13): /prayer-times/<cc>/<city>/ramadan/ and
// /<lang>/prayer-times/... in the city's languages. Pure like hubs-sky.mjs: render.mjs passes its helpers (`h`)
// and the city's fast (ramadanFast), so the nightly build and the Worker render the same bytes.
import { esc, ltr } from '../sky/chrome.mjs';
import { LANGS } from './i18n.mjs';
import { MONTH_TEXT } from './month-i18n.mjs';
import { hm } from './month-facts.mjs';
import { skyDoc, stage } from './hubs-sky.mjs';
import { RAMADAN_TEXT, REVIEWED } from './ramadan-sky-i18n.mjs';
import { SKY_TEXT } from './city-sky-i18n.mjs';
// Same values as places-pages/store-urls.mjs; kept here because publish-site.sh copies only city-pages modules.
const APP_STORE_ID = '6743494825';
const APP_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.rayyan.salatemustaqeem';

const mins = (t) => { const [a, b] = String(t).split(':').map(Number); return a * 60 + b; };
export const dur = (n, L = 'en') => { const { h, m } = hm(n); return (MONTH_TEXT[L] || MONTH_TEXT.en).dur(h, m); };
const day = (h, iso, L, opts = { weekday: 'long', month: 'long', day: 'numeric' }) => h.dateIn(iso, L, opts);
const SHORT = { weekday: 'short', month: 'short', day: 'numeric' };

/**
 * The month drawing: one pillar of light per day, from suhoor (top) to iftar (bottom). A whole-day scale would
 * hide the change (fasts move by minutes, not hours), so each edge has its own band: the top band spans the
 * month's suhoor times, the bottom band its iftar times, both labelled, and the gap between them is the body
 * of the fast. The last ten are gold; a dot marks each odd night at the evening it begins. Inline SVG: no
 * script, theme tokens, labelled for screen readers. `compact` is the phone version (CSS picks one).
 */
export function fastChart(f, timeOf, { compact = false, L = 'en' } = {}) {
  const R = RAMADAN_TEXT[L];
  const rtl = LANGS[L].dir === 'rtl';
  const id = compact ? 'rf-n' : 'rf-w';
  const W = compact ? 360 : 720, H = compact ? 330 : 300, Lm = compact ? 62 : 72, Rm = compact ? 4 : 12;
  const n = f.days.length;
  const band = compact ? 72 : 64, gap = compact ? 104 : 92, T = 24;
  const top0 = T, top1 = T + band, bot0 = top1 + gap, bot1 = bot0 + band;
  const sv = f.days.map((d) => mins(d.suhoor)), iv = f.days.map((d) => mins(d.iftar));
  const span = (v) => [Math.min(...v), Math.max(...v)];
  const [s0, s1] = span(sv), [i0, i1] = span(iv);
  const ys = (t) => top0 + (s1 === s0 ? band / 2 : ((t - s0) / (s1 - s0)) * band);
  const yi = (t) => bot0 + (i1 === i0 ? band / 2 : ((t - i0) / (i1 - i0)) * band);
  const col = (W - Lm - Rm) / n, w = Math.max(3, col - (compact ? 2 : 4));
  const r1 = (v) => Math.round(v * 10) / 10;
  // Day 1 sits on the reading side: the left in LTR, the right in Arabic and Urdu.
  const x = (i) => (rtl ? W - Lm - col * (i + 1) + (col - w) / 2 : Lm + col * i + (col - w) / 2);
  const ax = rtl ? W - Lm + 10 : Lm - 10, anchor = rtl ? 'start' : 'end', kx = rtl ? W - 4 : 4, kAnchor = rtl ? 'end' : 'start';
  const pillars = f.days.map((d, i) => `<rect class="rf-p${d.n >= 21 ? ' rf-p10' : ''}" fill="url(#${id}-g)" x="${r1(x(i))}" y="${r1(ys(sv[i]))}" width="${r1(w)}" height="${r1(yi(iv[i]) - ys(sv[i]))}" rx="${r1(Math.min(6, w / 2))}"><title>${esc(R.barTitle(d.n, timeOf(d.suhoor), timeOf(d.iftar), dur(d.fast, L)))}</title></rect>`).join('');
  const stars = f.oddNights.map((o) => {
    const i = f.days.findIndex((d) => d.date === o.date);
    return i < 0 ? '' : `<circle class="rf-star" cx="${r1(x(i) + (rtl ? -2 : w + 2))}" cy="${r1(yi(iv[i]) + 9)}" r="2.6"><title>${esc(R.nightTitle(o.night, f.days[i].n))}</title></circle>`;
  }).join('');
  const hhmm = (v) => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
  const lab = (y, v) => `<text class="rf-t" x="${ax}" y="${r1(y + 4)}" text-anchor="${anchor}" direction="ltr">${esc(timeOf(hhmm(v)))}</text>`;
  const ten = f.days.findIndex((d) => d.n === 21);
  const tenLbl = ten > -1 ? `<text class="rf-lbl" x="${rtl ? Rm : W - Rm}" y="${T - 10}" text-anchor="${rtl ? 'start' : 'end'}">${esc(R.lastTen)}</text>` : '';
  const ticks = (compact ? [1, 21, n] : [1, 10, 20, n]).map((k) => `<text class="rf-ax" x="${r1(x(k - 1) + w / 2)}" y="${H - 8}" text-anchor="middle">${k}</text>`).join('');
  const a = f.days[0], z = f.days[n - 1];
  const mid = (top1 + bot0) / 2;
  const desc = R.chartDesc(n, timeOf(a.suhoor), timeOf(z.suhoor), timeOf(a.iftar), timeOf(z.iftar), dur(a.fast, L), dur(z.fast, L), z.n);
  return `<svg class="rf-chart ${compact ? 'rf-narrow' : 'rf-wide'}" viewBox="0 0 ${W} ${H}" direction="ltr" role="img" aria-labelledby="${id}-t ${id}-d"><title id="${id}-t">${esc(R.chartTitle)}</title><desc id="${id}-d">${esc(desc)}</desc>
<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="rf-dawn"/><stop offset=".55" class="rf-day"/><stop offset="1" class="rf-dusk"/></linearGradient></defs>
<text class="rf-k" x="${kx}" y="${r1((top0 + top1) / 2 + 4)}" text-anchor="${kAnchor}">${esc(R.suhoorK)}</text><text class="rf-k" x="${kx}" y="${r1((bot0 + bot1) / 2 + 4)}" text-anchor="${kAnchor}">${esc(R.iftarK)}</text>
${lab(top0, s0)}${s1 !== s0 ? lab(top1, s1) : ''}${lab(bot0, i0)}${i1 !== i0 ? lab(bot1, i1) : ''}
<line class="rf-cut" x1="${rtl ? Rm : Lm - 4}" x2="${rtl ? W - Lm + 4 : W - Rm}" y1="${r1(mid - 6)}" y2="${r1(mid - 6)}"/><line class="rf-cut" x1="${rtl ? Rm : Lm - 4}" x2="${rtl ? W - Lm + 4 : W - Rm}" y1="${r1(mid + 6)}" y2="${r1(mid + 6)}"/>
${tenLbl}${pillars}${stars}${ticks}<text class="rf-ax" x="${ax}" y="${H - 8}" text-anchor="${anchor}">${esc(R.dayK)}</text></svg>`;
}

const CSS = `<style>
.rf-hero{display:flex;flex-direction:column;gap:12px}
.rf-chart{inline-size:100%;block-size:auto;display:block;padding:20px 16px 8px;border-radius:22px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}
.rf-dawn{stop-color:var(--gold)}.rf-day{stop-color:var(--gold);stop-opacity:.55}.rf-dusk{stop-color:var(--accent)}
.rf-p{opacity:.78}.rf-p10{opacity:1}
.rf-star{fill:var(--gold)}
.rf-cut{stroke:var(--card);stroke-width:5}
.rf-ax,.rf-t{font:500 12px var(--sans);fill:var(--soft);font-variant-numeric:tabular-nums}
.rf-narrow .rf-ax,.rf-narrow .rf-t{font-size:13px}
.rf-k,.rf-lbl{font:600 10px var(--sans);letter-spacing:.12em;text-transform:uppercase;fill:var(--gold)}
[dir=rtl] .rf-k,[dir=rtl] .rf-lbl{letter-spacing:0;font-size:12px;text-transform:none}
.rf-key{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0;font-size:13px;color:var(--soft)}
.ct-tw tbody tr.is-ten th[scope=row]{box-shadow:inset 3px 0 var(--gold)}
[dir=rtl] .ct-tw tbody tr.is-ten th[scope=row]{box-shadow:inset -3px 0 var(--gold)}
.rf-cal .ct-btns{display:flex;flex-wrap:wrap;gap:8px}
.rf-print{display:none}
.rf-narrow{display:none}
@media (max-width:600px){.rf-wide{display:none}.rf-narrow{display:block;padding:14px 8px 6px}}
@media print{
  @page{size:A4;margin:12mm}
  html,body,.ct-main{background:#fff!important}
  .rf-hero,.rf-noprint,.ct-sec,.ct-faq,.ct-side,.sk-footer,.ct-mh{display:none!important}
  .ct-cols,.ct-month,.ct-tw{display:block!important;break-inside:auto!important;overflow:visible!important;margin:0!important;padding:0!important;gap:0!important}
  .ct-main{padding:0!important;margin:0!important;gap:0!important}.ct-printnote{margin:2mm 0 0!important;font-size:7.5pt}
  .rf-print{display:block;margin:0 0 4mm}.rf-print h1{font:400 22pt var(--serif);margin:0}.rf-print p{margin:1mm 0 0;font-size:10pt}
  .rf-print .rf-masjid{font-size:14pt;font-weight:600}
  .ct-tw{box-shadow:none;border-radius:0}.ct-tw table{min-inline-size:0;font-size:9pt}.ct-tw thead th{padding:1.5mm 2mm;font-size:7.5pt}.ct-tw th,.ct-tw td{padding:.7mm 2mm}.ct-tw tbody tr.is-fri{background:#f4efe3}
  .ct-tw tbody tr.is-today{background:none;color:inherit}
  [lang=ur] .ct-tw th,[lang=ur] .ct-tw td{line-height:1.25;padding-block:.35mm}[lang=ur] .rf-print h1{font-size:18pt;line-height:1.5}
}
</style>`;

const calUrls = (h, city, L) => {
  const path = `${h.cityUrl(city, L)}ramadan.ics`;
  const webcal = `webcal://imuslimlife.com${path}`;
  return { file: path, webcal, google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` };
};

/** f: ramadanFast(months) for this city, complete. Returns the page's HTML in language L. */
export function ramadanSkyPage(h, { city, f, L = 'en' }) {
  const T = LANGS[L];
  const R = RAMADAN_TEXT[L];
  const cc = city.country;
  const n = h.cname(city, L);
  const year = f.days[0].date.slice(0, 4);
  const urlOf = (l) => `${h.cityUrl(city, l)}ramadan/`;
  const canonical = urlOf(L);
  const timeOf = (t) => { const { t: v, suffix } = h.clock(t, L); return suffix ? `${v} ${suffix}` : v; };
  const D = (v) => dur(v, L);
  const a = f.days[0], z = f.days[f.days.length - 1];
  const change = z.fast - a.fast;
  const method = `${h.mname(cc, L)}${h.sep(L)}${h.aname(cc, L)}`;
  const crumbs = `<a href="${h.rootUrl(L)}">${esc(T.root)}</a> › <a href="${h.countryUrl(cc, L)}">${esc(h.kname(cc, L))}</a> › <a href="${h.cityUrl(city, L)}">${esc(n)}</a> › ${esc(R.crumb(year))}`;
  const sub = `${esc(h.place(city, L))}${h.sep(L)}${esc(h.kname(cc, L))} · ${esc(R.sub(f.hijriYear))} · ${esc(method)}`;
  const answer = `<p class="ct-answer">${R.answer(esc(n), esc(day(h, a.date, L)), ltr(timeOf(a.suhoor)), ltr(timeOf(a.iftar)), esc(D(a.fast)))}</p>`;
  const shareText = R.shareText(n, year, D(a.fast));
  const extra = `${answer}<p class="ct-btns top rf-noprint"><button class="ct-btn" type="button" onclick="window.print()">${esc(R.print)}</button><a class="ct-btn alt" href="${h.cityUrl(city, L)}">${esc(T.month.today(n))}</a><button class="ct-btn alt" type="button" id="rf-share" data-text="${esc(shareText)}" data-url="${h.SITE}${canonical}" data-done="${esc(R.copied)}" hidden>${esc(R.share)}</button></p>`;
  const st = stage(L, { crumbs, h1: esc(R.h1(year, h.named(city, L))), sub, extra });

  const nights = new Map(f.oddNights.map((o) => [o.date, o.night]));
  const S = SKY_TEXT[L] || SKY_TEXT.en;
  const rows = f.days.map((d) => {
    const fri = new Date(`${d.date}T12:00:00Z`).getUTCDay() === 5;
    const cls = [fri && 'is-fri', d.n >= 21 && 'is-ten'].filter(Boolean).join(' ');
    const tag = nights.has(d.date) ? R.nightTag(nights.get(d.date)) : fri ? S.jumuah : '';
    return `<tr data-date="${d.date}"${cls ? ` class="${cls}"` : ''}><th scope="row">${d.n}</th><td>${esc(day(h, d.date, L, SHORT))} <span class="ct-tag">${esc(tag)}</span></td><td>${ltr(timeOf(d.suhoor))}</td><td>${ltr(timeOf(d.iftar))}</td><td class="sf">${esc(D(d.fast))}</td></tr>`;
  }).join('');
  const caption = R.caption(year, h.place(city, L));
  const table = `<div class="ct-tw"><table data-tz="${esc(city.tz)}"><caption>${esc(caption)}</caption><thead><tr>${R.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;

  const glance = [[R.first, day(h, a.date, L, SHORT)], [R.last, day(h, z.date, L, SHORT)], [R.longest, `${D(f.longest.fast)}`, R.dayN(f.longest.n)], [R.shortest, `${D(f.shortest.fast)}`, R.dayN(f.shortest.n)], ...(f.eid ? [[R.eid, day(h, f.eid, L, SHORT)]] : [])];
  const facts = `<section class="ct-card" aria-labelledby="rf-f"><h2 id="rf-f">${esc(R.atGlance)}</h2><p>${glance.map(([k, v, note]) => `${esc(k)}: <b>${esc(v)}</b>${note ? ` (${esc(note)})` : ''}`).join('<br>')}</p></section>`;
  const methodCard = `<section class="ct-card" aria-labelledby="rf-m"><h2 id="rf-m">${esc(T.pick.method)}</h2><p>${esc(method)}. ${esc(R.methodNote)}</p><a href="${h.cityUrl(city, L)}#times">${esc(T.pick.h)} →</a></section>`;
  const cal = calUrls(h, city, L);
  const calCard = `<section class="ct-card rf-cal rf-noprint" aria-labelledby="rf-c"><h2 id="rf-c">${esc(R.calH)}</h2><p>${esc(R.calP)}</p><p class="ct-btns"><a class="ct-btn" href="${cal.webcal}">${esc(R.calApple)}</a><a class="ct-btn alt" href="${cal.google}" rel="nofollow">${esc(R.calGoogle)}</a><a class="ct-btn alt" href="${cal.file}" download rel="nofollow">${esc(R.calFile)}</a></p></section>`;
  const appCard = `<section class="ct-card rf-noprint" aria-labelledby="rf-a"><h2 id="rf-a">${esc(R.appH)}</h2><p>${esc(R.appP)}</p><p class="ct-btns"><a class="ct-btn" href="${APP_URL}">App Store</a><a class="ct-btn alt" href="${PLAY_URL}">Google Play</a></p></section>`;

  const trend = R.trend(Math.abs(change) < 2 ? 0 : Math.sign(change), D(Math.abs(change)));
  const paras = [
    R.p1(esc(f.hijriYear), esc(n), esc(day(h, a.date, L)), f.firstTaraweeh ? esc(day(h, f.firstTaraweeh, L, { month: 'long', day: 'numeric' })) : '', esc(trend), esc(D(a.fast)), esc(D(z.fast)), z.n),
    R.p2(ltr(timeOf(a.suhoor)), ltr(timeOf(z.suhoor)), ltr(timeOf(a.iftar)), ltr(timeOf(z.iftar)), f.eid ? esc(day(h, f.eid, L)) : ''),
    esc(R.p3),
  ];
  const near = h.nearbyCities(city, L).map((c) => `<li><a href="${h.cityUrl(c, L)}ramadan/">${esc(h.named(c, L))}</a></li>`).join('');
  const faq = R.faq(year, n, day(h, a.date, L), timeOf(a.suhoor), timeOf(z.suhoor), timeOf(a.iftar), timeOf(z.iftar), D(a.fast), D(z.fast));
  const printHead = `<header class="rf-print"><p class="rf-masjid" id="rf-masjid" hidden></p><h1>${esc(R.printHead(year, h.named(city, L)))}</h1><p>${esc(sub.replace(/<[^>]+>/g, ''))}</p></header>`;
  const body = `${CSS}
${printHead}
<section class="ct-sec rf-hero" aria-labelledby="rf-h"><h2 id="rf-h">${esc(R.glance)}</h2>${fastChart(f, timeOf, { L })}${fastChart(f, timeOf, { L, compact: true })}<p class="rf-key">${R.key.map((k) => `<span>${esc(k)}</span>`).join('')}</p></section>
<section class="ct-cols"><section class="ct-month" aria-labelledby="month-h"><div class="ct-mh"><h2 id="month-h">${esc(caption)}</h2></div>${table}<p class="ct-printnote">imuslimlife.com${canonical} · ${esc(method)}</p></section>
<aside class="ct-side">${facts}${calCard}${appCard}${methodCard}</aside></section>
<section class="ct-sec"><h2>${esc(R.inCity(year, n))}</h2>${paras.map((p) => `<p>${p}</p>`).join('')}</section>
${near ? `<section class="ct-sec"><h2>${esc(R.nearby)}</h2><ul class="ct-months">${near}</ul></section>` : ''}
<section class="ct-faq" aria-labelledby="faq-h"><h2 id="faq-h">${T.city.questions}</h2>${faq.map(([q, ans], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(ans)}</p></details>`).join('')}</section>`;
  // Today's row; the share button (only where it can work); a masjid's name on the print sheet from ?masjid= (text only).
  const script = `<script>(function(){var t=document.querySelector('table[data-tz]');if(t){var p={};new Intl.DateTimeFormat('en-CA',{timeZone:t.getAttribute('data-tz'),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});var r=t.querySelector('tr[data-date="'+p.year+'-'+p.month+'-'+p.day+'"]');if(r){r.classList.add('is-today');var g=r.querySelector('.ct-tag');if(g&&!g.textContent)g.textContent=${JSON.stringify(R.todayTag)}}}
var b=document.getElementById('rf-share');if(b&&(navigator.share||navigator.clipboard)){b.hidden=false;b.addEventListener('click',function(){var d=b.dataset;if(navigator.share){navigator.share({title:document.title,text:d.text,url:d.url}).catch(function(){})}else{navigator.clipboard.writeText(d.text+' '+d.url).then(function(){b.textContent=d.done})}})}
try{var m=new URLSearchParams(location.search).get('masjid');if(m){var e=document.getElementById('rf-masjid');e.textContent=m.slice(0,80);e.hidden=false}}catch(x){}})();</script>`;
  const event = { '@type': 'Event', name: R.event(year, n), startDate: a.date, endDate: z.date, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', location: { '@type': 'Place', name: n, address: { '@type': 'PostalAddress', addressLocality: n, addressCountry: cc === 'uk' ? 'GB' : cc.toUpperCase() } }, description: R.eventDesc(n, f.hijriYear) };
  const jsonLd = [h.breadcrumb([['iMuslim Life', '/'], [T.root, h.rootUrl(L)], [h.kname(cc, L), h.countryUrl(cc, L)], [n, h.cityUrl(city, L)], [R.crumb(year), canonical]]), h.faqLd(faq), event];
  // Only reviewed languages are indexed and listed in hreflang (RAMADAN_TEXT, REVIEWED).
  const langs = h.langsOf(cc).filter((l) => REVIEWED.has(l));
  return skyDoc(h, {
    L, title: R.title(year, h.named(city, L)),
    description: R.description(year, n, f.days.length, day(h, a.date, L, { month: 'long', day: 'numeric' }), D(a.fast), D(z.fast)),
    canonical, alternates: (langs.includes(L) ? langs : [L]).map((l) => [l, urlOf(l)]), noindex: !REVIEWED.has(L),
    hrefs: Object.fromEntries(h.langsOf(cc).map((l) => [l, urlOf(l)])),
    image: h.ogImage(city), jsonLd, stage: st, main: body, scripts: script,
    head: `\n<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}">`,
  });
}
