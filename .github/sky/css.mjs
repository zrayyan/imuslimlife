// The one Living Sky stylesheet (task K01), generated from tokens.mjs. `html[data-sky]` carries
// the sky; the page theme (day or night) follows from it. Logical properties throughout, so RTL
// needs no second sheet. Never loaded by the Places pages, which keep their own style.
import { SKIES, SKY_ORDER, PAGES, POS_FOR, pageFor } from './tokens.mjs';

/** Self-hosted by the Worker (src/index.js, /fonts/sky/): same origin, preloaded, with metric-matched fallbacks so the swap never shifts layout. */
export const FONT_FILES = { marcellus: '/fonts/sky/marcellus-latin.woff2', inter: '/fonts/sky/inter-latin.woff2' };
const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF';
export const FONT_FACES = `@font-face{font-family:Marcellus;font-weight:400;font-display:swap;src:url(/fonts/sky/marcellus-latin.woff2) format('woff2');unicode-range:${LAT}}
@font-face{font-family:Marcellus;font-weight:400;font-display:swap;src:url(/fonts/sky/marcellus-latin-ext.woff2) format('woff2');unicode-range:${EXT}}
@font-face{font-family:Inter;font-weight:400 600;font-display:swap;src:url(/fonts/sky/inter-latin.woff2) format('woff2');unicode-range:${LAT}}
@font-face{font-family:Inter;font-weight:400 600;font-display:swap;src:url(/fonts/sky/inter-latin-ext.woff2) format('woff2');unicode-range:${EXT}}
@font-face{font-family:'Marcellus Fallback';src:local(Georgia);size-adjust:96.9%;ascent-override:100.5%;descent-override:28.9%;line-gap-override:0%}
@font-face{font-family:'Inter Fallback';src:local(Arial);size-adjust:105.6%;ascent-override:91.7%;descent-override:22.8%;line-gap-override:0%}`;

export const FONTS = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Amiri+Quran&family=Noto+Nastaliq+Urdu:wght@400&display=swap';

const skyVars = (key) => {
  const s = SKIES[key];
  const st = [...s.stops]; while (st.length < 4) st.push(st[st.length - 1]);
  const pos = POS_FOR[key];
  const p = pos.length === 4 ? pos : [pos[0], pos[1], pos[2], pos[2]];
  return `--s0:${st[0]};--s1:${st[1]};--s2:${st[2]};--s3:${st[3]};--p1:${p[1]}%;--p2:${p[2]}%;--sky-ground:${s.ground};--sky-ground-ink:${s.groundInk};--sky-ink:${s.ink};--sky-soft:${s.soft};--sky-accent:${s.accent};--sky-on:${s.inkOn};--sky-glass:${s.glass};--sky-line:${s.line};--sky-sun:${s.sun};--sky-stars:${s.stars};--sky-top:var(--s0);--sky-bg:linear-gradient(180deg,var(--s0) 0%,var(--s1) var(--p1),var(--s2) var(--p2),var(--s3) 100%);${SKY_ORDER.map((o) => `--show-${o}:${o === key ? 'inline' : 'none'}`).join(';')}`;
};
const pageVars = (k) => { const p = PAGES[k]; return `--bg:${p.bg};--ink:${p.ink};--soft:${p.soft};--card:${p.card};--line:${p.line};--gold:${p.gold};--accent:${p.accent};--band:${p.band}`; };

