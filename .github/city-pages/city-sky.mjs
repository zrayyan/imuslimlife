// The city prayer-times page in the Living Sky (task K04). Pure: createSite() in render.mjs passes its
// helpers in, so the static build and the Worker render the same page. The times are the page's own
// month data (the same days the old page showed); nothing here fetches, and nothing here is per visitor
// (the visitor's sky is painted over the stored copy by the Worker; see worker/src/families/sky.js).
// Everything that needs "now" (next prayer, passed tiles, the ribbon marker, today's row) is a small script
// on top of a page that already reads correctly without it.
import { LANGS } from './i18n.mjs';
import { METHODS } from './methods.mjs';
import { SKY_TEXT } from './city-sky-i18n.mjs';
import { indexable } from './indexing.mjs';
import { cityPlace, graphJson } from './schema.mjs';
import { header, footer, ltr, esc } from '../sky/chrome.mjs';
import { FONT_FACES, FONTS, FONT_FILES, skyCss } from '../sky/css.mjs';
import { stars, moon, scene } from '../sky/scene.mjs';

export const CITY_SKY_CSS_PATH = '/prayer-times/city-sky.css';
const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const DOT = { Fajr: '#E9A08A', Sunrise: '#F4BE48', Dhuhr: '#E2C26A', Asr: '#C9902F', Maghrib: '#D9643A', Isha: '#2E5A8A' };
const BAND = ['#16294A', '#D99A8E', '#EBD9A6', '#D7A54E', '#B9563C', '#16294A']; // canvas ribbon: night, Fajr, day, Asr, Maghrib, ʿIshāʾ

