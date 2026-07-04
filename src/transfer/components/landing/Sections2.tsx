import { motion } from "framer-motion";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useUI } from "@/lib/ui-context";
import { ACCA_CONTACT } from "@/lib/contact";
import { SectionHeading } from "./Sections";
import {
  ChevronDown, BrainCircuit, UserCheck, Building2, Lock, Activity,
  GraduationCap, Sparkles, ArrowRight, Mail, Phone, MapPin, Camera,
} from "lucide-react";
import accaLogo from "@/assets/acca-logo.png";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7 },
};

/* MATCHING */
export function MatchingSection() {
  const { tr, lang } = useI18n();
  const matches = [
    { l: "Calculus I", r: "Mathematics I", p: 94 },
    { l: "Programming I", r: "Intro to Programming", p: 96 },
    { l: "Physics I", r: "General Physics", p: 82 },
    { l: "Academic English", r: "English for Engineers", p: 88 },
    { l: "Linear Algebra", r: "Linear Algebra", p: 91 },
  ];
  return (
    <section id="universities" className="relative py-28 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="mx-auto max-w-7xl relative">
        <motion.div {...fadeUp}>
          <SectionHeading eyebrow={lang === "fa" ? "موتور تطبیق" : "Matching Engine"} title={tr("matchTitle")} sub={tr("matchText")} />
        </motion.div>

        <div className="mt-14 glass-strong rounded-3xl p-6 sm:p-10 ring-glow">
          <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Student Transcript</div>
              {matches.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-xl px-4 py-3 text-[13px] text-foreground/90"
                >
                  {m.l}
                </motion.div>
              ))}
            </div>

            <div className="hidden lg:flex flex-col items-center justify-center">
              <div className="relative w-28 h-28">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(18,63,88,0.45),transparent_60%)] blur-xl" />
                <div className="absolute inset-2 rounded-full border border-cyan/30 spin-slow" />
                <div className="absolute inset-5 glass-strong rounded-full flex flex-col items-center justify-center">
                  <Sparkles className="w-5 h-5 text-cyan" />
                  <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-1">AI</div>
                </div>
              </div>
              <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Matching</div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 lg:text-end">Target University</div>
              {matches.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.2 }}
                  className="glass rounded-xl px-4 py-3 text-[13px] flex items-center justify-between"
                >
                  <span className="text-foreground/90">{m.r}</span>
                  <span className={`text-[11px] font-medium ${m.p >= 90 ? "text-success" : m.p >= 85 ? "text-cyan" : "text-warning"}`}>{m.p}%</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-[12px] text-muted-foreground flex items-start gap-2">
            <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
            <span>{tr("matchDisclaimer")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* UNIVERSITY RECOMMENDATIONS */
export function UniversitiesSection() {
  const { tr, lang } = useI18n();
  const unis = [
    { name: "Istanbul Medipol University", match: 87, courses: 12, year: "Year 2", fit: "Strong Fit", tone: "success" as const },
    { name: "Bahçeşehir University", match: 78, courses: 10, year: "Year 1 or 2", fit: "Good Fit", tone: "cyan" as const },
    { name: "Istanbul Aydın University", match: 82, courses: 11, year: "Year 2", fit: "Good Fit", tone: "cyan" as const },
    { name: "Altınbaş University", match: 74, courses: 9, year: "Year 1", fit: "Moderate Fit", tone: "warning" as const },
  ];
  return (
    <section className="relative py-28 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp}>
          <SectionHeading eyebrow={lang === "fa" ? "پیشنهاد دانشگاه" : "University Recommendations"} title={tr("uniTitle")} />
        </motion.div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {unis.map((u, i) => (
            <motion.div
              key={u.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group glass-strong rounded-2xl p-5 hover:-translate-y-1 transition-transform shadow-cinema"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-gold" />
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  u.tone === "success" ? "bg-success/15 text-success" :
                  u.tone === "cyan" ? "bg-cyan/15 text-cyan" : "bg-warning/15 text-warning"
                }`}>{u.fit}</span>
              </div>
              <div className="mt-4 font-display text-[17px] text-foreground leading-snug">{u.name}</div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-3xl text-gradient">{u.match}%</span>
                <span className="text-[10px] text-muted-foreground">match</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${u.match}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2 }}
                  className="h-full bg-gradient-to-r from-[#D6A46B] to-[#C8965F]"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-muted-foreground">Recognized</div>
                  <div className="text-foreground">{u.courses} courses</div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-muted-foreground">Entry</div>
                  <div className="text-foreground">{u.year}</div>
                </div>
              </div>

              <UniRequirementsButton uniName={u.name} fa={lang === "fa"} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UniRequirementsButton({ uniName, fa }: { uniName: string; fa: boolean }) {
  const { openModal } = useUI();
  return (
    <button
      onClick={() => openModal("requirements", { name: uniName })}
      className="mt-5 w-full text-[12px] py-2 rounded-lg glass text-foreground/85 hover:text-foreground hover:bg-white/[0.06] transition inline-flex items-center justify-center gap-1.5"
    >
      {fa ? "مشاهده شرایط" : "View Requirements"} <ArrowRight className="w-3 h-3 rtl:rotate-180" />
    </button>
  );
}


/* TRUST */
export function TrustSection() {
  const { tr, lang } = useI18n();
  const pillars = [
    { icon: BrainCircuit, en: "Explainable AI", fa: "AI قابل توضیح", ed: "Every recommendation includes reasons, matched rules, and confidence levels.", fd: "هر پیشنهاد شامل دلایل، قوانین تطبیق‌شده و سطح اطمینان است." },
    { icon: UserCheck, en: "Human Review", fa: "بررسی انسانی", ed: "Admins can verify, correct, and approve AI-generated reports before submission.", fd: "ادمین‌ها می‌توانند گزارش‌های AI را قبل از ارسال بررسی، اصلاح و تأیید کنند." },
    { icon: Building2, en: "University Control", fa: "اختیار دانشگاه", ed: "Universities always make the final academic decision.", fd: "تصمیم نهایی همیشه با دانشگاه است." },
    { icon: Lock, en: "Secure Documents", fa: "مدارک امن", ed: "Student files are stored with role-based access and protected document workflows.", fd: "مدارک دانشجویان با دسترسی نقش‌محور و گردش‌کار حفاظت‌شده ذخیره می‌شوند." },
    { icon: Activity, en: "Audit Trail", fa: "ردیابی تغییرات", ed: "Every change, review, and decision can be tracked.", fd: "هر تغییر، بررسی و تصمیم قابل ردیابی است." },
  ];

  return (
    <section className="relative py-28 px-6">
      <div className="absolute -top-20 right-1/2 translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,oklch(0.74_0.09_80_/_0.08),transparent_70%)] blur-3xl" />
      <div className="mx-auto max-w-7xl relative">
        <motion.div {...fadeUp}>
          <SectionHeading eyebrow={lang === "fa" ? "اعتماد و حاکمیت" : "Trust & Governance"} title={tr("trustTitle")} sub={tr("trustText")} />
        </motion.div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {pillars.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-2xl p-5"
            >
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                <p.icon className="w-4 h-4 text-gold" />
              </div>
              <div className="mt-4 text-[14px] text-foreground font-medium">{lang === "fa" ? p.fa : p.en}</div>
              <div className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed">{lang === "fa" ? p.fd : p.ed}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* PRICING */
type PlanAction = { type: "modal"; key: "assessment" | "agentAccess" | "partnership" | "demo" };
export function PricingSection() {
  const { tr, lang } = useI18n();
  const { openModal } = useUI();
  const plans: Array<{ en: string; fa: string; ed: string; fd: string; cta: string; cf: string; h: boolean; action: PlanAction }> = [
    { en: "Student Assessment", fa: "ارزیابی دانشجو", ed: "For individual students who want to check transfer eligibility.", fd: "برای دانشجویانی که می‌خواهند شانس انتقالی خود را بررسی کنند.", cta: "Check Eligibility", cf: "بررسی شانس", h: false, action: { type: "modal", key: "assessment" } },
    { en: "Agent Workspace", fa: "فضای کاری ایجنت", ed: "For education agents managing multiple transfer students.", fd: "برای ایجنت‌هایی که چند دانشجو را مدیریت می‌کنند.", cta: "Request Agent Access", cf: "درخواست دسترسی ایجنت", h: true, action: { type: "modal", key: "agentAccess" } },
    { en: "University Review Portal", fa: "پورتال بررسی دانشگاه", ed: "For universities that want standardized AI-assisted application review.", fd: "برای دانشگاه‌هایی که بررسی استاندارد AI-محور می‌خواهند.", cta: "Partner With ACCA", cf: "همکاری با ACCA", h: false, action: { type: "modal", key: "partnership" } },
    { en: "Enterprise / Custom", fa: "سفارشی / سازمانی", ed: "For institutions needing custom workflows.", fd: "برای سازمان‌هایی با نیاز به گردش‌کار سفارشی.", cta: "Book a Demo", cf: "رزرو دمو", h: false, action: { type: "modal", key: "demo" } },
  ];
  return (
    <section id="pricing" className="relative py-28 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp}>
          <SectionHeading eyebrow={lang === "fa" ? "دسترسی" : "Get Access"} title={tr("priceTitle")} />
        </motion.div>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p, i) => {
            const cls = `mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl text-[13px] py-2.5 ${
              p.h ? "bg-gradient-to-b from-[#D6A46B] to-[#C8965F] text-[#0B2F42] ring-1 ring-white/15" : "glass text-foreground hover:bg-white/[0.06]"
            }`;
            const label = (
              <>
                {lang === "fa" ? p.cf : p.cta} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </>
            );
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`relative rounded-3xl p-6 flex flex-col ${p.h ? "glass-strong ring-1 ring-cyan/30 shadow-cinema" : "glass"}`}
              >
                {p.h && (
                  <div className="absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider bg-gradient-to-r from-[#C8965F] to-[#D6A46B] text-white">
                    {lang === "fa" ? "محبوب" : "Popular"}
                  </div>
                )}
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">0{i + 1}</div>
                <div className="mt-3 font-display text-xl text-foreground">{lang === "fa" ? p.fa : p.en}</div>
                <div className="mt-2 text-[13px] text-muted-foreground leading-relaxed flex-1">{lang === "fa" ? p.fd : p.ed}</div>
                <div className="mt-5 text-[11px] text-gold uppercase tracking-wider">
                  {lang === "fa" ? "به‌زودی · درخواست دسترسی" : "Coming Soon · Request Access"}
                </div>
                <button type="button" onClick={() => openModal(p.action.key)} className={cls}>{label}</button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* FAQ */
export function FaqSection() {
  const { tr, lang } = useI18n();
  const items = [
    { en: "Does the AI guarantee university acceptance?", fa: "آیا AI پذیرش دانشگاه را تضمین می‌کند؟", ea: "No. The AI provides an estimated analysis based on documents, GPA, course data, and university rules. The final decision is always made by the university.", fa_a: "خیر. AI یک تحلیل تخمینی بر اساس مدارک، معدل، اطلاعات دروس و قوانین دانشگاه ارائه می‌دهد. تصمیم نهایی همیشه با دانشگاه است." },
    { en: "What documents does a student need?", fa: "دانشجو به چه مدارکی نیاز دارد؟", ea: "Usually transcript, passport, student certificate, syllabus/course descriptions, language certificate if required, and any university-specific documents.", fa_a: "معمولاً ریزنمرات، پاسپورت، گواهی اشتغال به تحصیل، سرفصل دروس، مدرک زبان (در صورت نیاز) و مدارک خاص دانشگاه." },
    { en: "Can agents register students?", fa: "آیا ایجنت‌ها می‌توانند دانشجو ثبت کنند؟", ea: "Yes. Agents can create and manage multiple student applications.", fa_a: "بله. ایجنت‌ها می‌توانند چندین پرونده دانشجویی بسازند و مدیریت کنند." },
    { en: "Can universities review applications inside the platform?", fa: "آیا دانشگاه‌ها می‌توانند داخل پلتفرم پرونده‌ها را بررسی کنند؟", ea: "Yes. Universities can access standardized student profiles, documents, AI summaries, and course equivalency suggestions.", fa_a: "بله. دانشگاه‌ها به پروفایل استاندارد، مدارک، خلاصه AI و پیشنهادهای معادل‌سازی دسترسی دارند." },
    { en: "Does the platform support multiple languages?", fa: "آیا پلتفرم چندزبانه است؟", ea: "Yes. The interface is designed for English and Persian first, with future support for Turkish and Arabic.", fa_a: "بله. رابط کاربری ابتدا برای انگلیسی و فارسی طراحی شده و در آینده ترکی و عربی نیز اضافه می‌شود." },
    { en: "Is the AI report final?", fa: "آیا گزارش AI نهایی است؟", ea: "No. It is an advisory report designed to support faster and clearer decision-making.", fa_a: "خیر. این گزارش مشاوره‌ای است و به تصمیم‌گیری سریع‌تر و شفاف‌تر کمک می‌کند." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-28 px-6">
      <div className="mx-auto max-w-4xl">
        <motion.div {...fadeUp}>
          <SectionHeading eyebrow="FAQ" title={tr("faqTitle")} />
        </motion.div>

        <div className="mt-12 space-y-3">
          {items.map((q, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between text-start px-5 py-4 hover:bg-white/[0.03] transition"
                >
                  <span className="text-[14px] text-foreground">{lang === "fa" ? q.fa : q.en}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 text-[13px] text-muted-foreground leading-relaxed">
                    {lang === "fa" ? q.fa_a : q.ea}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* FINAL CTA */
export function FinalCTA() {
  const { tr, lang } = useI18n();
  const { openModal } = useUI();
  return (
    <section className="relative py-28 px-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-[2rem] p-10 sm:p-16 text-center glass-strong shadow-cinema ring-glow"
        >
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(18,63,88,0.3),transparent_60%)] blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-gradient leading-tight">
              {tr("finalTitle")}
            </h2>
            <p className="mt-5 text-muted-foreground max-w-2xl mx-auto leading-relaxed">{tr("finalSub")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => openModal("assessment")}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#D6A46B] to-[#C8965F] text-[#0B2F42] text-sm font-medium px-6 py-3 ring-1 ring-white/15 shadow-[0_15px_50px_-10px_rgba(185,130,69,0.6)] hover:brightness-110 transition"
              >
                <Sparkles className="w-4 h-4" /> {lang === "fa" ? "بررسی شانس انتقالی" : "Check My Transfer Eligibility"}
              </button>
              <button onClick={() => openModal("demo")} className="inline-flex items-center gap-2 rounded-full glass text-foreground text-sm px-6 py-3 hover:bg-white/[0.06] transition">
                {tr("ctaRequestDemo")}
              </button>
              <button onClick={() => openModal("report")} className="inline-flex items-center gap-2 rounded-full glass text-foreground text-sm px-6 py-3 hover:bg-white/[0.06] transition">
                {lang === "fa" ? "نمونه گزارش AI" : "View AI Report Demo"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* FOOTER */
export function Footer() {
  const { tr, lang } = useI18n();
  const { openModal, comingSoon } = useUI();
  type FooterLink = { label: string; onClick: () => void };
  const cols: { title: string; links: FooterLink[] }[] = [
    {
      title: lang === "fa" ? "محصول" : "Product",
      links: [
        { label: lang === "fa" ? "تحلیل AI" : "AI Analysis", onClick: () => openModal("report") },
        { label: lang === "fa" ? "تطبیق دروس" : "Course Matching", onClick: () => openModal("report") },
        { label: lang === "fa" ? "گزارش انتقالی" : "Transfer Report", onClick: () => openModal("report") },
        { label: lang === "fa" ? "پورتال دانشگاه" : "University Portal", onClick: () => openModal("portalUniversity") },
      ],
    },
    {
      title: lang === "fa" ? "کاربران" : "Users",
      links: [
        { label: lang === "fa" ? "دانشجو" : "Students", onClick: () => openModal("portalStudent") },
        { label: lang === "fa" ? "ایجنت" : "Agents", onClick: () => openModal("portalAgent") },
        { label: lang === "fa" ? "دانشگاه" : "Universities", onClick: () => openModal("portalUniversity") },
        { label: lang === "fa" ? "ادمین" : "Admins", onClick: () => openModal("portalAdmin") },
      ],
    },
    {
      title: lang === "fa" ? "شرکت" : "Company",
      links: [
        { label: lang === "fa" ? "درباره ACCA EDU" : "About ACCA EDU", onClick: () => comingSoon(lang === "fa" ? "صفحه درباره ما به‌زودی" : "About page coming soon") },
        { label: lang === "fa" ? "تماس" : "Contact", onClick: () => openModal("demo") },
        { label: lang === "fa" ? "حریم خصوصی" : "Privacy", onClick: () => comingSoon(lang === "fa" ? "حریم خصوصی به‌زودی" : "Privacy policy coming soon") },
        { label: lang === "fa" ? "شرایط" : "Terms", onClick: () => comingSoon(lang === "fa" ? "شرایط استفاده به‌زودی" : "Terms coming soon") },
      ],
    },
  ];
  return (
    <footer className="relative pt-32 pb-10 px-6 bg-[#0B2F42] overflow-hidden">
      {/* Soft gradient hand-off from the cream page into the navy footer —
          replaces the old hard seam; the gold divider now sits inside it. */}
      <div className="absolute -top-px inset-x-0 h-28 bg-gradient-to-b from-[#fcfaf4] via-[#fcfaf4]/45 to-transparent pointer-events-none" />
      <div className="absolute top-24 inset-x-0 divider-gold opacity-70" />
      <div className="absolute inset-x-0 top-0 h-24 bg-acca-pattern opacity-50 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-acca-pattern opacity-30 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <img
                src={accaLogo}
                alt="ACCA EDU logo"
                className="h-12 w-auto object-contain select-none brightness-110"
                draggable={false}
              />
              <div className="leading-tight">
                <div className="text-[10px] uppercase tracking-[0.32em] text-[#C8965F]">EDU · Istanbul</div>
              </div>
            </div>
            <p className="mt-5 text-[13px] text-[#B8C5CE] max-w-sm leading-relaxed">
              {lang === "fa"
                ? "پلتفرم هوشمند انتقالی دانشگاهی، طراحی شده توسط تیم مشاوران تحصیلی ACCA EDU در استانبول."
                : `An AI-powered academic transfer platform, engineered by ${ACCA_CONTACT.legalName} in Istanbul.`}
            </p>
            <div className="mt-5 space-y-2 text-[12.5px] text-[#B8C5CE]">
              <div className="flex items-center gap-2 flex-wrap"><Mail className="w-3.5 h-3.5 text-[#C8965F] shrink-0" /><a dir="ltr" href={`mailto:${ACCA_CONTACT.email}`} className="hover:text-[#F7F7F5] break-all unicode-bidi-isolate">{ACCA_CONTACT.email}</a></div>
              <div className="flex items-center gap-2 flex-wrap"><Phone className="w-3.5 h-3.5 text-[#C8965F] shrink-0" /><a dir="ltr" href={`tel:${ACCA_CONTACT.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[#F7F7F5] unicode-bidi-isolate">{ACCA_CONTACT.phone}</a></div>
              <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-[#C8965F] mt-0.5 shrink-0" /><span dir={lang === "fa" ? "rtl" : "ltr"} className="break-words">{ACCA_CONTACT.address}</span></div>
              <div className="flex items-center gap-2"><Camera className="w-3.5 h-3.5 text-[#C8965F] shrink-0" /><a dir="ltr" href={ACCA_CONTACT.instagramUrl} target="_blank" rel="noreferrer" className="hover:text-[#F7F7F5] unicode-bidi-isolate">@{ACCA_CONTACT.instagram}</a></div>
            </div>
            {/* Minimal Google Map embed — keyless, light overlay */}
            <a
              href={ACCA_CONTACT.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block rounded-xl overflow-hidden border border-[#C8965F]/25 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] max-w-sm group"
              aria-label={lang === "fa" ? "مسیر دفتر ACCA EDU روی گوگل مپ" : "ACCA EDU office on Google Maps"}
            >
              <iframe
                src={ACCA_CONTACT.mapEmbedUrl}
                title="ACCA EDU office"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block w-full h-32 grayscale-[40%] group-hover:grayscale-0 transition"
              />
            </a>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[#C8965F]">{c.title}</div>
              <div className="mt-3 w-8 h-px bg-[#C8965F]/40" />
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <button type="button" onClick={l.onClick} className="text-[13px] text-[#B8C5CE] hover:text-[#F7F7F5] transition text-start">
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-[#C8965F]/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-[11.5px] text-[#B8C5CE]">© 2026 ACCA EDU · Transfer AI. All rights reserved.</div>
          <div className="text-[11px] text-[#B8C5CE]/80 max-w-2xl leading-relaxed">{tr("disclaimer")}</div>
        </div>
      </div>
    </footer>
  );
}
