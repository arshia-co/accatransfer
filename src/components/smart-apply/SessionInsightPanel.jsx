// Premium "Smart Apply memory" card: progress ring + captured profile rows.
// Quietly fills as the student answers; never dominates the conversation.
import { useMemo } from 'react';
import { UserRound, ShieldCheck, Sparkles } from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { buildProfileRows } from '../../lib/profileDisplay';
import { useSmartApplyStore } from '../../store/smartApplyStore';
import ProgressMemoryCard from './ProgressMemoryCard';

export default function SessionInsightPanel({ lang }) {
  const state = useSmartApplyStore();
  const rows = useMemo(() => buildProfileRows(state, lang), [state, lang]);
  const capturedCount = rows.filter((row) => Boolean(row.value)).length;

  return (
    <aside className="rounded-[28px] border border-white/75 bg-white/55 p-5 shadow-[0_18px_60px_rgba(7,26,61,0.08)] backdrop-blur-xl">
      <div className="flex items-center gap-3.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600/15 via-white to-gold/25 text-navy shadow-inner">
          <Sparkles className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-black text-navy">{L(UI.insightTitle, lang)}</h2>
          <p className="mt-0.5 text-[11px] font-semibold leading-5 text-navy/50">{L(UI.insightSubtitle, lang)}</p>
          {capturedCount > 0 && (
            <p className="mt-1 text-[10px] font-black text-emerald-700">
              {capturedCount} {L({ fa: 'نکته ثبت‌شده', en: 'details captured', tr: 'bilgi kaydedildi', ar: 'تفاصيل مسجلة' }, lang)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <ProgressMemoryCard rows={rows} lang={lang} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-navy/[0.04] px-3.5 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-navy/55">
          {state.isAuthenticated ? (
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
          ) : (
            <UserRound className="h-3.5 w-3.5 text-gold" />
          )}
          {state.isAuthenticated ? L(UI.signedInBadge, lang) : L(UI.guestBadge, lang)}
        </span>
        <span className="text-[10px] font-semibold text-navy/40">{L(UI.sessionOnlyNote, lang)}</span>
      </div>
    </aside>
  );
}
