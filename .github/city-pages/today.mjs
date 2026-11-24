// Search S02: today's times as plain text in the city page HTML (answer sentence, FAQ entry).
// Strings per language; the times come from the same month data as the timetable below them.
const S = {
  en: { sep: ', ', q: (n) => `What are today's prayer times in ${n}?`, a: (n, f, m, meth, F, M) => `${F} in ${n} today is ${f}; ${M} is at ${m} (${meth}).` },
  ar: { sep: '، ', q: (n) => `ما مواقيت الصلاة اليوم في ${n}؟`, a: (n, f, m, meth, F, M) => `${F} في ${n} اليوم الساعة ${f}، و${M} الساعة ${m} (${meth}).` },
  ur: { sep: '، ', q: (n) => `آج ${n} میں نماز کے اوقات کیا ہیں؟`, a: (n, f, m, meth, F, M) => `آج ${n} میں ${F} ${f} بجے اور ${M} ${m} بجے ہے (${meth})۔` },
  id: { sep: ', ', q: (n) => `Jam berapa waktu salat hari ini di ${n}?`, a: (n, f, m, meth, F, M) => `${F} di ${n} hari ini pukul ${f}; ${M} pukul ${m} (${meth}).` },
  ms: { sep: ', ', q: (n) => `Apakah waktu solat hari ini di ${n}?`, a: (n, f, m, meth, F, M) => `${F} di ${n} hari ini ialah ${f}; ${M} pada ${m} (${meth}).` },
  fr: { sep: ', ', q: (n) => `Quels sont les horaires de prière aujourd'hui à ${n} ?`, a: (n, f, m, meth, F, M) => `${F} à ${n} aujourd'hui : ${f} ; ${M} à ${m} (${meth}).` },
  tr: { sep: ', ', q: (n) => `${n} için bugünkü namaz vakitleri nelerdir?`, a: (n, f, m, meth, F, M) => `${n} için bugün ${F} vakti ${f}, ${M} vakti ${m} (${meth}).` },
};

/** The short method name for the sentence: an acronym where there is one, no tail after a comma, no brackets. */
export function shortMethod(name) {
  const m = /^(.*?)\s*\(([^)]*)\)/.exec(name);
  const base = m ? (/^[A-Z]{3,}$|^Kemenag$/.test(m[2]) ? m[2] : m[1]) : name;
  return base.split(/[,،]/)[0].trim();
}

/**
 * @param {object} o
 * @param {(s:string)=>string} o.fmt a clock string "HH:MM" to display text in the page's language
 * @returns {{sentence:string, faq:[string,string]}}
 */
export function todayText({ L, name, method, day, prayers, fmt, dateLabel }) {
  const s = S[L] || S.en;
  const f = fmt(day.t.Fajr), m = fmt(day.t.Maghrib);
  const sentence = s.a(name, f, m, shortMethod(method), prayers.Fajr, prayers.Maghrib);
  const list = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((p) => `${prayers[p]} ${fmt(day.t[p])}`).join(s.sep);
  return { sentence, faq: [s.q(name), `${dateLabel}: ${list} (${method}).`] };
}
