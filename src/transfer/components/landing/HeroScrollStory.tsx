import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { useI18n } from "@/lib/i18n";
import frame1 from "@/assets/cinema-1.jpg";
import frame2 from "@/assets/cinema-2.jpg";
import frame3 from "@/assets/cinema-3.jpg";
import frame4 from "@/assets/cinema-4.jpg";

/**
 * One continuous storyboard — a single student moving through frames,
 * cross-faded like a video. Title only, no numbers or subtitles.
 * Persian titles avoid letter-spacing so glyphs stay connected.
 */
export function HeroScrollStory() {
  const { lang } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const frames = [
    { src: frame1, title: lang === "fa" ? "شروع مسیر" : "The journey begins" },
    { src: frame2, title: lang === "fa" ? "ریزنمرات شما، خوانده می‌شود" : "Your transcript, understood" },
    { src: frame3, title: lang === "fa" ? "دانشگاه‌های مقصد" : "Destination universities" },
    { src: frame4, title: lang === "fa" ? "آینده‌ای که می‌سازی" : "The future you build" },
  ];

  return (
    <section
      ref={ref}
      aria-label={lang === "fa" ? "تجربه سینماتیک" : "Cinematic experience"}
      className="relative"
      style={{ height: "340vh", background: "var(--background)" }}
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-[44vh] sm:h-[50vh] md:h-[56vh] max-h-[600px] overflow-hidden">
          {frames.map((f, i) => (
            <Frame
              key={i}
              index={i}
              total={frames.length}
              progress={scrollYProgress}
              src={f.src}
              title={f.title}
              lang={lang}
            />
          ))}

          {/* Top & bottom fades into site background */}
          <div
            className="absolute inset-x-0 top-0 h-[28%] z-30 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, var(--background) 0%, color-mix(in oklab, var(--background) 60%, transparent) 55%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[34%] z-30 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, var(--background) 0%, color-mix(in oklab, var(--background) 65%, transparent) 55%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-y-0 left-0 w-[10%] z-30 pointer-events-none"
            style={{ background: "linear-gradient(to right, var(--background), transparent)" }}
          />
          <div
            className="absolute inset-y-0 right-0 w-[10%] z-30 pointer-events-none"
            style={{ background: "linear-gradient(to left, var(--background), transparent)" }}
          />

          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(217,164,65,0.10), transparent 70%)",
            }}
          />
        </div>
      </div>
    </section>
  );
}

function Frame({
  index, total, progress, src, title, lang,
}: {
  index: number;
  total: number;
  progress: MotionValue<number>;
  src: string;
  title: string;
  lang: string;
}) {
  const seg = 1 / total;
  const start = index * seg;
  const end = (index + 1) * seg;

  const opacity = useTransform(
    progress,
    [start - seg * 0.6, start + seg * 0.35, end - seg * 0.35, end + seg * 0.6],
    [0, 1, 1, 0],
  );
  const scale = useTransform(progress, [start - seg, end + seg], [1.1, 1.0]);

  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      <motion.img
        src={src}
        alt={title}
        loading="lazy"
        width={1920}
        height={1080}
        style={{ scale }}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(251,250,247,0.10) 0%, rgba(251,250,247,0) 30%, rgba(251,250,247,0) 70%, rgba(247,240,227,0.18) 100%)",
        }}
      />

      <motion.div
        style={{ opacity }}
        className="absolute inset-x-0 bottom-[18%] z-20 px-6 sm:px-12 text-center"
      >
        <h3
          className={
            lang === "fa"
              ? "fa-hero-heading text-[color:var(--navy-dark)] text-[22px] sm:text-[30px] md:text-[42px] leading-[1.4] drop-shadow-[0_1px_12px_rgba(251,250,247,0.7)]"
              : "font-display font-semibold text-[color:var(--navy-dark)] text-[22px] sm:text-[30px] md:text-[44px] leading-[1.05] tracking-tight drop-shadow-[0_1px_12px_rgba(251,250,247,0.7)]"
          }
          style={lang === "fa" ? { letterSpacing: "0" } : undefined}
        >
          {title}
        </h3>
      </motion.div>
    </motion.div>
  );
}
