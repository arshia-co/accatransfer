// The "memory" rows of the session: each captured answer fills a line.
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { getIcon } from '../../lib/icons';

export default function ProgressMemoryCard({ rows, lang }) {
  const visibleRows = rows.filter((row) => Boolean(row.value));

  if (!visibleRows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-navy/10 bg-white/40 px-4 py-5 text-center">
        <p className="text-xs font-semibold leading-6 text-navy/45">
          {L({
            fa: 'هنوز چیزی ثبت نکرده‌ام. با پاسخ اول شما، خلاصه اینجا شکل می‌گیرد.',
            en: 'Nothing captured yet. Your summary will begin with your first answer.',
            tr: 'Henüz bir bilgi yok. Özetiniz ilk yanıtınızla başlayacak.',
            ar: 'لم أسجل شيئاً بعد. سيبدأ الملخص مع إجابتك الأولى.',
          }, lang)}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {visibleRows.map((row) => {
        const Icon = getIcon(row.icon);
        const filled = Boolean(row.value);
        return (
          <li
            key={row.key}
            className={`flex items-center gap-2.5 rounded-2xl px-3 py-2 transition-colors ${
              filled ? 'bg-emerald-600/[0.06]' : ''
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${filled ? 'bg-emerald-600/10 text-emerald-700' : 'bg-navy/[0.04] text-navy/35'}`}>
              <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
            </span>
            <span className="w-20 shrink-0 text-[11px] font-bold text-navy/45">{row.label}</span>
            <span className="min-w-0 flex-1 truncate text-end text-xs font-black text-navy">
              <AnimatePresence mode="wait" initial={false}>
                {filled ? (
                  <motion.span
                    key={String(row.value)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="inline-flex max-w-full items-center gap-1.5"
                  >
                    <span className="truncate">{row.value}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  </motion.span>
                ) : (
                  <span className="text-[11px] font-semibold text-navy/30">{L(UI.notSet, lang)}</span>
                )}
              </AnimatePresence>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
