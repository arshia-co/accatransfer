import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useUI } from "@/lib/ui-context";
import {
  HelpCircle, FileSearch, FileX2, Layers3, Clock, Workflow,
  UploadCloud, Brain, GitMerge, FileCheck2,
  GraduationCap, Building2, Users, ShieldCheck, Sparkles,
  CheckCircle2, AlertTriangle, Download, Send, ChevronRight,
} from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7 },
};

export function SectionHeading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="max-w-3xl">
      {eyebrow && (
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="w-6 h-px bg-gold" /> {eyebrow}
        </div>
      )}
      <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight tracking-tight">
        {title}
      </h2>
      {sub && <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">{sub}</p>}
    </div>
  );
}

/* PROBLEM */
export function ProblemSection() {
  const { tr, lang } = useI18n();
  const items = [
    { icon: HelpCircle, en: "Unclear eligibility", fa: "ابهام در شرایط انتقالی" },
    { icon: FileSearch, en: "Manual transcript review", fa: "بررسی دستی ریزنمرات" },
    { icon: FileX2, en: "Missing documents", fa: "نقص مدارک" },
    { icon: Layers3, en: "Complex course equivalency", fa: "معادل‌سازی پیچیده دروس" },
    { icon: Clock, en: "Slow university decisions", fa: "تصمیم‌گیری کند دانشگاه‌ها" },
    { icon: Workflow, en: "No centralized workflow", fa: "نبود گردش‌کار یکپارچه" },
  ];
  return (
    <section id="problem" className="relative py-28 px-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp}>
          <SectionHeading eyebrow={lang === "fa" ? "مسئله" : "The Problem"} title={tr("problemTitle")} sub={tr("problemText")} />
        </motion.div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="group glass rounded-2xl p-5 hover:bg-white/[0.05] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-transparent border border-white/10 flex items-center justify-center group-hover:glow-cyan transition-all">
                <it.icon className="w-4 h-4 text-cyan" />
              </div>
              <div className="mt-4 text-[15px] text-foreground">{lang === "fa" ? it.fa : it.en}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* PROCESS */
export function ProcessSection() {
  const { tr, lang } = useI18n();
  const steps = [
    { icon: UploadCloud, en: "Upload Documents", fa: "آپلود مدارک", de: "Student uploads transcript, passport, student certificate, syllabus, and supporting files.", df: "دانشجو ریزنمرات، پاسپورت، گواهی اشتغال به تحصیل، سرفصل دروس و سایر مدارک را آپلود می‌کند." },
    { icon: Brain, en: "AI Extracts Academic Data", fa: "استخراج اطلاعات تحصیلی با AI", de: "Reads GPA, credits, course names, grades, semesters, and document completeness.", df: "هوش مصنوعی معدل، واحدها، نام دروس، نمرات و کامل بودن مدارک را می‌خواند." },
    { icon: GitMerge, en: "AI Matches Courses & Rules", fa: "تطبیق دروس و قوانین دانشگاه مقصد", de: "Compares completed courses with target curriculum, ECTS, GPA rules, and transfer requirements.", df: "دروس گذرانده با برنامه دانشگاه مقصد، ECTS و قوانین انتقالی تطبیق داده می‌شود." },
    { icon: FileCheck2, en: "Transfer Report Generated", fa: "تولید گزارش انتقالی", de: "Generates an estimated transfer probability, recognized courses, missing documents, and next steps.", df: "گزارش شامل احتمال انتقالی، دروس قابل پذیرش، مدارک ناقص و مراحل بعدی تولید می‌شود." },
  ];

  return (
    <section id="how" className="relative py-28 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp}>
          <SectionHeading eyebrow={lang === "fa" ? "گردش‌کار" : "Workflow"} title={tr("processTitle")} />
        </motion.div>

        <div className="mt-16 relative">
          <div className="hidden lg:block absolute top-9 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/40 to-transparent" />
          <div className="grid lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="relative"
              >
                <div className="relative z-10 mx-auto w-[72px] h-[72px] rounded-2xl glass-strong flex items-center justify-center mb-5 ring-glow">
                  <s.icon className="w-6 h-6 text-cyan" />
                  <span className="absolute -top-2 -right-2 text-[10px] font-mono text-gold bg-background border border-gold/30 rounded-full w-6 h-6 flex items-center justify-center">
                    0{i + 1}
                  </span>
                </div>
                <div className="glass rounded-2xl p-5 h-full">
                  <div className="font-display text-lg text-foreground">{lang === "fa" ? s.fa : s.en}</div>
                  <div className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{lang === "fa" ? s.df : s.de}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* DASHBOARD */
export function DashboardPreview() {
  const { lang } = useI18n();
  const courses = [
    { s: "Calculus I", t: "Mathematics I", e: 6, m: 94, st: "Likely Recognized", c: "success" as const },
    { s: "Physics I", t: "General Physics", e: 5, m: 82, st: "Needs Review", c: "warning" as const },
    { s: "Programming I", t: "Intro to Programming", e: 6, m: 96, st: "Likely Recognized", c: "success" as const },
    { s: "Linear Algebra", t: "Linear Algebra", e: 5, m: 91, st: "Likely Recognized", c: "success" as const },
  ];

  return (
    <section id="product" className="relative py-28 px-6">
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(18,63,88,0.12),transparent_70%)] blur-3xl" />
      <div className="mx-auto max-w-7xl relative">
        <motion.div {...fadeUp}>
          <SectionHeading
            eyebrow={lang === "fa" ? "پیش‌نمایش محصول" : "Product Preview"}
            title={lang === "fa" ? "داشبورد گزارش انتقالی" : "The transfer report dashboard."}
            sub={lang === "fa"
              ? "یک نمای واقعی از فضای کاری دانشجو، ایجنت و دانشگاه با داده‌های تحلیل‌شده توسط AI."
              : "A real glimpse into the workspace shared by students, agents, and universities with AI-analyzed data."}
          />
        </motion.div>

        {/* Mobile preview — phone frame mirrors the desktop dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
          className="mt-10 lg:hidden flex justify-center"
        >
          <div className="relative w-[280px] rounded-[2.2rem] p-2 bg-gradient-to-b from-white/10 to-white/[0.03] border border-white/10 shadow-cinema">
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-24 h-5 bg-black/70 rounded-b-2xl z-10" />
            <div className="rounded-[1.8rem] overflow-hidden theme-dark bg-[#0B1020] border border-white/5">
              <div className="px-4 pt-7 pb-3 border-b border-white/5 bg-white/[0.02]">
                <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Application</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C8965F] to-[#D6A46B] flex items-center justify-center text-xs font-medium text-[#0B2F42]">DA</div>
                  <div>
                    <div className="text-[13px] text-foreground">Deniz A.</div>
                    <div className="text-[10px] text-muted-foreground font-mono">#ACC-2841 · 68%</div>
                  </div>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-cyan/20 bg-cyan/[0.04] p-3">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Match</div>
                  <div className="font-display text-2xl text-cyan">87%</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Entry</div>
                  <div className="font-display text-base text-gold mt-1">Year 2</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">GPA</div>
                  <div className="font-display text-base text-foreground mt-1">2.91</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Credits</div>
                  <div className="font-display text-base text-foreground mt-1">72 ECTS</div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[11px] text-foreground mb-2 flex items-center gap-1.5"><span className="w-1 h-3 rounded-full bg-cyan" />Course matches</div>
                  {courses.slice(0, 3).map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-t border-white/5 first:border-0 text-[11px]">
                      <span className="text-foreground/90 truncate max-w-[110px]">{c.s}</span>
                      <span className="text-cyan font-mono">{c.m}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9 }}
          className="mt-12 hidden lg:block glass-strong rounded-3xl p-2 sm:p-3 shadow-cinema ring-1 ring-white/10"
        >

          <div className="theme-dark rounded-2xl bg-[#0B1020] border border-white/5 overflow-hidden text-[color:var(--foreground)]">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
                </div>
                <div className="ml-3 text-[11px] text-muted-foreground font-mono">acca.ai / applications / deniz-a</div>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[10px] px-2 py-1 rounded-full bg-success/10 text-success border border-success/20 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
                </span>
                <button className="text-[11px] px-3 py-1.5 rounded-lg glass text-foreground/80 hover:text-foreground inline-flex items-center gap-1.5">
                  <Download className="w-3 h-3" /> AI Report
                </button>
                <button className="text-[11px] px-3 py-1.5 rounded-lg bg-gradient-to-b from-[#D6A46B] to-[#C8965F] text-[#0B2F42] inline-flex items-center gap-1.5 ring-1 ring-white/15">
                  <Send className="w-3 h-3" /> Submit
                </button>
              </div>
            </div>

            {/* Application status pipeline */}
            <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-primary/[0.04] via-transparent to-transparent">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Application Status</div>
                <div className="text-[10px] text-muted-foreground">68% complete · ETA 2 days</div>
              </div>
              <div className="relative">
                <div className="absolute top-3 left-3 right-3 h-px bg-white/5" />
                <div className="absolute top-3 left-3 h-px bg-gradient-to-r from-[#D6A46B] to-[#C8965F]" style={{ width: "55%" }} />
                <div className="relative grid grid-cols-5 gap-2">
                  {[
                    { l: "Documents", fa: "مدارک", s: "done" },
                    { l: "AI Analysis", fa: "تحلیل هوش مصنوعی", s: "done" },
                    { l: "Equivalency", fa: "تطبیق دروس", s: "done" },
                    { l: "Human Review", fa: "بررسی انسانی", s: "active" },
                    { l: "University", fa: "دانشگاه", s: "pending" },
                  ].map((step) => (
                    <div key={step.l} className="flex flex-col items-center text-center">
                      <span className={`relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                        step.s === "done" ? "bg-success/20 text-success border border-success/40" :
                        step.s === "active" ? "bg-cyan/20 text-cyan border border-cyan/50" :
                        "bg-white/5 text-muted-foreground border border-white/10"
                      }`}>
                        {step.s === "done" ? <CheckCircle2 className="w-3 h-3" /> : step.s === "active" ? <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />}
                        {step.s === "active" && <span className="absolute inset-0 rounded-full bg-cyan/30 animate-ping" />}
                      </span>
                      <span className={`mt-2 text-[10px] ${step.s === "pending" ? "text-muted-foreground" : "text-foreground/85"}`}>{lang === "fa" ? step.fa : step.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-0">
              {/* Sidebar */}
              <div className="lg:col-span-3 border-r border-white/5 p-5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Student</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8965F] to-[#D6A46B] flex items-center justify-center text-sm font-medium">DA</div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-[#0B1020]" />
                  </div>
                  <div>
                    <div className="text-sm text-foreground">Deniz A.</div>
                    <div className="text-[11px] text-muted-foreground font-mono">#ACC-2841</div>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-[12px]">
                  <Field label="Current Program" value="Computer Engineering" />
                  <Field label="Current University" value="Example University" />
                  <Field label="Target Program" value="Software Engineering" />
                  <Field label="Target University" value="Istanbul Medipol" accent />
                </div>
                <div className="mt-5 pt-5 border-t border-white/5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Workspace</div>
                  {[
                    { t: "Overview", c: null },
                    { t: "Documents", c: "4/6" },
                    { t: "Equivalency", c: "12/18" },
                    { t: "Universities", c: "4" },
                    { t: "AI Report", c: null },
                    { t: "Activity", c: null },
                  ].map((tab, i) => (
                    <div key={tab.t} className={`flex items-center justify-between text-[12px] py-1.5 px-2 rounded-md ${i === 0 ? "bg-cyan/10 text-cyan border-l-2 border-cyan" : "text-muted-foreground hover:text-foreground"}`}>
                      <span>{tab.t}</span>
                      <span className="flex items-center gap-1.5">
                        {tab.c && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 font-mono">{tab.c}</span>}
                        <ChevronRight className="w-3 h-3 opacity-50" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main */}
              <div className="lg:col-span-9 p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="GPA" value="2.91" sub="/ 4.00" tone="gold" />
                  <Stat label="Credits" value="72" sub="ECTS" />
                  <Stat label="Match" value="87%" sub="estimated" tone="cyan" big />
                  <Stat label="Entry" value="Year 2" sub="recommended" />
                </div>

                <div className="mt-5 grid lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-[12px] text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 rounded-full bg-cyan" />
                        Course Equivalency
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-muted-foreground">12 / 18 likely recognized</span>
                        <div className="w-20 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#D6A46B] to-[#C8965F]" style={{ width: "67%" }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 overflow-hidden rounded-lg border border-white/5">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="bg-white/[0.03] text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="text-start font-normal px-3 py-2">Student Course</th>
                            <th className="text-start font-normal px-3 py-2">Target</th>
                            <th className="text-start font-normal px-3 py-2">ECTS</th>
                            <th className="text-start font-normal px-3 py-2">Match</th>
                            <th className="text-start font-normal px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courses.map((c, i) => (
                            <tr key={i} className="border-t border-white/5 hover:bg-white/[0.02]">
                              <td className="px-3 py-2.5 text-foreground/90">{c.s}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{c.t}</td>
                              <td className="px-3 py-2.5 text-muted-foreground font-mono">{c.e}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${c.m}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.1 }} style={{ background: "linear-gradient(90deg,#D6A46B,#C8965F)" }} className="h-full" />
                                  </div>
                                  <span className="text-cyan text-[11px] font-mono">{c.m}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${c.c === "success" ? "bg-success/10 text-success border border-success/20" : "bg-warning/10 text-warning border border-warning/20"}`}>
                                  <span className={`w-1 h-1 rounded-full ${c.c === "success" ? "bg-success" : "bg-warning"}`} />
                                  {c.st}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex items-start gap-2 text-[10.5px] text-muted-foreground">
                      <Sparkles className="w-3 h-3 text-cyan shrink-0 mt-0.5" />
                      <span>AI rationale: 4 of 4 STEM cores matched ≥ 90% with target curriculum. Physics requires syllabus.</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] text-foreground">AI Confidence</div>
                        <span className="text-[9px] text-muted-foreground">v1.0 · 18ms</span>
                      </div>
                      <ScoreRing value={87} />
                      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[9px]">
                        <div className="rounded bg-success/10 text-success py-1">High 14</div>
                        <div className="rounded bg-warning/10 text-warning py-1">Med 3</div>
                        <div className="rounded bg-destructive/10 text-destructive py-1">Low 1</div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] text-foreground">Document Checklist</div>
                        <span className="text-[10px] text-muted-foreground font-mono">4/6</span>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#D6A46B] to-[#C8965F]" style={{ width: "67%" }} />
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <DocItem name="Transcript" status="ok" />
                        <DocItem name="Passport" status="ok" />
                        <DocItem name="Student Cert." status="ok" />
                        <DocItem name="Syllabus — Physics I" status="missing" />
                        <DocItem name="English Cert." status="missing" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Field({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 ${accent ? "text-gold" : "text-foreground/90"}`}>{value}</div>
    </div>
  );
}

function Stat({ label, value, sub, tone, big }: { label: string; value: string; sub?: string; tone?: "cyan" | "gold"; big?: boolean }) {
  const color = tone === "cyan" ? "text-cyan" : tone === "gold" ? "text-gold" : "text-foreground";
  return (
    <div className={`rounded-xl border border-white/5 bg-white/[0.02] p-4 ${big ? "ring-1 ring-cyan/20" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <div className={`font-display text-2xl ${color}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const circ = 2 * Math.PI * 28;
  return (
    <div className="mt-2 flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="28" stroke="oklch(1 0 0 / 0.08)" strokeWidth="6" fill="none" />
        <motion.circle
          cx="36" cy="36" r="28" stroke="url(#ring-grad)" strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: circ - (circ * value) / 100 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          transform="rotate(-90 36 36)"
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D6A46B" />
            <stop offset="100%" stopColor="#C8965F" />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <div className="text-2xl font-display text-cyan">{value}%</div>
        <div className="text-[10px] text-muted-foreground">High confidence</div>
      </div>
    </div>
  );
}

function DocItem({ name, status }: { name: string; status: "ok" | "missing" }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-foreground/80">{name}</span>
      {status === "ok" ? (
        <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="w-3 h-3" />Verified</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle className="w-3 h-3" />Missing</span>
      )}
    </div>
  );
}

/* ROLES */
export function RolesSection() {
  const { tr, lang } = useI18n();
  const { openModal } = useUI();
  type RoleAction = { type: "modal"; key: "agentAccess" | "partnership" | "portalStudent" | "portalAgent" | "portalUniversity" | "portalAdmin" };
  const roles: Array<{
    id: string; icon: typeof GraduationCap; en: string; fa: string; ed: string; fd: string;
    features: string[]; ffa: string[]; cta: string; cf: string; action: RoleAction;
  }> = [
    {
      id: "students",
      icon: GraduationCap,
      en: "Students", fa: "دانشجوها",
      ed: "Upload your transcript, discover your transfer chances, see missing documents, and understand which universities fit your academic profile.",
      fd: "ریزنمرات را آپلود کنید، شانس انتقالی خود را ببینید، نواقص مدارک را بشناسید و دانشگاه‌های متناسب با پروفایل تحصیلی خود را پیدا کنید.",
      features: ["AI eligibility check", "Recommended universities", "Missing document detection", "Course recognition preview", "Transfer report"],
      ffa: ["بررسی شانس انتقالی با AI", "پیشنهاد دانشگاه‌ها", "تشخیص مدارک ناقص", "پیش‌نمایش معادل‌سازی دروس", "گزارش انتقالی"],
      cta: "Start as Student", cf: "ورود دانشجو",
      action: { type: "modal", key: "portalStudent" },
    },
    {
      id: "agents",
      icon: Users,
      en: "Agents", fa: "ایجنت‌ها",
      ed: "Manage multiple student applications, track progress, upload documents, and generate AI-powered transfer reports faster.",
      fd: "چندین پرونده دانشجویی را مدیریت کنید، پیشرفت را ردیابی کنید و گزارش‌های انتقالی هوشمند سریع‌تر تولید کنید.",
      features: ["Multi-student dashboard", "Application pipeline", "Document tracking", "AI summaries", "Commission-ready workflow"],
      ffa: ["داشبورد چند دانشجو", "خط لوله پرونده‌ها", "پیگیری مدارک", "خلاصه‌سازی با AI", "گردش‌کار آماده کمیسیون"],
      cta: "Agent Portal", cf: "پورتال ایجنت",
      action: { type: "modal", key: "portalAgent" },
    },
    {
      id: "universities",
      icon: Building2,
      en: "Universities", fa: "دانشگاه‌ها",
      ed: "Review standardized academic profiles, AI-generated equivalency suggestions, and structured applications before making final decisions.",
      fd: "پروفایل‌های استاندارد دانشجویی، پیشنهادهای معادل‌سازی AI و پرونده‌های ساختاریافته را قبل از تصمیم نهایی بررسی کنید.",
      features: ["University review dashboard", "Course equivalency table", "Document viewer", "AI academic summary", "Final decision control"],
      ffa: ["داشبورد بررسی دانشگاه", "جدول معادل‌سازی دروس", "نمایشگر مدارک", "خلاصه AI تحصیلی", "کنترل تصمیم نهایی"],
      cta: "University Access", cf: "دسترسی دانشگاه",
      action: { type: "modal", key: "portalUniversity" },
    },
    {
      id: "admins",
      icon: ShieldCheck,
      en: "Admins", fa: "ادمین‌ها",
      ed: "Control the entire workflow, verify AI results, manage universities, agents, documents, and final application statuses.",
      fd: "کل گردش‌کار را کنترل کنید، نتایج AI را تأیید کنید و دانشگاه‌ها، ایجنت‌ها و وضعیت‌ها را مدیریت کنید.",
      features: ["Full CRM dashboard", "Human review tools", "AI validation", "Status tracking", "Report management"],
      ffa: ["داشبورد CRM کامل", "ابزار بررسی انسانی", "اعتبارسنجی AI", "پیگیری وضعیت", "مدیریت گزارش‌ها"],
      cta: "Admin Preview", cf: "پیش‌نمایش ادمین",
      action: { type: "modal", key: "portalAdmin" },
    },
  ];

  return (
    <section id="institutions" className="relative py-28 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div {...fadeUp}>
          <SectionHeading eyebrow={lang === "fa" ? "نقش‌ها" : "User Roles"} title={tr("rolesTitle")} />
        </motion.div>
        <div className="mt-14 grid md:grid-cols-2 gap-5">
          {roles.map((r, i) => {
            const ctaContent = (
              <span className="mt-6 inline-flex items-center gap-1.5 text-[12.5px] text-cyan group-hover:gap-2.5 transition-all">
                {lang === "fa" ? r.cf : r.cta} <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </span>
            );
            return (
              <motion.div
                key={r.id}
                id={r.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: (i % 2) * 0.08 }}
                className="group relative glass-strong rounded-3xl p-7 hover:bg-white/[0.06] transition overflow-hidden"
              >
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[radial-gradient(circle,rgba(214,164,107,0.22),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center">
                      <r.icon className="w-5 h-5 text-cyan" />
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">0{i + 1}</div>
                  </div>
                  <div className="mt-5 font-display text-2xl text-foreground">{lang === "fa" ? r.fa : r.en}</div>
                  <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{lang === "fa" ? r.fd : r.ed}</p>

                  <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-[12.5px]">
                    {(lang === "fa" ? r.ffa : r.features).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-foreground/85">
                        <span className="w-1 h-1 rounded-full bg-gold" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => openModal(r.action.key)}
                    className="block text-start cursor-pointer"
                  >
                    {ctaContent}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
