// Qibla direction pages (2026-11-06): /qibla/<country>/<city>/ and /qibla/<country>/ for every
// listed city, in the city's page languages (/<lang>/qibla/...). The bearing and distance are
// the city pages' own (qibla(), distanceKm()); the page adds a large dial and, on a phone, a
// live compass (DeviceOrientation, asked for only when the user taps). The SPA's /qibla/ tool
// stays the hub. Words below; city, country and compass names come from i18n.mjs.
const Q = {
  en: { far: (k) => `Makkah is about ${k} away.`, title: (n, d) => `Qibla Direction in ${n}: ${d}° from North`, desc: (n, d, c, k) => `The Qibla in ${n} is ${d}° from true north (${c}). Makkah is about ${k} away. Use your phone’s compass to face the Kaaba.`,
    h1: (n) => `Qibla direction in ${n}`, live: 'Use my phone’s compass', liveOn: 'Turn until the arrow points up', liveNo: 'This device has no compass; use the angle above with a compass.',
    how: 'How to use it', steps: ['Stand facing north (0°), using a compass or the map on your phone.', 'Turn clockwise by the angle shown.', 'You are now facing the Kaaba in Makkah.'],
    note: 'Bearing along the great circle from the city centre to the Kaaba. Keep the phone flat and away from metal.', times: (n) => `Prayer times in ${n}`, country: (k) => `Qibla direction in ${k}`, list: 'Cities', tool: 'Find the Qibla from where you are' },
  ar: { far: (k) => `تبعد مكة المكرمة نحو ${k}.`, title: (n, d) => `اتجاه القبلة في ${n}: ${d}° من الشمال`, desc: (n, d, c, k) => `القبلة في ${n} على ${d}° من الشمال الجغرافي (${c}). تبعد مكة نحو ${k}. استخدم بوصلة هاتفك لتتجه إلى الكعبة.`,
    h1: (n) => `اتجاه القبلة في ${n}`, live: 'استخدم بوصلة هاتفي', liveOn: 'استدر حتى يشير السهم إلى الأعلى', liveNo: 'لا يحتوي هذا الجهاز على بوصلة؛ استخدم الزاوية أعلاه مع بوصلة.',
    how: 'طريقة الاستخدام', steps: ['قف متجهًا إلى الشمال (0°) باستخدام بوصلة أو الخريطة في هاتفك.', 'استدر باتجاه عقارب الساعة بالزاوية الموضحة.', 'أنت الآن متجه إلى الكعبة في مكة المكرمة.'],
    note: 'الاتجاه على الدائرة العظمى من وسط المدينة إلى الكعبة. أبقِ الهاتف مستويًا وبعيدًا عن المعادن.', times: (n) => `مواقيت الصلاة في ${n}`, country: (k) => `اتجاه القبلة في ${k}`, list: 'المدن', tool: 'اعرف القبلة من مكانك' },
  ur: { far: (k) => `مکہ مکرمہ تقریباً ${k} دور ہے۔`, title: (n, d) => `${n} میں قبلہ کی سمت: شمال سے ${d}°`, desc: (n, d, c, k) => `${n} میں قبلہ شمال سے ${d}° پر ہے (${c})۔ مکہ مکرمہ تقریباً ${k} دور ہے۔ کعبہ کی طرف رخ کرنے کے لیے اپنے فون کا کمپاس استعمال کریں۔`,
    h1: (n) => `${n} میں قبلہ کی سمت`, live: 'میرے فون کا کمپاس استعمال کریں', liveOn: 'گھومیں یہاں تک کہ تیر اوپر کی طرف ہو', liveNo: 'اس ڈیوائس میں کمپاس نہیں؛ اوپر دیا گیا زاویہ کمپاس کے ساتھ استعمال کریں۔',
    how: 'استعمال کا طریقہ', steps: ['کمپاس یا فون کے نقشے کی مدد سے شمال (0°) کی طرف رخ کریں۔', 'دکھائے گئے زاویے کے برابر گھڑی کی سمت میں گھومیں۔', 'اب آپ مکہ مکرمہ میں کعبہ کی طرف رخ کیے ہوئے ہیں۔'],
    note: 'شہر کے مرکز سے کعبہ تک عظیم دائرے پر سمت۔ فون کو سیدھا اور دھات سے دور رکھیں۔', times: (n) => `${n} میں اوقاتِ نماز`, country: (k) => `${k} میں قبلہ کی سمت`, list: 'شہر', tool: 'اپنی جگہ سے قبلہ معلوم کریں' },
  id: { far: (k) => `Makkah berjarak sekitar ${k}.`, title: (n, d) => `Arah Kiblat di ${n}: ${d}° dari Utara`, desc: (n, d, c, k) => `Kiblat di ${n} berada ${d}° dari utara sejati (${c}). Makkah berjarak sekitar ${k}. Gunakan kompas ponsel untuk menghadap Ka’bah.`,
    h1: (n) => `Arah kiblat di ${n}`, live: 'Gunakan kompas ponsel saya', liveOn: 'Putar badan sampai panah menunjuk ke atas', liveNo: 'Perangkat ini tidak memiliki kompas; gunakan sudut di atas dengan kompas.',
    how: 'Cara menggunakan', steps: ['Menghadap ke utara (0°) dengan kompas atau peta di ponsel.', 'Putar searah jarum jam sebesar sudut yang ditunjukkan.', 'Kini Anda menghadap Ka’bah di Makkah.'],
    note: 'Arah lingkaran besar dari pusat kota ke Ka’bah. Pegang ponsel mendatar dan jauh dari logam.', times: (n) => `Jadwal salat di ${n}`, country: (k) => `Arah kiblat di ${k}`, list: 'Kota', tool: 'Cari kiblat dari lokasi Anda' },
  ms: { far: (k) => `Makkah kira-kira ${k} jauhnya.`, title: (n, d) => `Arah Kiblat di ${n}: ${d}° dari Utara`, desc: (n, d, c, k) => `Kiblat di ${n} ialah ${d}° dari utara benar (${c}). Makkah kira-kira ${k} jauhnya. Gunakan kompas telefon untuk menghadap Kaabah.`,
    h1: (n) => `Arah kiblat di ${n}`, live: 'Guna kompas telefon saya', liveOn: 'Pusing sehingga anak panah menghala ke atas', liveNo: 'Peranti ini tiada kompas; gunakan sudut di atas dengan kompas.',
    how: 'Cara menggunakan', steps: ['Hadap ke utara (0°) menggunakan kompas atau peta di telefon.', 'Pusing mengikut arah jam sebanyak sudut yang ditunjukkan.', 'Kini anda menghadap Kaabah di Makkah.'],
    note: 'Arah bulatan besar dari pusat bandar ke Kaabah. Pegang telefon mendatar dan jauh dari logam.', times: (n) => `Waktu solat di ${n}`, country: (k) => `Arah kiblat di ${k}`, list: 'Bandar', tool: 'Cari kiblat dari lokasi anda' },
  fr: { far: (k) => `La Mecque est à environ ${k}.`, title: (n, d) => `Direction de la Qibla à ${n} : ${d}° du nord`, desc: (n, d, c, k) => `À ${n}, la Qibla est à ${d}° du nord géographique (${c}). La Mecque est à environ ${k}. Utilisez la boussole de votre téléphone pour vous tourner vers la Kaaba.`,
    h1: (n) => `Direction de la Qibla à ${n}`, live: 'Utiliser la boussole de mon téléphone', liveOn: 'Tournez jusqu’à ce que la flèche pointe vers le haut', liveNo: 'Cet appareil n’a pas de boussole ; utilisez l’angle ci-dessus avec une boussole.',
    how: 'Comment l’utiliser', steps: ['Placez-vous face au nord (0°) avec une boussole ou la carte de votre téléphone.', 'Tournez dans le sens des aiguilles d’une montre de l’angle indiqué.', 'Vous êtes maintenant tourné vers la Kaaba à La Mecque.'],
    note: 'Direction selon le grand cercle, du centre-ville à la Kaaba. Tenez le téléphone à plat, loin du métal.', times: (n) => `Horaires de prière à ${n}`, country: (k) => `Direction de la Qibla : ${k}`, list: 'Villes', tool: 'Trouver la Qibla depuis votre position' },
  tr: { far: (k) => `Mekke yaklaşık ${k} uzaklıkta.`, title: (n, d) => `${n} Kıble Yönü: Kuzeyden ${d}°`, desc: (n, d, c, k) => `${n} için kıble, coğrafi kuzeyden ${d}° (${c}). Mekke yaklaşık ${k} uzaklıkta. Kâbe’ye dönmek için telefonunuzun pusulasını kullanın.`,
    h1: (n) => `${n} kıble yönü`, live: 'Telefonumun pusulasını kullan', liveOn: 'Ok yukarıyı gösterene kadar dönün', liveNo: 'Bu cihazda pusula yok; yukarıdaki açıyı bir pusulayla kullanın.',
    how: 'Nasıl kullanılır', steps: ['Bir pusula ya da telefonunuzdaki harita ile kuzeye (0°) dönün.', 'Gösterilen açı kadar saat yönünde dönün.', 'Artık Mekke’deki Kâbe’ye dönüksünüz.'],
    note: 'Şehir merkezinden Kâbe’ye büyük daire üzerindeki yön. Telefonu düz ve metalden uzak tutun.', times: (n) => `${n} namaz vakitleri`, country: (k) => `${k} kıble yönü`, list: 'Şehirler', tool: 'Bulunduğunuz yerden kıbleyi bulun' },
};

