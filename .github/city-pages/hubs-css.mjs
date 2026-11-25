// Styles of the Living Sky hub pages (task K04b): the prayer-times hub, the countries and country lists and the
// monthly city pages. Appended to the city page's stylesheet (city-sky.mjs), so one file serves them all.
export const HUB_CSS = `
.hb-search{display:flex;gap:8px;max-inline-size:560px;margin-block-start:6px}
.hb-search input{flex:1;min-inline-size:0;block-size:52px;padding-inline:18px;border:0;border-radius:999px;background:var(--card);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line);font:500 16px var(--sans)}
.hb-search input::placeholder{color:var(--soft)}
.hb-search button{min-block-size:52px;padding-inline:22px;border:0;border-radius:999px;background:var(--ink);color:var(--bg);font:600 15px var(--sans);cursor:pointer}
.hb-sub{max-inline-size:62ch;font-size:17px;color:var(--sky-soft)}
.hb-near{flex:0 1 400px}
.hb-near .ct-nn{color:inherit;text-decoration:none;font-size:40px}
.hb-near .ct-nn:hover{text-decoration:underline}
.hb-times{position:relative;list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.hb-times li{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:14px;background:rgba(246,242,233,.08)}
.hb-times li.is-next{background:rgba(217,180,106,.22);box-shadow:inset 0 0 0 1px #D9B46A}
.hb-times span{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#C9D4CC;font-weight:600}
.hb-times b{font-size:17px;font-weight:500;white-space:nowrap}
.hb-go{position:relative;margin-block-start:8px;color:#D9B46A;font-weight:600;text-decoration:none;min-block-size:44px;display:inline-flex;align-items:center}
.hb-go:hover{text-decoration:underline}
.hb-note{position:relative;font-size:12px;color:#9FB5A8}
.hb-sec{display:flex;flex-direction:column;gap:16px}
.hb-sec>h2{font-size:34px;line-height:1.2}
.hb-sec>p{color:var(--soft);max-inline-size:70ch}
.hb-chips{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.hb-chips a{display:flex;flex-direction:column;justify-content:center;gap:2px;min-block-size:64px;padding:12px 16px;border-radius:16px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);color:var(--ink);text-decoration:none;transition:box-shadow .15s}
.hb-chips a:hover{box-shadow:inset 0 0 0 1px var(--gold)}
.hb-chips b{font-weight:500;font-size:16px}
.hb-chips span{font-size:13px;color:var(--soft)}
.hb-country{display:flex;flex-direction:column;gap:12px;padding-block:22px;border-block-start:1px solid var(--line)}
.hb-country h2{font-size:26px;display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px}
.hb-country h2 a{color:inherit}
.hb-country h2 small{font-family:var(--sans);font-size:13px;color:var(--soft);font-weight:400}
.hb-city-list{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.hb-city-list a{display:inline-flex;align-items:center;min-block-size:44px;padding-inline:14px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--line);background:var(--card);color:var(--ink);text-decoration:none}
.hb-city-list a:hover{box-shadow:inset 0 0 0 1px var(--gold)}
.hb-none{color:var(--soft)}
.hb-none[hidden]{display:none}
.hb-how{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.hb-how .ct-card p{font-size:15px;color:var(--soft)}
.hb-how .ct-card h3{font-family:var(--serif);font-weight:400;font-size:22px}
.hb-links{display:flex;flex-wrap:wrap;gap:10px}
.hb-links a{display:inline-flex;align-items:center;min-block-size:48px;padding-inline:18px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--ink);color:var(--ink);font-weight:600;text-decoration:none}
.ct-tw tbody tr.is-ram th[scope=row]{box-shadow:inset 3px 0 var(--gold)}
[dir=rtl] .ct-tw tbody tr.is-ram th[scope=row]{box-shadow:inset -3px 0 var(--gold)}
.ct-tw td{white-space:nowrap}
.ct-sub{max-inline-size:70ch;font-size:16px;color:var(--sky-soft)}
.ct-btns.top{margin-block-start:6px}
.ct-btns .ct-btn{color:var(--bg)}.ct-btns .ct-btn.alt{color:var(--ink)}
.ct-foot{padding-block:0 40px;display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--soft)}.ct-foot a{color:inherit;text-decoration:underline;text-underline-offset:3px;text-decoration-color:var(--line)}
.ct-printnote{display:none}
@media print{.ct-foot{display:none}.ct-printnote{display:block;font-size:12px}.hb-search{display:none}}
@media (max-width:720px){
  .hb-sec>h2{font-size:28px}
  .hb-chips{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
  .hb-near .ct-nn{font-size:34px}
}
`;
