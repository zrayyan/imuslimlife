// Prayer-times widget for masjid websites (2026-10-20), built with the city pages.
//
//   /prayer-times/data/<cc>-<slug>.json  this month and next for one city (static: no API
//                                        call per view, however many sites embed it)
//   /prayer-times/data/index.json        the cities, their names and languages (builder)
//   /widget/embed/?c=<cc>/<slug>&theme=light|dark&lang=en|ar|ur|id|ms
//                                        the iframe: today's times, next prayer, Hijri date
//   /widget/                             the builder: pick a city, preview, copy the code
//
// The embed code is the iframe plus one plain line with a link to the city page: links
// inside an iframe count for imuslimlife.com, not for the masjid's site.
import { LANGS } from './i18n.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const WIDGET_WORDS = {
  en: { by: 'Prayer times by', loading: 'Loading…', error: 'Prayer times are not available right now.' },
  ar: { by: 'مواقيت الصلاة من', loading: 'جارٍ التحميل…', error: 'مواقيت الصلاة غير متاحة الآن.' },
  ur: { by: 'نماز کے اوقات:', loading: 'لوڈ ہو رہا ہے…', error: 'نماز کے اوقات اس وقت دستیاب نہیں۔' },
  id: { by: 'Jadwal sholat dari', loading: 'Memuat…', error: 'Jadwal sholat belum tersedia.' },
  ms: { by: 'Waktu solat oleh', loading: 'Memuatkan…', error: 'Waktu solat tidak tersedia sekarang.' },
};

// One city's data file.
export function cityData({ city, now, months, langs, names, country, urls, SITE }) {
  const next = months[(now.m % 12) + 1];
  return `${JSON.stringify({
    v: 1, tz: city.tz, names, country, urls: Object.fromEntries(Object.entries(urls).map(([l, u]) => [l, SITE + u])), langs,
    days: [...months[now.m].days, ...next.days],
  })}\n`;
}

