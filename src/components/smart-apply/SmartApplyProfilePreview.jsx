// Post-login dashboard PREVIEW (frontend-only): profile, majors, documents,
// applications, timeline, messages. A real dashboard arrives with the backend.
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderOpen, Inbox, ExternalLink } from 'lucide-react';
import { L, dirFor } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { getIcon } from '../../lib/icons';
import { buildProfileRows } from '../../lib/profileDisplay';
import { useSmartApplyStore, profileProgress } from '../../store/smartApplyStore';
import ProgressMemoryCard from './ProgressMemoryCard';
import RecommendedMajorCard from './RecommendedMajorCard';
import DocumentUploadPlaceholder from './DocumentUploadPlaceholder';
import AdmissionTimelinePreview from './AdmissionTimelinePreview';

const TABS = [
  { id: 'profile', icon: 'UserRound', label: UI.dashProfile },
  { id: 'majors', icon: 'Compass', label: UI.dashMajors },
  { id: 'documents', icon: 'FileText', label: UI.dashDocuments },
  { id: 'applications', icon: 'Send', label: UI.dashApplications },
  { id: 'timeline', icon: 'CalendarClock', label: UI.dashTimeline },
  { id: 'messages', icon: 'MessagesSquare', label: UI.dashMessages },
];

const NO_RESULT_YET = {
  fa: 'هنوز نتیجه‌ای ثبت نشده — مسیر «کشف رشته» را در گفت‌وگو امتحان کنید.',
  en: 'No result yet — try the “major discovery” path in the conversation.',
  tr: 'Henüz sonuç yok — sohbette “bölüm keşfi” yolunu dene.',
  ar: 'لا توجد نتيجة بعد — جرّب مسار «اكتشاف التخصص» في المحادثة.',
};

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-navy/15 bg-white/50 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/[0.05] text-navy/40">
        <Icon className="h-6 w-6" />
      </span>
      <p className="max-w-xs text-xs font-bold leading-6 text-navy/55">{text}</p>
    </div>
  );
}

export default function SmartApplyProfilePreview({ lang }) {
  const isOpen = useSmartApplyStore((s) => s.isDashboardOpen);
  const closeDashboard = useSmartApplyStore((s) => s.closeDashboard);
  const state = useSmartApplyStore();
  const [tab, setTab] = useState('profile');

  const rows = useMemo(() => buildProfileRows(state, lang), [state, lang]);
  const name = state.studentProfile?.name;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-navy/35 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeDashboard}
        >
          <motion.div
            dir={dirFor(lang)}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 50, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="flex h-full w-full max-w-4xl flex-col overflow-hidden border border-white/80 bg-cream/95 shadow-[0_40px_140px_rgba(7,26,61,0.4)] backdrop-blur-2xl sm:h-[min(86vh,720px)] sm:rounded-[32px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-navy/[0.06] bg-white/70 px-6 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gold">{L(UI.dashboardTitle, lang)}</p>
                <h2 className="mt-0.5 text-base font-black text-navy">
                  {L(UI.dashWelcome, lang)}{name ? `${lang === 'fa' || lang === 'ar' ? '،' : ','} ${name}` : ''} ✨
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/account"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-2 text-[11px] font-black text-white shadow-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {lang === 'fa' ? 'پنل کامل من' : 'My full panel'}
                </a>
                <button
                  type="button"
                  onClick={closeDashboard}
                  aria-label={L(UI.close, lang)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/[0.05] text-navy/60 transition hover:bg-navy/10"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 overflow-x-auto border-b border-navy/[0.06] bg-white/40 px-4 py-2.5 sa-scroll">
              {TABS.map((t) => {
                const Icon = getIcon(t.icon);
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black transition ${
                      active ? 'bg-navy text-cream shadow-[0_8px_22px_rgba(7,26,61,0.25)]' : 'text-navy/55 hover:bg-navy/[0.05]'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? 'text-gold' : ''}`} />
                    {L(t.label, lang)}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 sa-scroll">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === 'profile' && (
                    <div className="mx-auto max-w-md rounded-[24px] border border-white/80 bg-white/65 p-5 shadow-[0_14px_44px_rgba(7,26,61,0.07)]">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-black text-navy">{L(UI.dashProfile, lang)}</h3>
                        <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[10px] font-black text-emerald-800">
                          {L(UI.progressLabel, lang)}: {profileProgress(state)}%
                        </span>
                      </div>
                      <ProgressMemoryCard rows={rows} lang={lang} />
                    </div>
                  )}

                  {tab === 'majors' && (
                    state.recommendedMajors?.length ? (
                      <div className="mx-auto max-w-xl space-y-2.5">
                        {state.recommendedMajors.map((rec, i) => (
                          <RecommendedMajorCard key={rec.majorId} majorId={rec.majorId} match={rec.match} lang={lang} index={i} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState icon={getIcon('Compass')} text={L(NO_RESULT_YET, lang)} />
                    )
                  )}

                  {tab === 'documents' && (
                    <div className="mx-auto max-w-2xl">
                      <DocumentUploadPlaceholder degree={state.studentProfile?.degree || 'bachelor'} lang={lang} />
                    </div>
                  )}

                  {tab === 'applications' && (
                    <EmptyState icon={FolderOpen} text={L(UI.dashApplicationsEmpty, lang)} />
                  )}

                  {tab === 'timeline' && (
                    <div className="mx-auto max-w-xl">
                      <AdmissionTimelinePreview lang={lang} />
                    </div>
                  )}

                  {tab === 'messages' && (
                    <EmptyState icon={Inbox} text={L(UI.dashMessagesMock, lang)} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
