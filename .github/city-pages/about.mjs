// Trust pages (task 152 step 5, 2026-11-14): /about/ and /about/methodology/.
// Who makes the site and exactly how every time on it is worked out, so a generated
// timetable has a source a person (and Google) can check. Linked from every page footer.
const APP_STORE = 'https://apps.apple.com/app/6743494825';
const PLAY = 'https://play.google.com/store/apps/details?id=com.rayyan.salatemustaqeem';
const ALEXA = 'https://www.amazon.com/dp/B0GTBN95HQ/';
export const ABOUT_URLS = ['/about/', '/about/methodology/'];

export const organizationLd = (SITE) => ({
  '@type': 'Organization',
  '@id': `${SITE}/#org`,
  name: 'iMuslim Life',
  url: `${SITE}/`,
  logo: `${SITE}/logo512.png`,
  email: 'info@yzinfotech.com',
  sameAs: [APP_STORE, PLAY, ALEXA],
});

// countries: cities.json countries ({ cc: { name, methodName, asrName } }); listed: cities with pages.
export function aboutPages({ layout, esc, breadcrumb, countries, listed, SITE }) {
  const org = organizationLd(SITE);
  const counts = {};
  for (const c of listed) counts[c.country] = (counts[c.country] || 0) + 1;
  const byMethod = {};
  for (const cc of Object.keys(counts)) {
    const k = `${countries[cc].methodName}|${countries[cc].asrName}`;
    (byMethod[k] ||= []).push(countries[cc].name);
  }
  const methodRows = Object.entries(byMethod)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([k, names]) => {
      const [m, a] = k.split('|');
      return `<tr><th scope="row">${esc(m)}</th><td>${esc(a)}</td><td>${esc(names.sort().join(', '))}</td></tr>`;
    }).join('');

  const about = layout({
    title: 'About iMuslim Life: Prayer Times, Quran and Athan, Ad-Free',
    description: `Who makes iMuslim Life and the Salat-e-Mustaqeem app: free, ad-free prayer times for ${listed.length} cities, the Quran, and the Athan on Alexa.`,
    canonical: '/about/',
    jsonLd: [org, { '@type': 'AboutPage', url: `${SITE}/about/`, about: { '@id': org['@id'] } }, breadcrumb([['iMuslim Life', '/'], ['About', '/about/']])],
    body: `
<main class="wrap">
  <p class="crumbs"><a href="/">iMuslim Life</a> › About</p>
  <section class="card">
    <h1>About iMuslim Life</h1>
    <p>iMuslim Life is the website of <b>Salat-e-Mustaqeem</b>, a prayer app for iPhone, Apple Watch and Android, and of <b>Muslim Companion</b>, which plays the Athan on Amazon Echo. Both are made by a small independent team at YZ Infotech.</p>
    <p>Everything here is free and <b>always ad-free</b>: no ads, no tracking for advertising, no account needed to see prayer times.</p>
  </section>
  <section class="card">
    <h2>What is on this site</h2>
    <ul>
      <li><a href="/prayer-times/">Prayer times</a> for ${listed.length} cities in ${Object.keys(counts).length} countries, with monthly timetables and Hijri dates.</li>
      <li><a href="/qibla/">Qibla direction</a> and the <a href="/islamic-calendar/">Islamic calendar</a>.</li>
      <li>A <a href="/places/">masjid directory</a> for the USA and Canada, and a <a href="/widget/">free prayer-times widget</a> for masjid websites.</li>
      <li>The <a href="/quran/">Quran</a> with recitation and translation.</li>
    </ul>
  </section>
  <section class="card">
    <h2>How the times are calculated</h2>
    <p>Each city uses the calculation method of its country's religious authority. The sources, methods and Hijri dates are explained in full on the <a href="/about/methodology/">methodology page</a>.</p>
  </section>
  <section class="card">
    <h2>Get the app and the skill</h2>
    <p class="btns"><a class="btn" href="${APP_STORE}" rel="noopener">App Store</a><a class="btn alt" href="${PLAY}" rel="noopener">Google Play</a><a class="btn alt" href="${ALEXA}" rel="noopener">Athan on Alexa</a></p>
  </section>
  <section class="card">
    <h2>Contact</h2>
    <p>Corrections, a masjid to add or a question: <a href="mailto:info@yzinfotech.com">info@yzinfotech.com</a>. We read every message.</p>
  </section>
</main>`,
  });

  const methodology = layout({
    title: 'How iMuslim Life Calculates Prayer Times: Sources and Methods',
    description: 'The data sources, calculation methods by country, Hanafi and standard Asr, Hijri dates and masjid data behind every prayer timetable on iMuslim Life.',
    canonical: '/about/methodology/',
    jsonLd: [org, breadcrumb([['iMuslim Life', '/'], ['About', '/about/'], ['Methodology', '/about/methodology/']])],
    body: `
<main class="wrap">
  <p class="crumbs"><a href="/">iMuslim Life</a> › <a href="/about/">About</a> › Methodology</p>
  <section class="card">
    <h1>How we calculate prayer times</h1>
    <p>Prayer times follow the sun, so they can be calculated for any place from its latitude, longitude and time zone. What differs between communities is the convention: how far below the horizon the sun must be for Fajr and Isha, and how Asr is defined. This page sets out exactly which conventions each timetable uses.</p>
  </section>
  <section class="card">
    <h2>Where the times come from</h2>
    <ol>
      <li><b>Our prayer-times API</b> (node-api.imuslimlife.com) calculates the times for each city's coordinates and time zone. The website, the app and the Alexa skill all use it, so they always agree.</li>
      <li>If it can't be reached, the app falls back to <a href="https://aladhan.com/" rel="noopener">Aladhan</a>, a widely used public prayer-times service, with the same method.</li>
      <li>With no connection at all, the app calculates on the device with the open-source <a href="https://github.com/batoulapps/adhan-js" rel="noopener">Adhan</a> library.</li>
    </ol>
    <p>City pages are rebuilt every night. Today's row, the next prayer and the countdown are worked out in your browser in the city's own time zone, including daylight saving changes.</p>
  </section>
  <section class="card">
    <h2>Calculation method by country</h2>
    <p>Each country uses the method of its religious authority or the one its masjids most commonly follow. On any city page you can switch to another method; your choice is remembered in your browser.</p>
    <div class="scroll"><table class="tt about-tt"><thead><tr><th scope="col">Method</th><th scope="col">Asr</th><th scope="col">Countries</th></tr></thead><tbody>${methodRows}</tbody></table></div>
  </section>
  <section class="card">
    <h2>Asr: standard and Hanafi</h2>
    <p>The <b>standard</b> (Shafi'i, Maliki, Hanbali) Asr begins when an object's shadow equals its length plus its shadow at noon. The <b>Hanafi</b> Asr begins when the shadow is twice the object's length, so it is later, often by 45 minutes to over an hour. Pakistan, India, Bangladesh and other countries where the Hanafi school is followed use the Hanafi time by default.</p>
  </section>
  <section class="card">
    <h2>Hijri dates and Islamic events</h2>
    <p>Hijri dates are calculated (the Umm al-Qura calendar used in Saudi Arabia). Ramadan, Eid and other events can begin a day later where a community follows a local moon sighting, so each page says "expected" and asks you to follow your community's announcement.</p>
  </section>
  <section class="card">
    <h2>Masjid data</h2>
    <p>The masjid directory starts from <a href="https://www.openstreetmap.org/" rel="noopener">OpenStreetMap</a> (© OpenStreetMap contributors, ODbL). Masjids added through our form are listed after we review them, and masjids that publish their own iqamah times through Masjid Connect show those times live. City names and coordinates come from <a href="https://www.geonames.org/" rel="noopener">GeoNames</a> (CC BY 4.0).</p>
  </section>
  <section class="card">
    <h2>Your masjid's timetable comes first</h2>
    <p>Calculated times can differ from a masjid's printed timetable by a few minutes, because masjids add safety margins or follow a local committee. For congregation, follow your masjid. If a time here looks wrong, email <a href="mailto:info@yzinfotech.com">info@yzinfotech.com</a> with the city and date and we will check it.</p>
  </section>
</main>`,
  });

  return { pages: [['/about/', about], ['/about/methodology/', methodology]], urls: ABOUT_URLS };
}
