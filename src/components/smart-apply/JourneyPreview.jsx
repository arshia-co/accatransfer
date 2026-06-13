// One-time "here's your path" preview, shown right after the language choice
// so the student pictures the journey before the real conversation begins.
// Pure presentation; stages are fixed and localized. Premium glass + a glowing
// connector that fills toward the current stage.
import { motion } from 'framer-motion';
import { Languages, Target, Sparkles, BadgeCheck, Rocket } from 'lucide-react';
import { L, dirFor } from '../../lib/lang';
import { UI } from '../../i18n/ui';

const STAGES = [
  { key: 'journeyStepLanguage', icon: Languages, state: 'done' },
  { key: 'journeyStepGoal', icon: Target, state: 'current' },
  { key: 'journeyStepDiscovery', icon: Sparkles, state: 'next' },
  { key: 'journeyStepResult', icon: BadgeCheck, state: 'next' },
  { key: 'journeyStepNext', icon: Rocket, state: 'next' },
];

export default function JourneyPreview({ lang }) {
  const isRtl = dirFor(lang) === 'rtl';

  return (
    <div className="overflow-hidden rounded-[22px] border border-gold/25 bg-gradient-to-br from-white/92 via-white/72 to-emerald-600/[0.05] p-4 shadow-[0_18px_56px_rgba(7,26,61,0.09)] sm:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-navy text-gold shadow-[0_6px_18px_rgba(7,26,61,0.22)]">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-navy">{L(UI.journeyTitle, lang)}</h3>
          <p className="mt-0.5 text-[11px] font-semibold leading-5 text-navy/55">{L(UI.journeySubtitle, lang)}</p>
        </div>
      </div>

      {/* Horizontal stepper on sm+, vertical-friendly wrap on mobile */}
      <div className="relative">
        {/* connector track */}
        <div className="pointer-events-none absolute inset-x-5 top-6 hidden h-0.5 rounded-full bg-navy/[0.08] sm:block">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r from-emerald-600 to-gold ${isRtl ? 'origin-right' : 'origin-left'}`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 0.32 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
            style={{ transformOrigin: isRtl ? 'right' : 'left' }}
          />
        </div>

        <ol className="relative grid grid-cols-5 gap-1.5">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const done = stage.state === 'done';
            const current = stage.state === 'current';
            return (
              <motion.li
                key={stage.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
                className="flex flex-col items-center text-center"
              >
                <span
                  className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors ${
                    done
                      ? 'border-emerald-600/30 bg-emerald-600/12 text-emerald-700'
                      : current
                        ? 'border-gold/50 bg-white text-navy shadow-[0_8px_22px_rgba(198,167,104,0.3)]'
                        : 'border-navy/10 bg-white/70 text-navy/40'
                  }`}
                >
                  {current && (
                    <motion.span
                      className="absolute inset-0 rounded-2xl border-2 border-gold/60"
                      animate={{ scale: [1, 1.12, 1], opacity: [0.7, 0, 0.7] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className={`mt-2 text-[10px] font-black leading-tight sm:text-[11px] ${current ? 'text-navy' : 'text-navy/55'}`}>
                  {L(UI[stage.key], lang)}
                </span>
                {(done || current) && (
                  <span className={`mt-0.5 text-[8px] font-black uppercase tracking-wide ${done ? 'text-emerald-700/70' : 'text-gold'}`}>
                    {done ? L(UI.journeyDoneLabel, lang) : L(UI.journeyHereLabel, lang)}
                  </span>
                )}
              </motion.li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