// The iframe page. Words for every language are inlined; the city's data is fetched.
export function embedPage({ BEACON }) {
  const words = Object.fromEntries(Object.entries(LANGS).map(([l, T]) => [l, {
    dir: T.dir, locale: T.locale, clock: T.clock, ampm: T.ampm, names: T.prayers, hm: T.hijri,
    next: T.client.next, tomorrow: T.client.tomorrow, leftH: T.client.left('{h}', '{m}'), leftM: T.client.left(0, '{m}'), ...WIDGET_WORDS[l],
  }]));
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Prayer times widget · iMuslim Life</title>
<style>
:root{--bg:#fff;--text:#333;--muted:#666;--line:#e6e2d6;--green:#006400;--gold:#d4af37;--soft:#fbf5e1}
.dark{--bg:#1e1e1e;--text:#e0e0e0;--muted:#aaa;--line:#333;--green:#5cbf60;--soft:#2b2615}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--text);font:14px/1.45 Rubik,Roboto,-apple-system,'Segoe UI',Arial,sans-serif}
[dir=rtl] body{font-family:'Noto Naskh Arabic','Geeza Pro',Tahoma,sans-serif}
.w{border:1px solid var(--line);border-top:4px solid var(--gold);border-radius:10px;padding:12px 14px;min-height:100vh}
h1{font-size:17px;color:var(--green);font-weight:600}
.sub{font-size:12px;color:var(--muted);margin-top:2px}
ul{list-style:none;margin-top:10px}
li{display:flex;justify-content:space-between;padding:6px 8px;border-radius:6px}
li+li{border-top:1px solid var(--line)}
li b{font-weight:600;direction:ltr;unicode-bidi:isolate}
li.next{background:var(--soft);border-color:transparent;box-shadow:inset 3px 0 0 var(--gold)}
[dir=rtl] li.next{box-shadow:inset -3px 0 0 var(--gold)}
.nx{margin-top:10px;font-size:13px}
.nx b{color:var(--green)}
.by{margin-top:10px;font-size:11px;color:var(--muted)}
.by a{color:var(--green);text-decoration:none}
</style>
${BEACON}
</head>
<body>
<div class="w" id="w"><p class="sub" id="msg"></p></div>
<script>
(function(){
var W=${JSON.stringify(words).replace(/</g, '\\u003c')};
var q=new URLSearchParams(location.search),c=(q.get('c')||'').replace(/[^a-z0-9/-]/g,''),L=W[q.get('lang')]?q.get('lang'):'en',I=W[L];
if(q.get('theme')==='dark')document.documentElement.className='dark';
document.documentElement.lang=L;document.documentElement.dir=I.dir;
var box=document.getElementById('w');document.getElementById('msg').textContent=I.loading;
function esc(s){return String(s).replace(/[&<>"]/g,function(x){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]})}
function now(tz){var p={};new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(x){p[x.type]=x.value});return{date:p.year+'-'+p.month+'-'+p.day,min:(+p.hour)*60+(+p.minute)+(+p.second)/60}}
function mins(s){var a=s.split(':');return +a[0]*60+(+a[1])}
function fmt(s){var a=s.split(':'),h=+a[0];if(I.clock===24)return(h<10?'0':'')+h+':'+a[1];return((h+11)%12+1)+':'+a[1]+(I.ampm&&I.ampm[0]?' '+I.ampm[h<12?0:1]:'')}
function hij(h){var m=h.match(/^(\\d+) (.+) (\\d+)$/);return m&&I.hm&&I.hm[m[2]]?m[1]+' '+I.hm[m[2]]+' '+m[3]:h}
fetch('/prayer-times/data/'+c.replace('/','-')+'.json').then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(D){
  var lang=D.langs.indexOf(L)>-1?L:'en',name=D.names[lang]||D.names.en,url=D.urls[lang]||D.urls.en;
  function draw(){var n=now(D.tz),i=-1;for(var k=0;k<D.days.length;k++)if(D.days[k].date===n.date)i=k;
    if(i<0){box.innerHTML='<p class="sub">'+esc(I.error)+'</p>';return}
    var d=D.days[i],P=['Fajr','Dhuhr','Asr','Maghrib','Isha'],next=null,at=0,label;
    for(var j=0;j<P.length;j++)if(mins(d.t[P[j]])>n.min){next=P[j];at=mins(d.t[P[j]]);break}
    if(next)label=I.names[next];else if(D.days[i+1]){next='Fajr';at=mins(D.days[i+1].t.Fajr)+1440;label=I.names.Fajr+' '+I.tomorrow}
    var left=Math.max(0,Math.round(at-n.min)),h=Math.floor(left/60),m=left%60;
    var date=new Date(n.date+'T12:00:00Z').toLocaleDateString(I.locale,{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'});
    box.innerHTML='<h1>'+esc(name)+'</h1><p class="sub">'+esc(date)+' · '+esc(hij(d.hijri))+'</p><ul>'+
      ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].map(function(p){return'<li'+(p===next&&label===I.names[p]?' class="next"':'')+'><span>'+esc(I.names[p])+'</span><b>'+fmt(d.t[p])+'</b></li>'}).join('')+'</ul>'+
      (next?'<p class="nx">'+esc(I.next)+' <b>'+esc(label)+'</b> '+esc((h?I.leftH.replace('{h}',h):I.leftM).replace('{m}',m))+'</p>':'')+
      '<p class="by">'+esc(I.by)+' <a href="'+esc(url)+'" target="_blank" rel="noopener">iMuslim Life</a></p>';
  }
  draw();setInterval(draw,30000);
}).catch(function(){box.innerHTML='<p class="sub">'+esc(I.error)+'</p>'});
})();
</script>
</body>
</html>
`;
}

// The builder page (inside the city pages' layout).
export function builderBody() {
  return `
<main class="wrap">
  <p class="crumbs"><a href="/prayer-times/">Prayer times</a> › Widget for your website</p>
  <section class="hero">
    <h1>Free prayer times widget for your masjid's website</h1>
    <p class="sub">Today's prayer times, the next prayer with a countdown and the Hijri date, updated every day. No ads, no account, no cost.</p>
  </section>
  <div class="two wb">
    <section class="card">
      <h2>1. Choose your city</h2>
      <p><label>Country<br><select id="wb-country"></select></label></p>
      <p><label>City<br><select id="wb-city"></select></label></p>
      <p><label>Language<br><select id="wb-lang"></select></label></p>
      <p><label>Theme<br><select id="wb-theme"><option value="light">Light</option><option value="dark">Dark</option></select></label></p>
      <p class="hint">Times are calculated for the city with the method its masjids most often use. If your city isn't listed, choose the nearest one; times are usually within a few minutes. Your masjid's own iqamah times may differ.</p>
    </section>
    <section class="card">
      <h2>2. Preview</h2>
      <iframe id="wb-preview" title="Prayer times widget preview" style="width:100%;max-width:340px;height:360px;border:0"></iframe>
    </section>
  </div>
  <section class="card">
    <h2>3. Copy this code into your website</h2>
    <p>Paste it into an HTML block (WordPress: Custom HTML; Wix: Embed code; Squarespace: Code block).</p>
    <textarea id="wb-code" rows="6" readonly></textarea>
    <p class="btns"><button class="btn" type="button" id="wb-copy">Copy code</button> <span id="wb-copied" class="hint"></span></p>
  </section>
  <section class="card">
    <h2>Questions</h2>
    <details><summary>Does it cost anything?</summary><p>No. The widget is free, has no ads and needs no account.</p></details>
    <details><summary>Does it update by itself?</summary><p>Yes. It shows today's times every day, with the next prayer and a countdown, in the city's time zone.</p></details>
    <details><summary>Can it show our iqamah times?</summary><p>Not yet. Masjids that join Masjid Connect can publish their iqamah and Jumu'ah times for the Muslim Companion Alexa skill; email info@yzinfotech.com.</p></details>
  </section>
</main>
<script>
(function(){
var C=[],byCc={};
var $=function(id){return document.getElementById(id)};
fetch('/prayer-times/data/index.json').then(function(r){return r.json()}).then(function(list){
  C=list;list.forEach(function(c){(byCc[c.country]=byCc[c.country]||[]).push(c)});
  $('wb-country').innerHTML=Object.keys(byCc).sort().map(function(k){return'<option>'+k+'</option>'}).join('');
  var guess=Intl.DateTimeFormat().resolvedOptions().timeZone,hit=list.find(function(c){return c.tz===guess});
  if(hit)$('wb-country').value=hit.country;
  cities(hit&&hit.k);
});
function cities(sel){var cs=byCc[$('wb-country').value]||[];$('wb-city').innerHTML=cs.map(function(c){return'<option value="'+c.k+'">'+c.n+'</option>'}).join('');if(sel)$('wb-city').value=sel;langs()}
function langs(){var c=C.find(function(x){return x.k===$('wb-city').value});var names={en:'English',ar:'العربية',ur:'اردو',id:'Bahasa Indonesia',ms:'Bahasa Melayu'};
  $('wb-lang').innerHTML=(c?c.langs:['en']).map(function(l){return'<option value="'+l+'">'+names[l]+'</option>'}).join('');update()}
function update(){var c=C.find(function(x){return x.k===$('wb-city').value});if(!c)return;
  var src='https://imuslimlife.com/widget/embed/?c='+c.k+($('wb-theme').value==='dark'?'&theme=dark':'')+($('wb-lang').value!=='en'?'&lang='+$('wb-lang').value:'');
  $('wb-preview').src=src.replace('https://imuslimlife.com','');
  $('wb-code').value='<iframe src="'+src+'" title="Prayer times for '+c.n+'" style="width:100%;max-width:340px;height:360px;border:0" loading="lazy"></iframe>\\n<p style="font:12px sans-serif;margin:4px 0">Prayer times for <a href="https://imuslimlife.com'+c.u+'">'+c.n+'</a> by iMuslim Life</p>';}
$('wb-country').onchange=function(){cities()};$('wb-city').onchange=langs;$('wb-lang').onchange=update;$('wb-theme').onchange=update;
$('wb-copy').onclick=function(){$('wb-code').select();navigator.clipboard.writeText($('wb-code').value).then(function(){$('wb-copied').textContent='Copied.'})};
})();
</script>`;
}
