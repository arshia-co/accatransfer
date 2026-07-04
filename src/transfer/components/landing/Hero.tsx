import { motion, useMotionValue, animate } from "framer-motion";
import {
  ArrowRight, FileText, GraduationCap, Sparkles, CheckCircle2,
  AlertTriangle, TrendingUp, ScanLine, Network, ShieldCheck,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useUI } from "@/lib/ui-context";
import { trackWhatsAppClick } from "@/lib/analytics";

export function Hero() {
  const { tr, lang } = useI18n();
  const { openModal } = useUI();
  const ref = useRef<HTMLDivElement>(null);

  // Animated counter for hero score — written straight into the DOM node so
  // the whole Hero doesn't re-render ~130 times during the 2.2s count-up.
  const score = useMotionValue(0);
  const scoreRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const u = score.on("change", (v) => {
      if (scoreRef.current) scoreRef.current.textContent = Math.round(v).toString();
    });
    const c = animate(score, 87, { duration: 2.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] });
    return () => { u(); c.stop(); };
  }, [score]);

  return (
    <section ref={ref} className="relative pt-28 sm:pt-32 pb-8 sm:pb-12 overflow-hidden">
      {/* Cinematic ACCA brand background — deep navy, warm gold light */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 vignette" />
      {/* Static: scroll-transforming a 1200px blurred layer re-composited a
          huge texture every frame and made the cursor stutter while scrolling. */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full bg-[radial-gradient(circle_at_center,rgba(18,63,88,0.55),transparent_60%)] blur-3xl" />
      <div className="absolute top-1/3 right-0 w-[600px] h-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(200,150,95,0.22),transparent_70%)] blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(214,164,107,0.14),transparent_70%)] blur-3xl" />
      {/* Plain opacity: mix-blend forced the whole hero into an offscreen
          buffer that re-composited whenever the cursor moved over it. */}
      <div className="absolute inset-0 bg-noise opacity-[0.16] pointer-events-none" />

      {/* ACCA geometric corner accents */}
      <div className="pointer-events-none absolute top-24 left-0 w-40 h-40 bg-acca-pattern-strong opacity-60 [mask-image:linear-gradient(135deg,black,transparent)]" />
      <div className="pointer-events-none absolute bottom-10 right-0 w-52 h-52 bg-acca-pattern-strong opacity-50 [mask-image:linear-gradient(-45deg,black,transparent)]" />

      {/* Warm gold light sweep */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.4 }}
          className="absolute left-1/2 -translate-x-1/2 -top-32 w-[140%] h-[280px] rounded-[100%] bg-[conic-gradient(from_180deg_at_50%_50%,transparent_0deg,rgba(18,63,88,0.5)_120deg,rgba(200,150,95,0.32)_180deg,rgba(214,164,107,0.22)_240deg,transparent_360deg)] blur-3xl"
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* COPY */}
          <div className="lg:col-span-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--gold)]/30 bg-white/70 backdrop-blur px-3 py-1.5 text-[11px] text-[color:var(--navy)] shadow-soft"
            >
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-[color:var(--gold)] animate-ping opacity-75" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-[color:var(--gold)]" />
              </span>
              {lang === "fa" ? "نسل جدید پلتفرم انتقالی دانشگاهی" : "The next generation academic transfer OS"}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1 }}
              className={
                lang === "fa"
                  ? "mt-6 fa-hero-heading text-[40px] sm:text-[58px] lg:text-[78px] leading-[1.2]"
                  : "mt-6 font-display font-bold text-[38px] sm:text-[54px] lg:text-[72px] leading-[1.04] tracking-tight text-hero-heading"
              }
            >
              {tr("heroTitle")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="mt-6 text-[15px] sm:text-[16px] text-[color:var(--navy)]/85 max-w-xl leading-relaxed"
            >
              {tr("heroSub")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.35 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <button
                type="button"
                onClick={() => openModal("assessment")}
                className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#D6A46B] to-[#C8965F] text-[#0B2F42] text-sm font-medium px-6 py-3.5 ring-1 ring-white/20 shadow-[0_15px_60px_-10px_rgba(185,130,69,0.65)] hover:brightness-110 transition overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <Sparkles className="w-4 h-4 relative" />
                <span className="relative">{tr("heroCta1")}</span>
                <ArrowRight className="w-4 h-4 relative group-hover:translate-x-0.5 transition rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => openModal("report")}
                className="inline-flex items-center gap-2 rounded-full glass text-foreground text-sm px-5 py-3 hover:bg-white/[0.08] transition"
              >
                <FileText className="w-4 h-4 text-cyan" />
                {tr("heroCta2")}
              </button>
              <a
                href="https://wa.me/905354585440"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick("hero")}
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-medium px-5 py-3 shadow-[0_10px_30px_-8px_rgba(37,211,102,0.55)] ring-1 ring-white/20 transition"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                {lang === "fa" ? "مشاوره واتساپ" : "WhatsApp consult"}
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-9 grid grid-cols-3 max-w-md gap-3"
            >
              {[
                { icon: ScanLine, en: "Transcript OCR", fa: "خواندن ریزنمرات" },
                { icon: Network, en: "Course Matching", fa: "تطبیق دروس" },
                { icon: ShieldCheck, en: "Human Review", fa: "بررسی انسانی" },
              ].map((p, i) => (
                <div key={i} className="glass rounded-xl px-3 py-2.5">
                  <p.icon className="w-3.5 h-3.5 text-cyan" />
                  <div className="mt-1.5 text-[10.5px] text-foreground/80 leading-tight">{lang === "fa" ? p.fa : p.en}</div>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-5 flex items-center gap-2 text-[12px] text-muted-foreground"
            >
              <span className="inline-flex w-1.5 h-1.5 rounded-full bg-gold" />
              {tr("heroTrust")}
            </motion.div>
          </div>

          {/* CINEMATIC STAGE */}
          <div className="lg:col-span-6 relative h-[360px] sm:h-[440px] lg:h-[620px] ltr-stage" dir="ltr">
            {/* Static container: the stage holds several glass cards, and a
                scroll-linked transform forced their backdrops to re-capture
                every scrolled frame. */}
            <div className="absolute inset-0">
              {/* Connecting energy lines — desktop only, BEHIND core */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block" viewBox="0 0 500 600" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="lineg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#C8965F" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#123F58" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="lineg2" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D6A46B" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#1A4D68" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[
                  { d: "M 70 90 C 170 130, 200 240, 250 300", g: "lineg", delay: 0 },
                  { d: "M 70 320 C 170 290, 200 290, 250 300", g: "lineg", delay: 0.3 },
                  { d: "M 430 80 C 320 160, 300 240, 250 300", g: "lineg2", delay: 0.5 },
                  { d: "M 430 480 C 320 400, 300 340, 250 300", g: "lineg2", delay: 0.7 },
                  { d: "M 70 540 C 170 470, 200 360, 250 300", g: "lineg", delay: 0.9 },
                ].map((p, i) => (
                  <g key={i}>
                    {/* CSS-driven draw loop — framer animated strokeDashoffset
                        from JS on every frame for all five paths. */}
                    <path
                      d={p.d}
                      stroke={`url(#${p.g})`}
                      strokeWidth="1"
                      fill="none"
                      className="ta-dash-line"
                      style={{ animationDelay: `${0.8 + p.delay}s` }}
                    />
                  </g>
                ))}
              </svg>

              {/* AI core */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
              >
                <div className="relative w-[230px] h-[230px] sm:w-[260px] sm:h-[260px]">
                  <div className="absolute inset-0 rounded-full border border-cyan/20 spin-slow" />
                  <div className="absolute inset-4 rounded-full border border-gold/15" style={{ animation: "spin-slow 50s linear infinite reverse" }} />
                  <div className="absolute inset-8 rounded-full border border-white/5" />
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(200,150,95,0.35),transparent_70%)] blur-2xl" />
                  {/* Orbit dots on compositor-driven CSS rotation — framer ran
                      four infinite JS rotate loops writing styles every frame. */}
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2"
                    >
                      <div
                        className="w-full h-full"
                        style={{ animation: `ta-spin-slow ${18 + i * 4}s linear infinite` }}
                      >
                        <span
                          className="absolute w-1.5 h-1.5 rounded-full bg-cyan glow-cyan"
                          style={{ top: `${50 - 50 * Math.cos(i)}%`, left: "100%", transform: "translate(-50%,-50%)" }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="absolute inset-12 sm:inset-14 glass-strong rounded-full flex flex-col items-center justify-center ring-1 ring-cyan/20">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">AI Engine</div>
                    <div className="mt-1.5 font-display text-[48px] sm:text-[56px] leading-none text-gradient">
                      <span ref={scoreRef}>0</span><span className="text-foreground/50 text-2xl">%</span>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">estimated match</div>
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-success">
                      <span className="w-1 h-1 rounded-full bg-success animate-pulse" />
                      Analyzing 18 courses
                    </div>
                  </div>
                  <div className="absolute inset-12 sm:inset-14 rounded-full overflow-hidden pointer-events-none ta-scan-line">
                    <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan to-transparent" style={{ top: "50%", boxShadow: "0 0 12px rgba(200,150,95,0.8)" }} />
                  </div>
                </div>
              </motion.div>

              {/* Floating cards — DESKTOP ONLY (cause overlap & jank on mobile) */}
              <motion.div
                initial={{ opacity: 0, x: -30, rotate: -8 }}
                animate={{ opacity: 1, x: 0, rotate: -5 }}
                transition={{ duration: 1, delay: 0.3 }}
                className="hidden lg:block absolute top-2 left-0 w-[260px] glass-strong rounded-2xl p-4 shadow-cinema float-slow z-20"
              >
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5"><FileText className="w-3 h-3 text-cyan" />Transcript_2024.pdf</div>
                  <span className="text-success">OCR ✓</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  {[
                    { c: "CALC 101", w: 92, g: "A" },
                    { c: "PHYS 110", w: 70, g: "B" },
                    { c: "PROG 120", w: 84, g: "A-" },
                    { c: "ENG 105", w: 78, g: "B+" },
                    { c: "ALG 130", w: 91, g: "A" },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="text-[9px] text-muted-foreground/80 w-12 font-mono">{r.c}</div>
                      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${r.w}%` }}
                          transition={{ duration: 1.2, delay: 0.6 + i * 0.1 }}
                          className="h-full bg-gradient-to-r from-[#D6A46B] to-[#C8965F]"
                        />
                      </div>
                      <div className="text-[9px] text-gold w-5 text-right font-mono">{r.g}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/5 grid grid-cols-3 gap-1 text-[9px]">
                  <div><span className="text-muted-foreground">GPA</span><div className="text-gold">2.91</div></div>
                  <div><span className="text-muted-foreground">ECTS</span><div className="text-foreground">72</div></div>
                  <div><span className="text-muted-foreground">SEM</span><div className="text-foreground">3</div></div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.7 }}
                className="hidden lg:block absolute top-0 right-0 w-[250px] glass-strong rounded-2xl p-4 shadow-cinema z-20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/25 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="text-[11px] text-foreground leading-tight">Istanbul Medipol</div>
                      <div className="text-[9px] text-muted-foreground">Software Engineering</div>
                    </div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/20">Strong</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                  <Mini v="87%" l="Match" t="cyan" />
                  <Mini v="12" l="Courses" />
                  <Mini v="Y2" l="Entry" t="gold" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 1 }}
                className="hidden lg:block absolute bottom-20 left-2 w-[200px] glass rounded-xl p-3 float-slow z-20"
              >
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span>Course mapped</span>
                  <span className="text-success">Likely</span>
                </div>
                <div className="mt-1.5 text-[12px] text-foreground/95">Calculus I → Math I</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: "94%" }} transition={{ duration: 1.4, delay: 1.2 }} className="h-full bg-gradient-to-r from-[#D6A46B] to-[#C8965F]" />
                  </div>
                  <span className="text-[10px] text-cyan font-mono">94%</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.9 }}
                className="hidden lg:block absolute bottom-0 right-0 w-[290px] glass-strong rounded-2xl p-4 shadow-cinema ring-glow z-20"
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Transfer Report</span>
                  <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Eligible</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <Row icon={<TrendingUp className="w-3.5 h-3.5 text-cyan" />} label="Estimated match" value="87%" />
                  <Row icon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />} label="Recognized" value="12 / 18" />
                  <Row icon={<AlertTriangle className="w-3.5 h-3.5 text-warning" />} label="Missing docs" value="2" />
                </div>
                <div className="mt-3 pt-2.5 border-t border-white/5 text-[10px] text-muted-foreground">
                  Recommended <span className="text-foreground">Year 2 entry</span> · Istanbul Medipol
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* University logos — infinite marquee with real brand marks */}
        <div className="mt-12 sm:mt-16 relative">
          <div className="text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-5 keep-tracking">
            {lang === "fa" ? "اعتماد دانشگاه‌ها و شرکای منتخب" : "Trusted by leading universities & partners"}
          </div>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]" dir="ltr">
            <div className="flex gap-10 sm:gap-14 items-center w-max animate-[acca-marquee_45s_linear_infinite]">
              {[...UNI_LOGOS, ...UNI_LOGOS, ...UNI_LOGOS].map((u, i) => (
                <div key={i} className="flex items-center justify-center shrink-0 h-10 sm:h-12">
                  <img
                    src={u.src}
                    alt={u.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="max-h-10 sm:max-h-12 w-auto object-contain opacity-80 hover:opacity-100 transition"
                  />
                </div>
              ))}
            </div>
          </div>
          <style>{`@keyframes acca-marquee { from { transform: translateX(0); } to { transform: translateX(-33.3333%); } }`}</style>
        </div>
      </div>
    </section>
  );
}

// Real ACCA-partner university logos hosted on Supabase storage (icons bucket).
const S = "https://qysluhfrjpcguhneqsuz.supabase.co/storage/v1/object/public/icons/";
const UNI_LOGOS: { name: string; src: string }[] = [
  { name: "Istanbul Medipol University", src: S + "Medipol.png" },
  { name: "Istanbul Gelisim University", src: S + "Gelisim.png" },
  { name: "Istanbul Atlas University", src: S + "atlas.svg" },
  { name: "Acibadem University", src: S + "acibadem.svg" },
  { name: "Biruni University", src: S + "biruni-universitesi-seeklogo.svg" },
  { name: "Yeditepe University", src: S + "yeditepe-universitesi-seeklogo.svg" },
  { name: "Istanbul Kultur University", src: S + "istanbul-kultur-universitesi-seeklogo.svg" },
  { name: "Istinye University", src: S + "istinye-universitesi-seeklogo.svg" },
  { name: "Isik University", src: S + "isik-universitesi-logo-png_seeklogo-73715.png" },
  { name: "Beykoz University", src: S + "beykoz-universitesi-seeklogo.png" },
  { name: "Kent University", src: S + "Kent.png" },
  { name: "Gedik University", src: S + "Gedik.png" },
  { name: "Okan University", src: S + "okan.png" },
  { name: "Nisantasi University", src: S + "Nisantasi.png" },
  { name: "Fenerbahce University", src: S + "fenerbahce.svg" },
  { name: "Yeni Yuzyil University", src: S + "Yeniyuzil.png" },
  { name: "Esenyurt University", src: S + "essenyurt.png" },
];

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">{icon}{label}</div>
      <div className="text-[12px] text-foreground font-medium">{value}</div>
    </div>
  );
}

function Mini({ v, l, t }: { v: string; l: string; t?: "cyan" | "gold" }) {
  const c = t === "cyan" ? "text-cyan" : t === "gold" ? "text-gold" : "text-foreground";
  return (
    <div className="rounded-lg bg-white/5 py-1.5">
      <div className={`text-[12px] font-medium ${c}`}>{v}</div>
      <div className="text-[8.5px] text-muted-foreground uppercase tracking-wider">{l}</div>
    </div>
  );
}
