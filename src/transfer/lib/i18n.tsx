import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  readStoredLang,
  subscribeStoredLang,
  writeStoredLang,
} from "../../lib/lang";

export type Lang = "en" | "fa";

type Dict = Record<string, { en: string; fa: string }>;

export const t: Dict = {
  // Nav
  navProduct: { en: "Product", fa: "محصول" },
  navHow: { en: "How It Works", fa: "نحوه کار" },
  navStudents: { en: "For Students", fa: "برای دانشجوها" },
  navAgents: { en: "For Agents", fa: "برای ایجنت‌ها" },
  navUniversities: { en: "For Universities", fa: "برای دانشگاه‌ها" },
  navDemo: { en: "Demo Report", fa: "نمونه گزارش" },
  navFaq: { en: "FAQ", fa: "سوالات" },
  ctaRequestDemo: { en: "Request Demo", fa: "درخواست دمو" },
  ctaCheckEligibility: { en: "Check Eligibility", fa: "بررسی شانس انتقالی" },

  // Hero
  heroTitle: { en: "From Transcript to Transfer Decision.", fa: "از ریزنمرات تا تصمیم انتقالی." },
  heroSub: {
    en: "ACCA Transfer AI analyzes student transcripts, matches completed courses with target university requirements, predicts transfer eligibility, and helps students, agents, and universities make faster academic transfer decisions.",
    fa: "ACCA Transfer AI ریزنمرات و مدارک دانشجو را تحلیل می‌کند، درس‌های پاس‌شده را با قوانین دانشگاه مقصد تطبیق می‌دهد، شانس انتقالی را تخمین می‌زند و مسیر تصمیم‌گیری را برای دانشجو، ایجنت و دانشگاه ساده‌تر می‌کند.",
  },
  heroCta1: { en: "Check My Transfer Eligibility", fa: "بررسی شانس انتقالی" },
  heroCta2: { en: "View AI Report Demo", fa: "مشاهده نمونه گزارش AI" },
  heroTrust: { en: "AI-assisted. Human-reviewed. University-approved.", fa: "تحلیل با هوش مصنوعی، بررسی توسط انسان، تصمیم نهایی با دانشگاه." },

  // Problem
  problemTitle: { en: "University transfer is harder than it should be.", fa: "انتقالی دانشگاه سخت‌تر از چیزی است که باید باشد." },
  problemText: {
    en: "Students hesitate because the process is unclear. Agents lose time checking documents manually. Universities receive incomplete applications. Course equivalency decisions take too long.",
    fa: "دانشجوها به‌خاطر ابهام مسیر اقدام نمی‌کنند. ایجنت‌ها زمان زیادی را صرف بررسی دستی مدارک می‌کنند. دانشگاه‌ها پرونده‌های ناقص دریافت می‌کنند و تصمیم‌گیری درباره معادل‌سازی دروس زمان‌بر می‌شود.",
  },

  // Process
  processTitle: { en: "One intelligent workflow for academic transfer.", fa: "یک گردش‌کار هوشمند برای انتقالی دانشگاه." },

  // Roles
  rolesTitle: { en: "Built for every side of the transfer process.", fa: "ساخته شده برای همه طرف‌های فرایند انتقالی." },

  // Course matching
  matchTitle: { en: "AI-powered course equivalency analysis.", fa: "تحلیل معادل‌سازی دروس با هوش مصنوعی." },
  matchText: {
    en: "Our AI compares completed courses with target university curriculum using transcript data, credits, syllabus information, course descriptions, GPA rules, and university-specific requirements.",
    fa: "هوش مصنوعی ما درس‌های گذرانده شده را با برنامه درسی دانشگاه مقصد بر اساس داده‌های ریزنمرات، واحدها، سرفصل‌ها، توضیحات دروس و قوانین دانشگاه مقایسه می‌کند.",
  },
  matchDisclaimer: {
    en: "AI recommendations are estimates. Final academic decisions are always made by the university.",
    fa: "پیشنهادهای AI تخمینی هستند و تصمیم نهایی همیشه توسط دانشگاه مقصد گرفته می‌شود.",
  },

  // Universities
  uniTitle: { en: "Find the right transfer destination before you apply.", fa: "قبل از اقدام، مقصد درست انتقالی را پیدا کن." },

  // Trust
  trustTitle: { en: "AI-assisted. Human-reviewed. University-approved.", fa: "تحلیل با AI، بررسی توسط انسان، تصمیم نهایی با دانشگاه." },
  trustText: {
    en: "ACCA Transfer AI does not replace official university decisions. It helps students, agents, and institutions understand eligibility, document gaps, and course equivalency possibilities before the final review.",
    fa: "ACCA Transfer AI جایگزین تصمیم رسمی دانشگاه نیست. این پلتفرم به دانشجو، ایجنت و دانشگاه کمک می‌کند تا قبل از بررسی نهایی، شرایط انتقالی، نواقص مدارک و امکان معادل‌سازی دروس را بهتر درک کنند.",
  },

  // Pricing
  priceTitle: { en: "Start with an AI transfer assessment.", fa: "با یک ارزیابی انتقالی هوشمند شروع کن." },

  // FAQ
  faqTitle: { en: "Frequently asked questions.", fa: "سوالات پرتکرار." },

  // Final
  finalTitle: { en: "Turn academic uncertainty into a clear transfer path.", fa: "ابهام انتقالی را به یک مسیر روشن تبدیل کن." },
  finalSub: {
    en: "Upload a transcript, analyze eligibility, match courses, and discover the best transfer options with ACCA Transfer AI.",
    fa: "ریزنمراتت را آپلود کن، شانس انتقالی را بررسی کن، درس‌ها را تطبیق بده و بهترین گزینه‌های دانشگاهی را پیدا کن.",
  },

  // Disclaimer
  disclaimer: {
    en: "ACCA Transfer AI provides AI-assisted academic transfer analysis based on available documents and university rules. Results are estimates and do not guarantee admission, course recognition, or year placement. Final decisions are made by the receiving university.",
    fa: "ACCA Transfer AI بر اساس مدارک موجود و قوانین دانشگاهی، تحلیل انتقالی مبتنی بر هوش مصنوعی ارائه می‌دهد. نتایج تخمینی هستند و به معنای تضمین پذیرش، معادل‌سازی دروس یا تعیین سال ورود نیستند. تصمیم نهایی همیشه توسط دانشگاه مقصد گرفته می‌شود.",
  },
};

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: (k: keyof typeof t) => string;
  dir: "ltr" | "rtl";
}

const I18nCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, tr: (k) => t[k]?.en ?? String(k), dir: "ltr" });

const transferLangs: Lang[] = ["en", "fa"];
const normalizeTransferLang = (value: unknown): Lang => (value === "en" ? "en" : "fa");

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (
    normalizeTransferLang(readStoredLang({ fallback: "fa", allowed: transferLangs }))
  ));

  const setLang = useCallback((nextLang: Lang) => {
    const normalized = normalizeTransferLang(nextLang);
    setLangState(normalized);
    writeStoredLang(normalized, { allowed: transferLangs });
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => subscribeStoredLang((nextLang) => {
    const normalized = normalizeTransferLang(nextLang);
    setLangState((current) => (current === normalized ? current : normalized));
  }, { allowed: transferLangs }), []);

  const dir = lang === "fa" ? "rtl" : "ltr";
  const tr = (k: keyof typeof t) => t[k]?.[lang] ?? t[k]?.en ?? String(k);

  return <I18nCtx.Provider value={{ lang, setLang, tr, dir }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