export function skyCss() {
  const byTheme = { day: SKY_ORDER.filter((k) => pageFor(k) === 'day'), night: SKY_ORDER.filter((k) => pageFor(k) === 'night') };
  const themes = Object.entries(byTheme).map(([th, ks]) => `${ks.map((k) => `[data-sky="${k}"]`).join(',')}{${pageVars(th)};color-scheme:${th === 'day' ? 'light' : 'dark'}}`).join('\n');
  const skies = SKY_ORDER.map((k) => `[data-sky="${k}"]{${skyVars(k)}}`).join('\n');
  return `${[
    ...['--s0', '--s1', '--s2', '--s3'].map((n) => `@property ${n}{syntax:"<color>";inherits:true;initial-value:#000}`),
    ':root{--serif:Marcellus,"Marcellus Fallback",Georgia,serif;--sans:Inter,"Inter Fallback",system-ui,-apple-system,sans-serif}',
    ':root{' + skyVars('dhuhr') + ';' + pageVars('day') + '}', // sky-less fallback: Dhuhr, JS and Worker both absent
    skies, themes,
    BASE,
  ].join('\n')}\n`;
}

const BASE = `
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 var(--sans)}
a{color:var(--accent)}
h1,h2,h3{font-family:var(--serif);font-weight:400;margin:0}
p{margin:0}
:lang(ar){font-family:Amiri,serif}
:lang(ur){font-family:'Noto Nastaliq Urdu',serif;line-height:2}
.sk-quran{font-family:'Amiri Quran',Amiri,serif;line-height:1.9}
.sk-sr{position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.sk-wrap{max-inline-size:1280px;margin-inline:auto;padding-inline:32px}
.sk-gold{fill:currentColor}
.sk-skip{position:absolute;inset-inline-start:12px;inset-block-start:-80px;z-index:10;padding:12px 18px;border-radius:12px;background:var(--bg);color:var(--ink);font-weight:600}
.sk-skip:focus{inset-block-start:12px}
:where(a,button,input):focus-visible{outline:2px solid currentColor;outline-offset:3px}

/* The stage: header and hero sit on the sky; the ground silhouette closes it. */
.sk-stage{position:relative;overflow:hidden;background:var(--sky-bg);color:var(--sky-ink)}
.sk-stage a{color:inherit}
.sk-scene{position:absolute;inset-inline:0;inset-block-end:0;inline-size:100%;block-size:120px;display:block;pointer-events:none}
.sk-skyline{fill:var(--sky-ground)}
.sk-scene .sk-sun{fill:var(--sky-sun)}
${SKY_ORDER.map((k) => `.sk-sun[data-for="${k}"]{display:var(--show-${k})}`).join('')}
.sk-stars{position:absolute;inset:0;opacity:var(--sky-stars);pointer-events:none}
.sk-stars i{position:absolute;border-radius:50%;background:#FFF6E0}
.sk-moon{position:absolute;inset-block-start:132px;inset-inline-end:11%;display:var(--show-isha);pointer-events:none}
.sk-content{position:relative;z-index:2}

/* Header (text on the deep top of the sky only) */
.sk-header{background:var(--sky-top);color:var(--sky-ink);position:relative;z-index:20}
.sk-stage .sk-header{background:transparent}
.sk-bar{position:relative;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;padding-block:22px;max-inline-size:1280px}
.sk-right{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
.sk-logo,.sk-logo-static{display:inline-flex;align-items:center;gap:10px;min-block-size:48px;color:inherit;text-decoration:none;font:400 22px var(--serif);letter-spacing:.01em}
.sk-logo svg,.sk-logo-static svg{color:var(--sky-accent)}
.sk-nav{display:flex;flex-wrap:wrap;gap:0 4px;font-size:15px;font-weight:500}
.sk-nav a{display:inline-flex;align-items:center;min-block-size:48px;padding-inline:11px;color:inherit;text-decoration:none}
.sk-nav a:hover{text-decoration:underline;text-underline-offset:3px}
.sk-nav a{white-space:nowrap}
.sk-more{position:relative;display:inline-flex}
.sk-more-t{position:absolute;inset:0;inline-size:100%;block-size:100%;margin:0;opacity:0;cursor:pointer;z-index:1}
.sk-more-btn{display:inline-flex;align-items:center;gap:6px;min-block-size:48px;padding-inline:14px;color:inherit}
.sk-more-btn svg{transition:transform .2s}
.sk-more-t:focus-visible+.sk-more-btn{outline:2px solid currentColor;outline-offset:-4px;border-radius:999px}
.sk-more-t:checked+.sk-more-btn svg,.sk-more:hover .sk-more-btn svg{transform:rotate(180deg)}
.sk-more-panel{display:none;position:absolute;inset-block-start:calc(100% + 4px);inset-inline-end:0;z-index:5;min-inline-size:240px;padding:8px;border-radius:20px;background:var(--sky-top);background:color-mix(in srgb,var(--sky-top) 82%,transparent);-webkit-backdrop-filter:blur(22px) saturate(1.4);backdrop-filter:blur(22px) saturate(1.4);box-shadow:inset 0 0 0 1px var(--sky-line),0 24px 60px -24px rgba(0,0,0,.55);flex-direction:column}
.sk-more-panel a{padding-inline:14px;border-radius:12px}
.sk-more-panel a:hover{background:var(--sky-glass);text-decoration:none}
.sk-more-t:checked~.sk-more-panel,.sk-more:hover .sk-more-panel,.sk-more:focus-within .sk-more-panel{display:flex}
.sk-nav a[aria-current]{color:var(--sky-accent);font-weight:600}
.sk-ask{display:flex;align-items:center;gap:10px;min-block-size:48px;margin-inline-start:8px;padding-inline:16px 14px;border-radius:999px;background:var(--sky-glass);box-shadow:inset 0 0 0 1px var(--sky-line);color:var(--sky-ink)}
.sk-ask input{inline-size:150px;max-inline-size:48vw;block-size:44px;border:0;background:transparent;color:inherit;font:400 15px var(--sans);outline:0}
.sk-ask input::placeholder{color:var(--sky-soft);opacity:1}
.sk-ask kbd{font:12px var(--sans);padding:2px 7px;border-radius:6px;box-shadow:inset 0 0 0 1px var(--sky-line)}
.sk-ask:focus-within{box-shadow:inset 0 0 0 2px var(--sky-accent)}
.sk-cta{display:inline-flex;align-items:center;min-block-size:48px;margin-inline-start:8px;padding-inline:20px;border-radius:999px;background:var(--sky-accent);color:var(--sky-on)!important;font-weight:600;font-size:15px;text-decoration:none}

/* Phone header: logo, compact Get the app and a menu button on one row, the Ask bar full width below,
   the links in a panel opened by the (CSS-only, so JS-off) menu button. */
.sk-menu-t,.sk-menubtn{display:none}
@media (min-width:1180px) and (max-width:1559px){
  .sk-ask kbd{display:none}.sk-ask input{inline-size:104px}.sk-ask{margin-inline-start:2px;padding-inline:14px 8px}
  .sk-nav{gap:0}.sk-nav a,.sk-more-btn{padding-inline:8px}.sk-cta{margin-inline-start:2px;padding-inline:16px}
  .sk-bar{gap:8px 8px}
}
@media (max-width:1179px){
  .sk-bar{gap:8px 10px;padding-block:12px}
  .sk-right{display:contents}
  .sk-logo{order:1;margin-inline-end:auto}
  .sk-cta{order:2;min-block-size:44px;padding-inline:14px;margin:0;font-size:14px}
  .sk-menu-t{display:block;position:absolute;opacity:0;inline-size:44px;block-size:44px;margin:0;order:3;z-index:1;inset-inline-end:16px;inset-block-start:12px;cursor:pointer}
  .sk-menubtn{order:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;inline-size:44px;block-size:44px;border-radius:50%;background:var(--sky-glass);box-shadow:inset 0 0 0 1px var(--sky-line)}
  .sk-menubtn i{display:block;inline-size:16px;block-size:1.5px;border-radius:1px;background:currentColor;transition:transform .2s}
  .sk-menu-t:focus-visible+.sk-menubtn{outline:2px solid currentColor;outline-offset:3px}
  .sk-menu-t:checked+.sk-menubtn i:first-child{transform:translateY(3.75px) rotate(45deg)}
  .sk-menu-t:checked+.sk-menubtn i:last-child{transform:translateY(-3.75px) rotate(-45deg)}
  .sk-ask{order:4;inline-size:100%;margin:0;flex:1 1 100%}
  .sk-ask input{inline-size:100%;max-inline-size:none;flex:1}
  .sk-nav{order:5;display:none;flex-direction:column;inline-size:100%;padding-block:4px;border-block-start:1px solid var(--sky-line)}
  .sk-menu-t:checked~.sk-right .sk-nav{display:flex}
  .sk-nav a{padding-inline:4px}
  .sk-more{display:contents}
  .sk-more-t,.sk-more-btn{display:none}
  .sk-more-panel{display:flex;position:static;padding:0;min-inline-size:0;background:none;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;border-radius:0}
  .sk-more-panel a{padding-inline:4px;border-radius:0}
}

/* Footer (page theme) */
.sk-footer{border-block-start:1px solid var(--line);background:var(--bg);color:var(--ink)}
.sk-footer .sk-wrap{padding-block:56px 36px;display:flex;flex-direction:column;gap:40px}
.sk-foot-top{display:flex;flex-wrap:wrap;gap:40px 48px;justify-content:space-between}
.sk-about{flex:1 1 240px;max-inline-size:320px;display:flex;flex-direction:column;gap:12px}
.sk-about p{color:var(--soft);font-size:15px}
.sk-logo-static svg{color:var(--gold)}
.sk-cols{flex:3 1 560px;display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:20px;font-size:15px}
.sk-col{display:flex;flex-direction:column}
.sk-col b{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold);margin-block-end:4px}
.sk-footer a{color:var(--ink);text-decoration:none}
.sk-col a,.sk-langs a,.sk-legal-links a{display:inline-flex;align-items:center;min-block-size:48px}
.sk-col a:hover,.sk-langs a:hover,.sk-legal-links a:hover{text-decoration:underline}
.sk-langs{display:flex;flex-wrap:wrap;gap:0 20px;font-size:15px}
.sk-langs a{color:var(--soft)}
.sk-langs a[aria-current]{color:var(--ink);font-weight:600}
.sk-legal{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px 18px;padding-block-start:16px;border-block-start:1px solid var(--line);font-size:13px;color:var(--soft)}
.sk-legal-links{display:flex;gap:0 18px;font-size:14px}

@media (max-width:720px){.sk-wrap{padding-inline:16px}
}

/* The hero (canvas "THE LIVING SKY") */
.hr{position:relative}
.hr-top{position:relative;z-index:3;max-inline-size:980px;margin-inline:auto;padding:72px 32px 40px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px}
.hr-where{font-size:14px;letter-spacing:.04em;color:var(--sky-soft)}
.hr-where a{text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--sky-line)}
.hr-eyebrow{margin-block-start:18px;font-size:13px;letter-spacing:.22em;text-transform:uppercase;font-weight:600;color:var(--sky-accent)}
.hr-name{font-family:var(--serif);font-weight:400;font-size:clamp(88px,13vw,168px);line-height:1.04;padding-block:.05em;letter-spacing:-.03em;overflow-wrap:anywhere}
.hr-when{margin-block-start:6px;font-size:22px;color:var(--sky-soft)}
.hr-when b{color:var(--sky-ink);font-weight:500}
.hr-pill{margin-block-start:10px;display:inline-flex;align-items:center;gap:10px;min-block-size:48px;padding-inline:18px;border-radius:999px;background:var(--sky-accent);color:var(--sky-on)!important;font-weight:600;font-size:15px;text-decoration:none}
.hr-ask{margin-block-start:34px;inline-size:100%;max-inline-size:680px;display:flex;align-items:center;gap:8px;padding:8px;padding-inline:22px 8px;border-radius:999px;background:var(--sky-glass);box-shadow:inset 0 0 0 1px var(--sky-line),0 20px 60px -30px rgba(0,0,0,.45);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:var(--sky-ink)}
.hr-ask svg{flex:none}
.hr-ask input{flex:1;min-inline-size:0;block-size:48px;border:0;background:transparent;color:inherit;font:400 17px var(--sans);outline:0}
.hr-ask input::placeholder{color:var(--sky-soft);opacity:1}
.hr-ask button{flex:none;min-block-size:48px;padding-inline:22px;border:0;border-radius:999px;background:var(--sky-ink);color:var(--sky-on);font:600 15px var(--sans);cursor:pointer}
.hr-ask:focus-within{box-shadow:inset 0 0 0 2px var(--sky-accent),0 20px 60px -30px rgba(0,0,0,.45)}
.hr-chips{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;font-size:14px}
.hr-chips a{position:relative;display:inline-flex;align-items:center;block-size:36px;padding-inline:14px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--sky-line);text-decoration:none}
.hr-chips a::after{content:"";position:absolute;inset-block:-6px;inset-inline:0}
.hr-arcwrap{position:relative;margin-block-start:8px}
.hr-arc{position:relative;z-index:2;max-inline-size:1120px;margin-inline:auto;padding-inline:32px;direction:ltr}
.hr-arc svg{display:block;inline-size:100%;block-size:auto;overflow:visible}
.hr-dots{fill:none;stroke:var(--sky-line);stroke-width:1.5;stroke-dasharray:2 6;stroke-linecap:round}
.hr-live{fill:none;stroke:var(--sky-accent);stroke-width:2;stroke-linecap:round}
.hr-mark{fill:var(--sky-ground);stroke:var(--sky-accent);stroke-width:1.5}.hr-mark.on{fill:var(--sky-accent)}
.hr-glow{fill:var(--sky-sun);opacity:.35;transform-origin:center;transform-box:fill-box}
.hr-sun{fill:var(--sky-sun)}
.hr-skyline{position:absolute;z-index:1;inset-inline-start:0;inset-block-end:0;inline-size:100%;block-size:max(120px,8.334vw);display:block}
.hr-ground{position:relative;z-index:2;background:var(--sky-ground);color:var(--sky-ground-ink)}
.hr-gw{max-inline-size:1120px;margin-inline:auto;padding-inline:32px}
.hr-times{position:relative;list-style:none;margin:0;padding:0;block-size:76px;direction:ltr}
.hr-t{position:absolute;top:14px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;white-space:nowrap}
.hr-t span{font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.72}
.hr-t b{font-size:15px;font-weight:500}
.hr-t.next span{opacity:1}.hr-t.next b{font-weight:700;color:var(--sky-accent)}
.hr-foot{max-inline-size:1280px;margin-inline:auto;padding:8px 32px 28px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;font-size:13px}
.hr-foot p{margin:0;opacity:.8}
.hr-foot a{color:inherit}.hr-foot p a{text-decoration:underline}
.hr-preview{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding:4px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--sky-line)}
.hr-preview a{display:inline-flex;align-items:center;block-size:34px;padding-inline:12px;border-radius:999px;font:500 13px var(--sans);text-decoration:none}
.hr-preview a[aria-current]{background:var(--sky-ink);color:var(--sky-on)}
@media (max-width:720px){
  .hr-top{padding:40px 16px 28px}.hr-when{font-size:18px}.hr-name{font-size:clamp(64px,22vw,96px)}
  .hr-arc,.hr-gw,.hr-foot{padding-inline:16px}
  .hr-times{block-size:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:10px 4px;padding-block:14px 8px}
  .hr-t{position:static;transform:none}
  .hr-preview{display:grid;grid-template-columns:repeat(3,1fr);inline-size:100%;border-radius:24px}.hr-preview a{block-size:48px;justify-content:center}
}