const CSS = `
.ct{max-inline-size:1280px;margin-inline:auto;padding-inline:32px}
.ct-stage{padding-block-end:120px}
.ct-top{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-end;justify-content:space-between;padding-block:20px 8px}
.ct-id{flex:1 1 520px;min-inline-size:0;display:flex;flex-direction:column;gap:12px}
.ct-crumbs{font-size:14px;color:var(--sky-soft)}
.ct-crumbs a{text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--sky-line)}
.ct-h1{margin:0;font-weight:400;font-size:clamp(44px,6vw,76px);line-height:1.06;padding-block:.04em;letter-spacing:-.02em;overflow-wrap:anywhere}
.ct-date{font-size:18px;color:var(--sky-soft)}.ct-hij{color:var(--sky-accent)}
.ct-answer{max-inline-size:60ch;font-size:16px;color:var(--sky-soft)}
.ct-next{flex:0 1 380px;position:relative;overflow:hidden;padding:26px 28px;border-radius:24px;background:#0E2A1E;color:#F6F2E9;display:flex;flex-direction:column;gap:6px}
.ct-next svg{position:absolute;inset:0;inline-size:100%;block-size:100%;opacity:.12}
.ct-next>span{position:relative}
.ct-eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:600;color:#D9B46A}
.ct-nrow{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:4px 12px}
.ct-nn{font-family:var(--serif);font-size:48px;line-height:1.15}
.ct-nt{font-size:24px;font-weight:500;white-space:nowrap}
.ct-nc{font-size:16px;color:#C9D4CC}
.ct-main{display:flex;flex-direction:column;gap:40px;padding-block:40px 96px}
.ct-ribbon{position:relative;padding-block-start:34px}
.ct-bar{display:flex;block-size:14px;border-radius:999px;overflow:hidden;direction:ltr}
.ct-bar i{display:block;block-size:100%}
.ct-now{position:absolute;inset-block-start:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;direction:ltr}
.ct-now[hidden]{display:none}
.ct-now b{font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--ink);color:var(--bg);white-space:nowrap}
.ct-now i{inline-size:2px;block-size:22px;background:var(--ink)}
.ct-hours{display:flex;justify-content:space-between;margin-block-start:8px;font-size:12px;color:var(--soft);direction:ltr}
.ct-tiles{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.ct-tile{padding:22px 22px 20px;border-radius:20px;background:var(--card);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;gap:10px}
.ct-tile.is-next{background:#0E2A1E;color:#F6F2E9;box-shadow:inset 0 0 0 1px var(--gold)}
.ct-tile.is-past{opacity:.8}
.ct-th{display:flex;justify-content:space-between;align-items:center;font-size:13px;letter-spacing:.1em;text-transform:uppercase;font-weight:600}
.ct-th i{inline-size:10px;block-size:10px;border-radius:50%}
.ct-tv{font-family:var(--serif);font-size:36px;line-height:1.1;white-space:nowrap}
.ct-note{font-size:13px;opacity:.92;min-block-size:1.5em}
.ct-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;font-size:15px}
.ct-ctl form{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;margin:0}
.ct-ctl label,.ct-grp{display:flex;align-items:center;gap:10px;max-inline-size:100%}
.ct-ctl select{max-inline-size:min(100%,62vw)}
.ct-ctl select{block-size:44px;padding-inline:12px;border:0;border-radius:12px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);font:500 15px var(--sans);color:var(--ink)}
.ct-seg{display:inline-flex;padding:3px;border-radius:12px;background:var(--band);box-shadow:inset 0 0 0 1px var(--line)}
.ct-seg button{min-block-size:44px;padding-inline:16px;border:0;border-radius:9px;background:transparent;color:var(--ink);font:500 14px var(--sans);cursor:pointer}
.ct-seg button[aria-pressed=true]{background:var(--card);box-shadow:0 1px 2px rgba(0,0,0,.18),inset 0 0 0 1px var(--line)}
.ct-apply{min-block-size:44px;padding-inline:16px;border:0;border-radius:12px;background:var(--ink);color:var(--bg);font:600 14px var(--sans);cursor:pointer}
.ct-pill{margin-inline-start:auto;display:inline-flex;align-items:center;min-block-size:48px;padding-inline:20px;border-radius:999px;background:var(--ink);color:var(--bg);font-weight:600;text-decoration:none}
.ct-custom{font-size:14px;color:var(--soft)}
.ct-cols{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}
.ct-month{flex:999 1 640px;min-inline-size:0;display:flex;flex-direction:column;gap:16px}
.ct-mh{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:12px}
.ct-mh h2,.ct-faq h2,.ct-sec h2{font-size:34px;line-height:1.2}
.ct-links{display:flex;gap:16px;font-size:14px;font-weight:600}
.ct-tw{overflow-x:auto;border-radius:20px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}
.ct-tw table{inline-size:100%;min-inline-size:720px;border-collapse:collapse;font-size:15px;font-variant-numeric:tabular-nums}
.ct-tw caption{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip:rect(0 0 0 0)}
.ct-tw thead th{text-align:start;padding:16px 10px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);font-weight:600}
.ct-tw tbody tr{border-block-start:1px solid var(--line)}
.ct-tw tbody tr.is-fri{background:var(--band)}
.ct-tw tbody tr.is-today{background:#0E2A1E;color:#F6F2E9}
.ct-tw th[scope=row]{text-align:start;font-weight:500;white-space:nowrap}
.ct-tw th,.ct-tw td{padding:11px 10px}
.ct-tw th:first-child,.ct-tw td:first-child{padding-inline-start:18px}.ct-tw th:last-child,.ct-tw td:last-child{padding-inline-end:18px}
.ct-tw td.sf{color:var(--soft)}
.ct-tw td:nth-child(2){white-space:nowrap}
.ct-tw .is-today td.sf{color:#C9D4CC}
.ct-tag{font-size:11px;font-weight:600;letter-spacing:.06em;color:var(--gold);text-transform:uppercase}
.is-today .ct-tag{color:#D9B46A}
.ct-side{flex:1 1 340px;display:flex;flex-direction:column;gap:16px}
.ct-card{padding:24px;border-radius:22px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;gap:12px}
.ct-card h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:var(--gold);font-family:var(--sans)}
.ct-jam{background:#0E2A1E;color:#F6F2E9;box-shadow:none;gap:14px}
.ct-jam h2{font-family:var(--serif);font-size:24px;font-weight:400;letter-spacing:0;text-transform:none;color:#F6F2E9}
.ct-jam p{font-size:14px;line-height:1.5;color:#C9D4CC}
.ct-jam a{color:#F6F2E9}
.ct-jam a.all{color:#D9B46A;font-weight:600;font-size:15px}
.ct-jh{display:flex;justify-content:space-between;align-items:center;gap:10px}
.ct-badge{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#0B2219;padding:3px 8px;border-radius:999px;background:#D9B46A}
.ct-jl{list-style:none;margin:0;padding:0}
.ct-jl li{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-block-start:1px solid #23463A}
.ct-jl li>span:first-child{display:flex;flex-direction:column;min-inline-size:0}
.ct-jl a{font-weight:500;min-block-size:24px}
.ct-jl small{font-size:12px;color:#9FB5A8}
.ct-iq{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:2px 10px;font-size:13px;text-align:end;max-inline-size:180px}
.ct-iq span{white-space:nowrap}.ct-iq.live span{display:none}.ct-iq.live span.on{display:block}
.ct-iq b{display:block;font-weight:400;font-size:11px;color:#D9B46A}
.ct-iq.na{color:#9FB5A8}
.ct-qb{flex-direction:row;align-items:center;gap:18px}
.ct-qb svg{flex:none}
.ct-qb div{display:flex;flex-direction:column;gap:4px}
.ct-qd{font-family:var(--serif);font-size:34px}
.ct-qb p,.ct-qb small{font-size:14px;color:var(--soft)}
.ct-qb h2 a{color:inherit;text-decoration:none}
.ct-chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.ct-chips a{display:inline-flex;align-items:center;min-block-size:48px;padding-inline:14px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line);color:var(--ink);text-decoration:none}
.ct-sec{display:flex;flex-direction:column;gap:14px}
.ct-sec h2{font-size:28px}
.ct-sec p{color:var(--soft);max-inline-size:70ch}
.ct-months{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.ct-months a{display:inline-flex;align-items:center;min-block-size:48px;padding-inline:14px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--line);background:var(--card);color:var(--ink);text-decoration:none}
.ct-months .is-current a{background:var(--ink);color:var(--bg)}
.ct-months span{opacity:.7;margin-inline-start:6px}
.ct-ev{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.ct-ev li{display:flex;flex-direction:column;gap:2px;padding:14px 16px;border-radius:16px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}
.ct-ev li>span{font-size:14px;color:var(--soft)}
.ct-btns{display:flex;flex-wrap:wrap;gap:12px}
.ct-btn{display:inline-flex;align-items:center;min-block-size:48px;padding-inline:22px;border-radius:999px;background:var(--ink);color:var(--bg);font-weight:600;text-decoration:none}
.ct-btn.alt{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.ct-faq{max-inline-size:860px;display:flex;flex-direction:column;gap:8px}
.ct-faq h2{margin-block-end:12px}
.ct-faq details{border-block-start:1px solid var(--line);padding-block:18px}
.ct-faq details:last-child{border-block-end:1px solid var(--line)}
.ct-faq summary{font-size:18px;font-weight:500;min-block-size:32px;cursor:pointer;list-style:none}
.ct-faq summary::-webkit-details-marker{display:none}
.ct-faq details p{margin-block-start:10px;font-size:16px;line-height:1.6;color:var(--soft)}
.ct-ground{block-size:28px;background:var(--sky-ground)}
.ct-js .ct-apply{display:none}
@media (max-width:720px){
  .ct{padding-inline:16px}
  .ct-top{padding-block-start:8px}
  .ct-main{gap:32px;padding-block:28px 64px}
  .ct-tv{font-size:30px}
  .ct-mh h2,.ct-faq h2{font-size:28px}
  .ct-pill{margin-inline-start:0}
  .ct-ctl form,.ct-ctl label{inline-size:100%}.ct-ctl label select{flex:1;min-inline-size:0;max-inline-size:none}
  .ct-pill{max-inline-size:100%;text-align:center;justify-content:center}
  .ct-hours span:nth-child(2n){display:none}
}
.ct-tw td bdi,.ct-tv bdi,.ct-nt bdi{unicode-bidi:isolate}
@media print{.sk-header,.sk-footer,.sk-skip,.ct-stage,.ct-ground,.ct-ctl,.ct-pill,.ct-side{display:none!important}}
`;

