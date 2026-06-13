// Sample partner universities (demo data — names are real Istanbul private
// universities ACCA EDU works with, numbers are illustrative placeholders).
export const MOCK_UNIVERSITIES = [
  {
    id: 'medipol',
    name: { fa: 'دانشگاه مدیپول استانبول', en: 'Istanbul Medipol University', tr: 'İstanbul Medipol Üniversitesi', ar: 'جامعة ميديبول إسطنبول' },
    city: 'Istanbul',
    type: 'private',
    strongIn: ['Health', 'Research'],
    languages: ['EN', 'TR'],
    tuitionFromUSD: 4500,
    scholarshipFriendly: true,
  },
  {
    id: 'aydin',
    name: { fa: 'دانشگاه آیدین استانبول', en: 'Istanbul Aydin University', tr: 'İstanbul Aydın Üniversitesi', ar: 'جامعة أيدن إسطنبول' },
    city: 'Istanbul',
    type: 'private',
    strongIn: ['Business', 'People', 'Tech'],
    languages: ['EN', 'TR'],
    tuitionFromUSD: 3000,
    scholarshipFriendly: true,
  },
  {
    id: 'gelisim',
    name: { fa: 'دانشگاه گلیشیم استانبول', en: 'Istanbul Gelisim University', tr: 'İstanbul Gelişim Üniversitesi', ar: 'جامعة جيليشيم إسطنبول' },
    city: 'Istanbul',
    type: 'private',
    strongIn: ['Health', 'Business', 'Creative'],
    languages: ['EN', 'TR'],
    tuitionFromUSD: 2500,
    scholarshipFriendly: true,
  },
  {
    id: 'bahcesehir',
    name: { fa: 'دانشگاه باهچه‌شهیر', en: 'Bahcesehir University', tr: 'Bahçeşehir Üniversitesi', ar: 'جامعة بهتشه شهير' },
    city: 'Istanbul',
    type: 'private',
    strongIn: ['Tech', 'Business', 'Creative'],
    languages: ['EN'],
    tuitionFromUSD: 7900,
    scholarshipFriendly: false,
  },
  {
    id: 'uskudar',
    name: { fa: 'دانشگاه اسکودار', en: 'Uskudar University', tr: 'Üsküdar Üniversitesi', ar: 'جامعة أسكودار' },
    city: 'Istanbul',
    type: 'private',
    strongIn: ['Health', 'Research', 'People'],
    languages: ['EN', 'TR'],
    tuitionFromUSD: 3500,
    scholarshipFriendly: true,
  },
  {
    id: 'okan',
    name: { fa: 'دانشگاه اوکان استانبول', en: 'Istanbul Okan University', tr: 'İstanbul Okan Üniversitesi', ar: 'جامعة أوكان إسطنبول' },
    city: 'Istanbul',
    type: 'private',
    strongIn: ['Health', 'Tech', 'Stability'],
    languages: ['EN', 'TR'],
    tuitionFromUSD: 3800,
    scholarshipFriendly: true,
  },
];

export function getUniversity(id) {
  return MOCK_UNIVERSITIES.find((u) => u.id === id) || null;
}