export function buildQibla({ listed, langsOf, ALL_LANGS, countriesIn, layout, esc, breadcrumb, qibla, compass, distanceKm, fmtDistance, named, kname, cityUrl, KAABA, SITE }) {
  const pre = (L) => (L === 'en' ? '' : `/${L}`);
  const qUrl = (c, L = 'en') => `${pre(L)}/qibla/${c.country}/${c.slug}/`;
  const kUrl = (cc, L = 'en') => `${pre(L)}/qibla/${cc}/`;
  const pages = [];
  const urls = [];
  const add = (u, html) => { pages.push([u, html]); urls.push(u); };

  const dial = (q) => `<svg class="qdial" viewBox="0 0 200 200" role="img" aria-hidden="true">
<circle cx="100" cy="100" r="94" class="q-ring"/><circle cx="100" cy="100" r="80" class="q-ring2"/>
${Array.from({ length: 72 }, (_, i) => `<line x1="100" y1="${i % 9 === 0 ? 10 : 14}" x2="100" y2="20" transform="rotate(${i * 5} 100 100)" class="q-tick${i % 18 === 0 ? ' q-major' : ''}"/>`).join('')}
<text x="100" y="36" text-anchor="middle" class="q-n">N</text>
<g id="q-rose"><g transform="rotate(${q.toFixed(1)} 100 100)"><path d="M100 26 L112 104 L100 94 L88 104 Z" class="q-needle"/><rect x="92" y="18" width="16" height="16" rx="2" class="q-kaaba"/></g></g>
<circle cx="100" cy="100" r="7" class="q-hub"/></svg>`;

  function cityPage(c, L) {
    const T = Q[L];
    const n = named(c, L);
    const q = qibla(c.lat, c.lon);
    const deg = q.toFixed(1);
    const dist = fmtDistance(distanceKm(c, KAABA), c.country, L);
    const near = listed.filter((o) => o !== c && o.country === c.country && langsOf(o.country).includes(L)).sort((a, b) => distanceKm(c, a) - distanceKm(c, b)).slice(0, 8);
    const body = `<main class="wrap">
<nav class="crumbs"><a href="${kUrl(c.country, L)}">${esc(T.country(kname(c.country, L)))}</a> › <span>${esc(n)}</span></nav>
<section class="hero qhero">
  <h1>${esc(T.h1(n))}</h1>
  <p class="qdeg"><b>${deg}°</b> <span>${esc(compass(q, L))}</span></p>
  ${dial(q)}
  <p class="sub">${esc(T.far(dist))}</p>
  <p><button type="button" id="q-live" class="q-btn" hidden>${T.live}</button></p>
  <p id="q-msg" class="sub" aria-live="polite"></p>
</section>
<section class="card"><h2>${T.how}</h2><ol class="q-steps">${T.steps.map((s) => `<li>${s}</li>`).join('')}</ol><p class="sub">${T.note}</p></section>
${near.length ? `<section class="card"><h2>${T.list}</h2><p class="near">${near.map((o) => `<a href="${qUrl(o, L)}">${esc(named(o, L))} <small>${qibla(o.lat, o.lon).toFixed(0)}°</small></a>`).join(' ')}</p></section>` : ''}
<p class="cta"><a href="${cityUrl(c, L)}">${esc(T.times(n))}</a> · <a href="/qibla/">${T.tool}</a></p>
</main>
<script>(function(){var Q=${q.toFixed(2)},b=document.getElementById('q-live'),m=document.getElementById('q-msg'),r=document.getElementById('q-rose'),W=${JSON.stringify({ on: T.liveOn, no: T.liveNo })};
if(!('DeviceOrientationEvent' in window)||!matchMedia('(pointer:coarse)').matches)return;b.hidden=false;
function on(e){var h=e.webkitCompassHeading!=null?e.webkitCompassHeading:(e.absolute&&e.alpha!=null?360-e.alpha:null);if(h==null)return;r.setAttribute('transform','rotate('+(-h).toFixed(1)+' 100 100)');m.textContent=W.on}
b.addEventListener('click',function(){var go=function(){addEventListener('deviceorientationabsolute',on);addEventListener('deviceorientation',on);setTimeout(function(){if(!m.textContent)m.textContent=W.no},3000)};
if(DeviceOrientationEvent.requestPermission){DeviceOrientationEvent.requestPermission().then(function(s){if(s==='granted')go();else m.textContent=W.no}).catch(function(){m.textContent=W.no})}else go();b.hidden=true})})();</script>
<style>.qhero{display:grid;justify-items:center;gap:8px}.qdeg{font-size:clamp(40px,10vw,64px);line-height:1;color:var(--green)}.qdeg span{font-size:18px;color:var(--muted)}.qdial{width:min(78vw,280px);height:auto}.q-ring{fill:var(--paper);stroke:var(--gold);stroke-width:3}.q-ring2{fill:none;stroke:var(--line)}.q-tick{stroke:var(--muted);stroke-width:1}.q-major{stroke:var(--gold);stroke-width:2.5}.q-n{font:600 15px Rubik,sans-serif;fill:var(--muted)}.q-needle{fill:var(--green)}.q-kaaba{fill:#1d1a12;stroke:var(--gold);stroke-width:2}.q-hub{fill:var(--gold)}#q-rose{transition:transform .2s}.q-btn{min-height:48px;padding:0 22px;border-radius:999px;border:0;background:var(--green);color:#fff;font:inherit;cursor:pointer}.q-steps{padding-inline-start:20px;display:grid;gap:4px}.near{display:flex;flex-wrap:wrap;gap:8px}.near a{padding:8px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;min-height:44px;display:inline-flex;align-items:center;gap:6px}@media (prefers-reduced-motion:reduce){#q-rose{transition:none}}</style>`;
    return layout({ L, image: '/og/qibla.jpg', title: `${T.title(n, deg)} | iMuslim Life`, description: T.desc(n, deg, compass(q, L), dist), canonical: qUrl(c, L), alternates: langsOf(c.country).map((l) => [l, qUrl(c, l)]),
      jsonLd: [breadcrumb([[T.country(kname(c.country, L)), kUrl(c.country, L)], [n, qUrl(c, L)]]), { '@type': 'Place', name: n, geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lon }, url: `${SITE}${qUrl(c, L)}` }], body });
  }

  function countryPage(cc, L) {
    const T = Q[L];
    const cities = listed.filter((c) => c.country === cc).sort((a, b) => named(a, L).localeCompare(named(b, L), L));
    const body = `<main class="wrap"><section class="hero"><h1>${esc(T.country(kname(cc, L)))}</h1></section>
<section class="card"><p class="near">${cities.map((c) => `<a href="${qUrl(c, L)}">${esc(named(c, L))} <small>${qibla(c.lat, c.lon).toFixed(0)}°</small></a>`).join(' ')}</p></section>
<p class="cta"><a href="/qibla/">${T.tool}</a></p></main><style>.near{display:flex;flex-wrap:wrap;gap:8px}.near a{padding:8px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;min-height:44px;display:inline-flex;align-items:center;gap:6px}</style>`;
    const first = cities[0];
    return layout({ L, image: '/og/qibla.jpg', title: `${T.country(kname(cc, L))} | iMuslim Life`, description: T.desc(kname(cc, L), qibla(first.lat, first.lon).toFixed(0), compass(qibla(first.lat, first.lon), L), fmtDistance(distanceKm(first, KAABA), cc, L)),
      canonical: kUrl(cc, L), alternates: langsOf(cc).map((l) => [l, kUrl(cc, l)]), jsonLd: [breadcrumb([[T.country(kname(cc, L)), kUrl(cc, L)]])], body });
  }

  for (const c of listed) for (const L of langsOf(c.country)) if (Q[L]) add(qUrl(c, L), cityPage(c, L));
  for (const L of ALL_LANGS) if (Q[L]) for (const [cc] of countriesIn(L)) add(kUrl(cc, L), countryPage(cc, L));
  return { pages, urls, qUrl };
}