const hash = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); };
/** The page's stylesheet (fonts, the sky, this page), built once. The Worker serves it itself and build.mjs writes the same text to the site. */
export const CITY_SKY_CSS = `${FONT_FACES}\n${skyCss()}\n${CSS}`;
export const CITY_SKY_CSS_URL = `${CITY_SKY_CSS_PATH}?v=${hash(CITY_SKY_CSS)}`;
const SCHEDULE_SLOT = '__SKY_TIMES__'; // the Worker fills it per visitor (sky/page.mjs); without it the page paints its own city's sky

// Runs in the browser: today, the next prayer, the ribbon marker, the sky of this city when the Worker gave none, and the method choice
// (calc.js, the API's engine) which the page remembers in localStorage and which the form also sends as a plain GET without JavaScript.
const CLIENT = `(function(){
var el=document.getElementById('pt-data'),D=JSON.parse(el.textContent),I=D.i,C=D.c,Z=['Fajr','Dhuhr','Asr','Maghrib','Isha'],P=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];
var root=document.documentElement,form=document.getElementById('pt-calc');root.classList.add('ct-js');
function now(){var p={};new Intl.DateTimeFormat('en-CA',{timeZone:D.tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});return{date:p.year+'-'+p.month+'-'+p.day,min:(+p.hour)*60+(+p.minute)+(+p.second)/60}}
function mins(s){var a=s.split(':');return +a[0]*60+(+a[1])}
function fmt(s){var a=s.split(':'),h=+a[0];if(I.clock===24)return(h<10?'0':'')+h+':'+a[1];return((h+11)%12+1)+':'+a[1]+(I.ampm&&I.ampm[0]?' '+I.ampm[h<12?0:1]:'')}
function hij(h){var m=h.match(/^(\\d+) (.+) (\\d+)$/);return m&&I.hm&&I.hm[m[2]]?m[1]+' '+I.hm[m[2]]+' '+m[3]:h}
function q(s,r){return(r||document).querySelector(s)}function qa(s,r){return[].slice.call((r||document).querySelectorAll(s))}
function left(at,n){var m=Math.max(0,Math.round(at-n)),h=Math.floor(m/60);return(h?I.leftH.replace('{h}',h):I.leftM).replace('{m}',m%60)}
/* the method choice: a variant page (served for ?m&a&x) shows it already; otherwise apply the saved one */
var s={};try{s=JSON.parse(localStorage.getItem('pt-calc')||'{}')||{}}catch(e){}
if(form){form.addEventListener('submit',function(e){var sub=e.submitter,v={m:+form.elements.m.value,a:sub&&sub.name==='a'?+sub.value:+form.elements.a0.value,x:+form.elements.x.value};e.preventDefault();try{localStorage.setItem('pt-calc',JSON.stringify(v))}catch(_){}location.href=location.pathname});
qa('select',form).forEach(function(x){x.onchange=function(){form.requestSubmit()}});
var rs=q('[data-reset]');if(rs)rs.onclick=function(e){e.preventDefault();try{localStorage.removeItem('pt-calc')}catch(_){}location.href=location.pathname}}
var m=s.m!=null?+s.m:C.method,a=s.a!=null?+s.a:C.school,x=+s.x||0;
if(!D.v&&C&&window.PTCalc&&(m!==C.method||a!==C.school||x)){
var t=PTCalc.compute(D.days,{lat:C.lat,lon:C.lon,tz:D.tz,method:m,school:a,dst:x});
D.days.forEach(function(d,k){d.t=t[k];var r=q('tr[data-date="'+d.date+'"]');if(!r)return;P.forEach(function(p){var c=q('[data-p="'+p+'"]',r);if(c)c.firstChild.textContent=fmt(d.t[p])})});
qa('b[data-d][data-p]').forEach(function(b){var e=PTCalc.compute([{date:b.dataset.d}],{lat:C.lat,lon:C.lon,tz:D.tz,method:m,school:a,dst:x})[0];b.textContent=fmt(e[b.dataset.p])});
}
if(form){if(!D.v){form.elements.m.value=m;form.elements.x.value=x}qa('button[name=a]',form).forEach(function(b){b.setAttribute('aria-pressed',String(+b.value===(D.v?D.v.a:a)))});form.elements.a0.value=D.v?D.v.a:a}
var n=now(),i=-1;for(var k=0;k<D.days.length;k++)if(D.days[k].date===n.date)i=k;
qa('tr.is-today').forEach(function(r){r.classList.remove('is-today')});var row=q('tr[data-date="'+n.date+'"]');if(row){row.classList.add('is-today');var tg=q('.ct-tag',row);if(tg&&!tg.textContent)tg.textContent=I.todayTag}
if(i<0)return;var d=D.days[i],fri=new Date(n.date+'T12:00:00Z').getUTCDay()===5;
q('#pt-date').textContent=new Date(n.date+'T12:00:00Z').toLocaleDateString(I.locale,{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
var hj=q('#pt-hij');if(hj&&d.hijri)hj.textContent=hij(d.hijri);
P.forEach(function(p){var b=q('.ct-tile[data-p="'+p+'"] bdi');if(b)b.textContent=fmt(d.t[p])});
/* the day ribbon, Fajr to ʿIshāʾ, from this day's times */
var cuts=[0,mins(d.t.Fajr),mins(d.t.Sunrise),mins(d.t.Asr),mins(d.t.Maghrib),mins(d.t.Isha),1440];
qa('.ct-bar i').forEach(function(b,k){b.style.width=((cuts[k+1]-cuts[k])/14.4).toFixed(3)+'%'});
/* a static copy has no visitor sky: paint this city's */
if(!root.getAttribute('data-sky-times')){var order=['isha','fajr','dhuhr','asr','maghrib','isha'],cs=[mins(d.t.Fajr),mins(d.t.Sunrise),mins(d.t.Asr),mins(d.t.Maghrib),mins(d.t.Isha)];function paint(){var n2=now().min,j=0;while(j<5&&n2>=cs[j])j++;root.setAttribute('data-sky',order[j])}paint();setInterval(paint,60000)}
function tick(){var n2=now();if(n2.date!==n.date){location.reload();return}
var nx=null,at=0,tom=false;for(var j=0;j<Z.length;j++){if(mins(d.t[Z[j]])>n2.min){nx=Z[j];at=mins(d.t[Z[j]]);break}}
if(!nx&&D.days[i+1]){nx='Fajr';at=mins(D.days[i+1].t.Fajr)+1440;tom=true}
P.forEach(function(p){var t=q('.ct-tile[data-p="'+p+'"]'),nt=q('.ct-note',t),isn=p===nx&&!tom,past=mins(d.t[p])<=n2.min&&!isn;t.classList.toggle('is-next',isn);t.classList.toggle('is-past',past);
if(isn)nt.textContent=I.t.next+' · '+left(at,n2.min);else if(p==='Fajr'||p==='Maghrib'||p==='Isha')nt.textContent=past?I.t.passed:I.t.later;else nt.textContent=p==='Dhuhr'&&fri?I.t.jumuah:nt.getAttribute('data-s')});
if(nx){q('#ct-ne').textContent=I.t.nextPrayer;q('#ct-nn').textContent=I.names[nx];q('#ct-nt').textContent=fmt(tom?D.days[i+1].t.Fajr:d.t[nx]);q('#ct-nc').textContent=(tom?I.tomorrow.replace(/[()]/g,'')+' · ':'')+left(at,n2.min)}
var nb=q('.ct-now');if(nb){nb.hidden=false;nb.style.left=(n2.min/14.4).toFixed(2)+'%';q('bdi',nb).textContent=fmt((function(h,m){return(h<10?'0':'')+h+':'+(m<10?'0':'')+m})(Math.floor(n2.min/60),Math.floor(n2.min%60)))}
qa('.ct-iq[data-iq]').forEach(function(u){u.classList.add('live');qa('span',u).forEach(function(sp){sp.classList.toggle('on',sp.dataset.p===nx&&!tom)});if(!q('span.on',u))qa('span',u).forEach(function(sp){sp.classList.toggle('on',sp.dataset.p==='Fajr')})})}
tick();setInterval(tick,30000)})();`;

