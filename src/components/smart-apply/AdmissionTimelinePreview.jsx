// Vertical preview of the admission journey (sample data from
// mockAdmissionRules). First step pulses as "you are here".
import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { ADMISSION_TIMELINE } from '../../data/mockAdmissionRules';

export default function AdmissionTimelinePreview({ lang, compact = false }) {
  return (
    <div className={`rounded-[22px] border border-white/80 bg-white/70 ${compact ? 'p-4' : 'p-5'} shadow-[0_12px_36px_rgba(7,26,61,0.06)] backdrop-blur-md`}>
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-4.5 w-4.5 text-emerald-700" />
        <h3 className="text-sm font-black text-navy">{L(UI.timelineTitle, lang)}</h3>
      </div>
      <ol className="relative space-y-4 border-s-2 border-dashed border-navy/10 ps-5">
        {ADMISSION_TIMELINE.map((step, i) => (
          <motion.li
            key={step.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.3 }}
            className="relative"
          >
            <span
              className={`absolute -start-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                i === 0 ? 'border-emerald-600 bg-emerald-500/20' : 'border-navy/15 bg-white'
              }`}
            >
              {i === 0 && (
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-600"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
              )}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[13px] font-black text-navy">{L(step.title, lang)}</h4>
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-black text-[#8a6c33]">
                {L(step.hint, lang)}
              </span>
            </div>
            {!compact && (
              <p className="mt-1 text-xs font-semibold leading-6 text-navy/55">{L(step.desc, lang)}</p>
            )}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
