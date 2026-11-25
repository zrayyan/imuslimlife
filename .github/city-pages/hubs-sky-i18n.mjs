// Words the Living Sky hub pages add to i18n.mjs (task K04b): the list filter and the counts. English is the
// original; the others are drafts waiting for native-speaker review, like the rest of the city pages' words.
export const HUB_TEXT = {
  en: { filter: 'Search a city', none: 'No city matches that.', count: (n) => `${n} ${n === 1 ? 'city' : 'cities'}`, go: 'Search', jam: 'Masjids near you share their own jamaat times' },
  ar: { filter: 'ابحث عن مدينة', none: 'لا توجد مدينة مطابقة.', count: (n) => `${n} مدينة`, go: 'بحث', jam: 'مساجد قربك تنشر أوقات جماعتها' },
  ur: { filter: 'شہر تلاش کریں', none: 'کوئی شہر نہیں ملا۔', count: (n) => `${n} شہر`, go: 'تلاش', jam: 'آپ کے قریب مساجد اپنی جماعت کے اوقات بتاتی ہیں' },
  id: { filter: 'Cari kota', none: 'Tidak ada kota yang cocok.', count: (n) => `${n} kota`, go: 'Cari', jam: 'Masjid di dekat Anda membagikan jadwal jamaahnya' },
  ms: { filter: 'Cari bandar', none: 'Tiada bandar yang sepadan.', count: (n) => `${n} bandar`, go: 'Cari', jam: 'Masjid berhampiran anda berkongsi waktu jemaahnya' },
  fr: { filter: 'Chercher une ville', none: 'Aucune ville ne correspond.', count: (n) => `${n} ${n === 1 ? 'ville' : 'villes'}`, go: 'Chercher', jam: 'Les mosquées près de vous partagent leurs horaires de prière en commun' },
  tr: { filter: 'Şehir ara', none: 'Eşleşen şehir yok.', count: (n) => `${n} şehir`, go: 'Ara', jam: 'Yakınınızdaki camiler cemaat vakitlerini paylaşır' },
};