/**
 * @param {object} h render.mjs helpers (see createSite)
 * @param {object} o {city, cur, nxt, now, L, months, variant, jamaat, indexableToday}
 * @returns {string} the whole document
 */
export function citySkyPage(h, { city, cur, nxt, now, L, months, variant = null, masjids = null, today, faq, defaults }) {
  const T = LANGS[L];
  const S = SKY_TEXT[L] || SKY_TEXT.en;
  const cc = city.country;
  const n = h.cname(city, L);
  const q = h.qibla(city.lat, city.lon);
  const deg = Math.round(q);
  const day = cur.days.find((d) => d.date === now.iso) || null;
  const bd = (iso) => ltr(iso);
  const timeOf = (t) => { const { t: v, suffix } = h.clock(t, L); return suffix ? `${v} ${suffix}` : v; };
  const hd = (hjr) => h.hijri(hjr, L);
  const dateLabel = h.dateIn(now.iso, L, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fri = new Date(`${now.iso}T12:00:00Z`).getUTCDay() === 5;
  const school = variant?.a ?? defaults.school;
  const method = variant?.m ?? defaults.method;
  const minutes = (t) => { const [a, b] = String(t).split(':').map(Number); return a * 60 + b; };

  // The day ribbon: night, Fajr, day, Asr, Maghrib, ʿIshāʾ, as widths of the 24 hours.
  let ribbon = '';
  if (day) {
    const cuts = [0, ...['Fajr', 'Sunrise', 'Asr', 'Maghrib', 'Isha'].map((p) => minutes(day.t[p])), 1440];
    ribbon = BAND.map((c, i) => `<i style="width:${((cuts[i + 1] - cuts[i]) / 14.4).toFixed(3)}%;background:${c}"></i>`).join('');
  }
  const hourText = (x) => timeOf(`${String(x % 24).padStart(2, '0')}:00`);
  const hours = [0, 6, 12, 18, 24].map((x) => `<span>${bd(hourText(x))}</span>`).join('');

  const tile = (p) => {
    const note = p === 'Sunrise' ? S.ends : p === 'Asr' ? (school ? S.han : S.std) : p === 'Dhuhr' ? (fri ? S.jumuahToday : S.midday) : '';
    return `<li class="ct-tile" data-p="${p}"><span class="ct-th"><span>${T.prayers[p]}</span><i style="background:${DOT[p]}" aria-hidden="true"></i></span><span class="ct-tv">${day ? bd(timeOf(day.t[p])) : '—'}</span><span class="ct-note" data-s="${esc(p === 'Dhuhr' ? S.midday : note)}">${esc(note)}</span></li>`;
  };

  const opt = (v, label, sel, d) => `<option value="${v}"${sel ? ' selected' : ''}>${esc(label)}${d ? ` (${T.pick.def})` : ''}</option>`;
  const dst = variant?.x ?? 0;
  const control = `<div class="ct-ctl" id="times">
    <form id="pt-calc" method="get" action="${h.cityUrl(city, L)}#times">
      <label>${esc(T.pick.method)} <select name="m" aria-label="${esc(T.pick.method)}">${METHODS.map(([id, en]) => opt(id, T.methods[id] || en, id === method, id === defaults.method)).join('')}</select></label>
      <span class="ct-grp" role="group" aria-label="${esc(T.pick.asr)}">${esc(T.pick.asr)}<span class="ct-seg"><button type="submit" name="a" value="0" aria-pressed="${!school}">${S.std}</button><button type="submit" name="a" value="1" aria-pressed="${!!school}">${S.han}</button></span></span>
      <label>${esc(T.pick.dst)} <select name="x" aria-label="${esc(T.pick.dst)}">${[[0, T.pick.auto], [1, T.pick.plus], [-1, T.pick.minus]].map(([v, l]) => `<option value="${v}"${v === dst ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
      <input type="hidden" name="a0" value="${school}">
      <button class="ct-apply" type="submit" name="a" value="${school}">${S.apply}</button>
    </form>
    <a class="ct-pill" href="${L === 'en' ? '' : `/${L}`}/mobile-app/">${S.athan}</a>
  </div>${variant ? `<p class="ct-custom">${esc(S.custom(h.methodName(method, L), T.asr[school ? 1 : 0]))} <a href="${h.cityUrl(city, L)}" data-reset>${S.reset}</a></p>` : ''}`;

  const rows = cur.days.map((d) => {
    const dt = new Date(`${d.date}T12:00:00Z`);
    const isFri = dt.getUTCDay() === 5;
    const isToday = d.date === now.iso;
    const label = h.dateIn(d.date, L, { weekday: 'short', day: 'numeric' });
    const cls = `${isToday ? 'is-today ' : ''}${isFri ? 'is-fri' : ''}`.trim();
    const hj = hd(d.hijri).replace(/ \d+$/, '');
    return `<tr data-date="${d.date}"${cls ? ` class="${cls}"` : ''}><th scope="row">${label} <span class="ct-tag">${isToday ? S.todayTag : isFri ? S.jumuah : ''}</span></th><td class="sf">${esc(hj)}</td>${PRAYERS.map((p) => `<td${p === 'Sunrise' ? ' class="sf"' : ''} data-p="${p}">${bd(timeOf(d.t[p]))}</td>`).join('')}</tr>`;
  }).join('');
  const curLabel = `${h.monthName(cur.m, L)} ${cur.y}`;
  const table = `<div class="ct-tw"><table><caption>${esc(T.city.caption(h.place(city, L), curLabel))}</caption><thead><tr><th scope="col">${T.date}</th><th scope="col">${S.hijriCol}</th>${PRAYERS.map((p) => `<th scope="col">${T.prayers[p]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;

  // Pray in jamaat: real iqāmah times only where Masjid Connect has them for this very day; never invented.
  const placesHref = `${L === 'en' ? '' : `/${L}`}/places/search/?q=${encodeURIComponent(n)}`;
  const iqRow = (m) => {
    if (!m.iq) return `<span class="ct-iq na">${S.jamUnknown}</span>`;
    const ps = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].filter((p) => m.iq[p]);
    return `<span class="ct-iq" data-iq="1">${ps.map((p) => `<span data-p="${p}"><b>${esc(S.jamIq(T.prayers[p]))}</b>${bd(timeOf(m.iq[p]))}</span>`).join('')}</span>`;
  };
  const jamList = masjids?.length ? `<ul class="ct-jl">${masjids.map((m) => `<li><span><a href="${esc(m.url)}">${esc(m.name)}</a><small>${esc(m.dist)}${m.iq ? ` · ${esc(S.jamFor(h.dateIn(m.date, L, { day: 'numeric', month: 'short' })))}` : ''}</small></span>${iqRow(m)}</li>`).join('')}</ul>` : `<p>${S.jamNone}</p>`;
  const jam = `<section class="ct-card ct-jam" aria-labelledby="jam-h"><div class="ct-jh"><h2 id="jam-h">${S.jamH}</h2><span class="ct-badge">Masjid Connect</span></div><p>${esc(S.jamSub(n))}</p>${jamList}<a class="all" href="${placesHref}">${esc(S.jamAll(n))} →</a></section>`;

  const qiblaCard = `<section class="ct-card ct-qb" aria-labelledby="qb-h"><svg width="96" height="96" viewBox="0 0 104 104" role="img" aria-label="${esc(T.city.qiblaH(n))}: ${deg}°"><circle cx="52" cy="52" r="48" fill="none" stroke="var(--line)" stroke-width="1.5"/><text x="52" y="16" text-anchor="middle" font-size="10" fill="var(--soft)">N</text><g transform="rotate(${q.toFixed(1)} 52 52)"><path d="M52 14L58 52L52 60L46 52Z" fill="var(--gold)"/><path d="M52 60L58 52L52 90L46 52Z" fill="var(--line)"/></g><circle cx="52" cy="52" r="3" fill="var(--ink)"/></svg><div><h2 id="qb-h"><a href="${L === 'en' ? '' : `/${L}`}/qibla/${cc}/${city.slug}/">${esc(T.city.qiblaH(n))}</a></h2><span class="ct-qd">${bd(`${deg}°`)}</span><small>${esc(S.fromNorth(h.compass(q, L)))}</small></div></section>`;
  const near = `<section class="ct-card" aria-labelledby="near-h"><h2 id="near-h">${esc(T.city.nearby(n))}</h2><ul class="ct-chips">${h.nearbyCities(city, L).map((c) => `<li><a href="${h.cityUrl(c, L)}">${esc(h.named(c, L))}</a></li>`).join('')}</ul></section>`;

  const cta = h.ctaSky(city, L);
  const about = `<section class="ct-sec"><h2>${T.city.aboutH}</h2><p>${T.city.about(esc(h.methodName(method, L)), esc(T.asr[school ? 1 : 0]), esc(city.tz.replace(/_/g, ' ')))}</p></section>`;
  const events = h.eventsSky(city, months, L);
  const monthLinks = `<section class="ct-sec"><h2>${T.city.monthly}</h2>${h.monthLinks(city, now, cur.m, L).replace('class="months"', 'class="ct-months"')}</section>`;

  const dot = '<svg aria-hidden="true"><defs><pattern id="k2" width="72" height="72" patternUnits="userSpaceOnUse"><path d="M36 6l8.8 21.2L66 36l-21.2 8.8L36 66l-8.8-21.2L6 36l21.2-8.8z" fill="none" stroke="#D9B46A" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#k2)"/></svg>';
  const first = day ? PRAYERS.filter((p) => p !== 'Sunrise')[0] : null;
  const nextCard = `<aside class="ct-next" id="ct-next" aria-label="${esc(S.nextPrayer)}">${dot}<span class="ct-eyebrow" id="ct-ne">${S.today}</span><span class="ct-nrow"><span class="ct-nn" id="ct-nn">${first ? T.prayers[first] : ''}</span><span class="ct-nt" id="ct-nt">${first ? bd(timeOf(day.t[first])) : ''}</span></span><span class="ct-nc" id="ct-nc">${S.allBelow}</span></aside>`;

  const crumbs = `<nav class="ct-crumbs" aria-label="Breadcrumb"><a href="${h.rootUrl(L)}">${T.root}</a> › <a href="${h.countryUrl(cc, L)}">${esc(h.kname(cc, L))}</a> › ${esc(n)}</nav>`;
  const hij = day ? hd(day.hijri) : '';
  const stage = `<div class="sk-stage ct-stage">${stars()}${moon()}${scene()}${header({ lang: L, current: 'times' })}
<div class="sk-content ct" id="main"><div class="ct-top"><div class="ct-id">${crumbs}<h1 class="ct-h1">${esc(T.city.h1(h.named(city, L)))}</h1>
<p class="ct-date"><span id="pt-date">${esc(dateLabel)}</span>${hij ? ` · <span class="ct-hij" id="pt-hij">${esc(hij)}</span>` : ''}</p>
${today ? `<p class="ct-answer">${esc(today.sentence)}</p>` : ''}</div>${nextCard}</div></div></div>
<div class="ct-ground"></div>`;

  const body = `${stage}
<main class="ct ct-main">
<section aria-labelledby="today-h"><h2 id="today-h" class="sk-sr">${S.today}</h2>
<div class="ct-ribbon"><div class="ct-bar" role="img" aria-label="${esc(S.ribbon)}">${ribbon}</div><span class="ct-now" hidden aria-hidden="true"><b>${S.now} ${bd('')}</b><i></i></span><div class="ct-hours" aria-hidden="true">${hours}</div></div>
<ol class="ct-tiles" aria-label="${esc(T.city.timetable(n, curLabel))}" style="margin-block-start:18px">${PRAYERS.map(tile).join('')}</ol>
${control}</section>
<div class="ct-cols">
<section class="ct-month" aria-labelledby="month-h"><div class="ct-mh"><h2 id="month-h">${esc(T.city.timetable(n, curLabel))}</h2><span class="ct-links"><a href="${h.monthUrl(city, cur.m, L)}">${S.print}</a></span></div>${table}</section>
<aside class="ct-side">${jam}${qiblaCard}${near}</aside></div>
${events}${monthLinks}${about}${cta}
<section class="ct-faq" aria-labelledby="faq-h"><h2 id="faq-h">${T.city.questions}</h2>${faq.map(([qq, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(qq)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
</main>`;

  const data = { tz: city.tz, days: [...cur.days, ...nxt.days], i: { ...h.clientWords(L), t: { next: S.next, passed: S.passed, later: S.later, jumuah: S.jumuahToday, nextPrayer: S.nextPrayer, todayTag: S.todayTag } }, c: h.calcData(city), ...(variant ? { v: { m: method, a: school } } : {}) };
  const canonical = h.cityUrl(city, L);
  const alternates = h.langsOf(cc).map((l) => [l, h.cityUrl(city, l)]);
  const title = T.city.title(h.named(city, L));
  const description = T.city.description(h.named(city, L), `${city.region ? `${h.sep(L)}${h.rname(city, L)}` : ''}${h.sep(L)}${h.kname(cc, L)}`);
  const index = !variant && indexable(canonical, h.TODAY);
  const seo = index ? alternates.filter(([, u]) => indexable(u, h.TODAY)) : [];
  const image = h.ogImage(city);
  const SITE = h.SITE;
  const hreflang = seo.length >= 1 ? `\n${seo.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${u}">`).join('\n')}\n<link rel="alternate" hreflang="x-default" href="${SITE}${seo[0][1]}">` : '';
  const jsonLd = [h.breadcrumb([['iMuslim Life', '/'], [T.root, h.rootUrl(L)], [h.kname(cc, L), h.countryUrl(cc, L)], [n, canonical]]), cityPlace({ name: n, url: `${SITE}${canonical}`, lat: city.lat, lon: city.lon, countryName: h.kname(cc, L), countryCode: cc.toUpperCase() }), h.faqLd(faq)];
  const hrefs = Object.fromEntries(alternates);
  return `<!DOCTYPE html>
<html lang="${L}"${T.dir === 'rtl' ? ' dir="rtl"' : ''} data-sky="dhuhr" data-sky-times="${SCHEDULE_SLOT}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">${index ? '' : '\n<meta name="robots" content="noindex,follow">'}
<link rel="canonical" href="${SITE}${canonical}">${hreflang}
<meta property="og:type" content="website">
<meta property="og:site_name" content="iMuslim Life">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}${image || '/logo512.png'}">${image ? '\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">' : ''}
<meta name="theme-color" content="#07150F">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" as="font" type="font/woff2" href="${FONT_FILES.marcellus}" crossorigin><link rel="preload" as="font" type="font/woff2" href="${FONT_FILES.inter}" crossorigin>
<link rel="stylesheet" href="${CITY_SKY_CSS_URL}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${FONTS}"></noscript>
<script type="application/ld+json">${graphJson(jsonLd)}</script>
${h.BEACON}
</head>
<body>
${body}
${footer({ lang: L, path: canonical, hrefs })}
<script type="application/json" id="pt-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
<script src="/prayer-times/calc.js"></script>
<script>${CLIENT}</script>
</body>
</html>
`;
}