/* Motion: the sky turns over 1.2 s when a prayer begins; stars twinkle only at night. */
@media (prefers-reduced-motion:no-preference){
  :root{transition:--s0 1.2s,--s1 1.2s,--s2 1.2s,--s3 1.2s}
  [data-sky] body{transition:background-color 1.2s,color 1.2s}
  .star{animation:sk-tw 5s ease-in-out infinite}
  .hr-glow{animation:sk-br 6s ease-in-out infinite}
  @keyframes sk-tw{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes sk-br{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.6;transform:scale(1.12)}}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

/* Arabic and Urdu display text: the Latin display line-height (about 1.0) collides with diacritics and tall letters. */
:lang(ar) :is(.hr-name,.hm-h2,.hm-pl h2,.hm-quran h2,.hm-three b,.hm-promise b,.hm-big,.hm-door b,h1,h2,h3){font-family:Amiri,serif;line-height:1.5;letter-spacing:0}
:lang(ar) .hr-name{line-height:1.55;padding-block:.08em}
:lang(ur) :is(.hr-name,.hm-h2,.hm-pl h2,.hm-quran h2,.hm-three b,.hm-promise b,.hm-big,.hm-door b,h1,h2,h3){font-family:'Noto Nastaliq Urdu',serif;line-height:1.9;letter-spacing:0}
:lang(ur) .hr-name{line-height:2;padding-block:.1em}
`;
