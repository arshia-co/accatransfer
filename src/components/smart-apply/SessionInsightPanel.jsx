// Premium "Smart Apply memory" card: progress ring + captured profile rows.
// Quietly fills as the student answers; never dominates the conversation.
import { useMemo, useState } from 'react';
import { AlertTriangle, MessageCircle, ShieldCheck, Sparkles, Trash2, UserRound } from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { buildProfileRows } from '../../lib/profileDisplay';
import { useSmartApplyStore } from '../../store/smartApplyStore';
import ProgressMemoryCard from './ProgressMemoryCard';

export default function SessionInsightPanel({ lang }) {
  const state = useSmartApplyStore();
  const clearSessionMemory = useSmartApplyStore((store) => store.clearSessionMemory);
  const [confirmClear, setConfirmClear] = useState(false);
  const rows = useMemo(() => buildProfileRows(state, lang), [state, lang]);
  const capturedCount = rows.filter((row) => Boolean(row.value)).length;
  const transcript = state.messages.filter((message) => message.content);

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

      <div className="mt-4 rounded-[22px] border border-navy/[0.07] bg-white/55 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[11px] font-black text-navy">
            <MessageCircle className="h-4 w-4 text-emerald-700" />
            {L(UI.memoryConversationTitle, lang)}
          </span>
          <span className="rounded-full bg-navy/[0.05] px-2.5 py-1 text-[10px] font-black text-navy/45">
            {transcript.length} {L(UI.memoryMessagesSaved, lang)}
          </span>
        </div>

        {transcript.length > 0 ? (
          <div className="sa-scroll mt-3 max-h-52 space-y-2 overflow-y-auto pe-1">
            {transcript.map((message) => (
              <div
                key={message.id}
                dir={message.lang === 'fa' || message.lang === 'ar' ? 'rtl' : 'ltr'}
                className={`rounded-2xl px-3 py-2 text-[11px] font-semibold leading-5 ${
                  message.role === 'user'
                    ? 'ms-8 bg-navy text-cream'
                    : 'me-5 border border-navy/[0.06] bg-white/80 text-navy/70'
                }`}
              >
                {message.content}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-navy/10 px-3 py-4 text-center text-[11px] font-semibold leading-5 text-navy/40">
            {L(UI.memoryEmptyTranscript, lang)}
          </p>
        )}
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
        <span className="text-end text-[10px] font-semibold leading-4 text-navy/40">
          {L(UI.memoryPersistenceNote, lang)}
        </span>
      </div>

      <div className="mt-3">
        {confirmClear ? (
          <div className="rounded-[22px] border border-rose-200 bg-rose-50/80 p-3.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <p className="text-xs font-black text-rose-900">{L(UI.clearMemoryConfirmTitle, lang)}</p>
                <p className="mt-1 text-[10px] font-semibold leading-5 text-rose-800/70">
                  {L(UI.clearMemoryConfirmBody, lang)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="flex-1 rounded-full border border-rose-200 bg-white px-3 py-2 text-[11px] font-black text-rose-800 transition hover:bg-rose-50"
              >
                {L(UI.clearMemoryCancel, lang)}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmClear(false);
                  clearSessionMemory();
                }}
                className="flex-1 rounded-full bg-rose-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-rose-700"
              >
                {L(UI.clearMemoryConfirm, lang)}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-rose-200/80 bg-white/60 px-4 py-2.5 text-[11px] font-black text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
            {L(UI.clearMemory, lang)}
          </button>
        )}
      </div>
    </aside>
  );
}
