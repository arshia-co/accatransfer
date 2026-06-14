// Smart Apply page shell: ambient background, header, AI cockpit (orb +
// conversation + composer), session insight panel, login gate and the
// dashboard preview. One central AI interface — no menus, no long forms.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, ExternalLink, X, Sparkles, LayoutGrid } from 'lucide-react';
import { L, dirFor } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { PRODUCT_NAME, MAIN_SITE_URL, LOGO_SRC } from '../../lib/constants';
import { sessionProgress, useSmartApplyStore } from '../../store/smartApplyStore';
import AIAssistantOrb from './AIAssistantOrb';
import ConversationPanel from './ConversationPanel';
import VoiceInputButton from './VoiceInputButton';
import VoiceConversationOverlay from './VoiceConversationOverlay';
import SessionInsightPanel from './SessionInsightPanel';
import LoginGateModal from './LoginGateModal';
import SmartApplyProfilePreview from './SmartApplyProfilePreview';

export default function SmartApplyShell() {
  const language = useSmartApplyStore((s) => s.language);
  const currentStep = useSmartApplyStore((s) => s.currentStep);
  const assistantStatus = useSmartApplyStore((s) => s.assistantStatus);
  const isListening = useSmartApplyStore((s) => s.isListening);
  const isAssistantSpeaking = useSmartApplyStore((s) => s.isAssistantSpeaking);
  const sessionId = useSmartApplyStore((s) => s.sessionId);
  const messages = useSmartApplyStore((s) => s.messages);
  const goal = useSmartApplyStore((s) => s.goal);
  const studentProfile = useSmartApplyStore((s) => s.studentProfile);
  const boot = useSmartApplyStore((s) => s.boot);
  const restart = useSmartApplyStore((s) => s.restart);
  const submitFreeText = useSmartApplyStore((s) => s.submitFreeText);
  const setVoiceActivity = useSmartApplyStore((s) => s.setVoiceActivity);
  const appendVoiceTranscript = useSmartApplyStore((s) => s.appendVoiceTranscript);
  const progress = useSmartApplyStore(sessionProgress);

  const [draft, setDraft] = useState('');
  const [insightOpen, setInsightOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceContextSnapshot, setVoiceContextSnapshot] = useState('');

  const dir = dirFor(language);
  const busy = assistantStatus !== 'idle';
  const placeholder =
    currentStep === 'awaiting_language'
      ? L(UI.inputPlaceholderLanguage, language)
      : currentStep === 'awaiting_goal'
        ? L(UI.inputPlaceholderGoal, language)
        : currentStep === 'discovery_name'
          ? L(UI.inputPlaceholderName, language)
          : currentStep.startsWith('faq')
            ? L(UI.inputPlaceholderQuestion, language)
            : L(UI.inputPlaceholder, language);

  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const statusLabel = isListening
    ? L(UI.statusListening, language)
    : isAssistantSpeaking
      ? L(UI.statusSpeaking, language)
    : assistantStatus === 'thinking'
      ? L(UI.statusThinking, language)
      : assistantStatus === 'typing'
        ? L(UI.statusTyping, language)
        : L(UI.statusOnline, language);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    submitFreeText(draft);
    setDraft('');
  };

  const voiceContext = useMemo(() => {
    const profile = [
      goal ? `goal=${goal}` : '',
      studentProfile?.degree ? `degree=${studentProfile.degree}` : '',
      studentProfile?.country ? `country=${studentProfile.country}` : '',
      studentProfile?.knownMajor ? `major=${studentProfile.knownMajor}` : '',
    ].filter(Boolean).join(', ');
    const recent = messages
      .filter((message) => message.content && (message.role === 'user' || message.role === 'assistant'))
      .slice(-8)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');
    return [profile, recent].filter(Boolean).join('\n\n');
  }, [goal, messages, studentProfile]);

  const handleVoiceTranscript = useCallback((role, text, sourceId) => {
    appendVoiceTranscript(role, text, sourceId);
  }, [appendVoiceTranscript]);

  const handleVoiceActivity = useCallback((activity) => {
    setVoiceActivity(activity);
  }, [setVoiceActivity]);

  const handleOpenVoice = useCallback(() => {
    setVoiceContextSnapshot(voiceContext);
    setVoiceOpen(true);
  }, [voiceContext]);

  return (
    <div dir={dir} className="relative min-h-screen overflow-hidden bg-cream text-navy">
      {/* ---- ambient background ---- */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {/* faint futuristic grid (echoes the ACCA gateway landing) */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(rgba(7,26,61,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(7,26,61,0.035) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
            maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 82%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 82%, transparent)',
          }}
        />
        <div
          className="absolute -top-32 end-[-10%] h-[420px] w-[420px] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.16), transparent 65%)' }}
        />
        <div
          className="absolute bottom-[-15%] start-[-8%] h-[460px] w-[460px] rounded-full opacity-70 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(198,167,104,0.20), transparent 65%)' }}
        />
        <span className="sa-float absolute top-[18%] start-[12%] h-2.5 w-2.5 rounded-full bg-gold/50" />
        <span className="sa-float absolute top-[60%] end-[8%] h-2 w-2 rounded-full bg-emerald-500/40" style={{ animationDelay: '1.6s' }} />
        <span className="sa-float absolute bottom-[14%] start-[40%] h-1.5 w-1.5 rounded-full bg-navy/20" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-3 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-5">
        {/* ---- header ---- */}
        <header className="flex items-center justify-between gap-3 rounded-[22px] border border-white/70 bg-white/55 px-3 py-2.5 shadow-[0_16px_50px_rgba(7,26,61,0.06)] backdrop-blur-2xl sm:px-4">
          <a href={MAIN_SITE_URL} className="flex items-center gap-3" aria-label="ACCA EDU">
            <img src={LOGO_SRC} alt="ACCA EDU" width="92" height="40" className="h-10 w-[92px] object-contain" />
            <span className="hidden h-7 w-px bg-navy/10 sm:block" />
            <span className="hidden sm:block">
              <span className="block text-sm font-black leading-4 text-navy">{PRODUCT_NAME}</span>
              <span className="mt-0.5 block text-[10px] font-bold text-gold">{L(UI.assistantName, language)}</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            {/* mobile insight toggle */}
            <button
              type="button"
              onClick={() => setInsightOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white/70 px-3.5 py-2 text-[11px] font-black text-navy backdrop-blur-md transition hover:border-gold/50"
            >
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              {L(UI.openInsight, language)}
            </button>
            <button
              type="button"
              onClick={restart}
              title={L(UI.restart, language)}
              aria-label={L(UI.restart, language)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-navy/10 bg-white/70 text-navy/60 backdrop-blur-md transition hover:border-gold/50 hover:text-navy"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <a
              href="/"
              className="hidden h-10 items-center gap-2 rounded-full border border-navy/10 bg-white/70 px-4 text-[11px] font-black text-navy/70 backdrop-blur-md transition hover:border-gold/50 hover:text-navy sm:inline-flex"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {L(UI.allServices, language)}
            </a>
            <a
              href={MAIN_SITE_URL}
              className="hidden h-10 items-center gap-2 rounded-full border border-navy/10 bg-white/70 px-4 text-[11px] font-black text-navy/70 backdrop-blur-md transition hover:border-gold/50 hover:text-navy lg:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {L(UI.backToSite, language)}
            </a>
          </div>
        </header>

        {/* ---- main grid ---- */}
        <main className="mt-3 flex flex-1 justify-center sm:mt-4">
          {/* AI cockpit */}
          <section className="relative flex h-[calc(100svh-7.5rem)] min-h-[620px] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/48 shadow-[0_28px_90px_rgba(7,26,61,0.11)] backdrop-blur-xl sm:h-[calc(100svh-8.5rem)] sm:max-h-[860px] sm:rounded-[34px]">
            <div
              className="pointer-events-none absolute inset-x-[12%] top-[-90px] h-44 rounded-full opacity-70 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.18), rgba(198,167,104,0.10), transparent 72%)' }}
              aria-hidden="true"
            />
            {/* assistant header */}
            <div className="relative border-b border-navy/[0.055] bg-white/64 px-4 pb-3.5 pt-4 sm:px-6 sm:pb-4">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <AIAssistantOrb
                  size="hero"
                  status={isAssistantSpeaking ? 'typing' : assistantStatus}
                  listening={isListening}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gold sm:text-[10px]">{L(UI.guidedSession, language)}</p>
                  <h1 className="mt-0.5 truncate text-base font-black text-navy sm:text-lg">{L(UI.assistantName, language)}</h1>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-navy/50 sm:text-[11px]">
                    <span className={`h-2 w-2 rounded-full ${busy || isListening ? 'animate-pulse bg-gold' : 'bg-emerald-500'}`} />
                    {statusLabel}
                  </p>
                </div>
                <span className="hidden rounded-full border border-emerald-700/10 bg-emerald-600/[0.06] px-3 py-1.5 text-[10px] font-black text-emerald-800 sm:block">
                  {L(UI.sessionStartBadge, language)}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 sm:mt-3.5">
                <span className="shrink-0 text-[9px] font-black uppercase tracking-wide text-navy/40 sm:text-[10px]">
                  {L(UI.sessionProgress, language)}
                </span>
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-navy/[0.065]">
                  <motion.span
                    className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-gold"
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </span>
                <motion.span
                  key={progress}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-8 text-end text-[10px] font-black text-emerald-800"
                >
                  {Math.round(progress)}%
                </motion.span>
              </div>
            </div>

            {/* conversation */}
            <ConversationPanel lang={language} />

            {/* composer */}
            <div className="border-t border-navy/[0.05] bg-white/68 p-3 sm:p-4">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 rounded-full border border-navy/10 bg-white/90 py-1.5 pe-1.5 ps-2 shadow-[0_10px_36px_rgba(7,26,61,0.065)] backdrop-blur-xl transition focus-within:border-emerald-700/25 focus-within:shadow-[0_12px_40px_rgba(5,150,105,0.10)] sm:gap-2.5"
              >
                <VoiceInputButton
                  active={voiceOpen}
                  disabled={busy}
                  onPress={handleOpenVoice}
                  lang={language}
                />
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={placeholder}
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-navy outline-none placeholder:font-semibold placeholder:text-navy/30"
                />
                <motion.button
                  type="submit"
                  disabled={!draft.trim() || busy}
                  whileTap={{ scale: 0.92 }}
                  aria-label={L(UI.send, language)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-[0_8px_26px_rgba(5,150,105,0.35)] transition enabled:hover:bg-emerald-800 disabled:opacity-35"
                >
                  <Send className="h-4.5 w-4.5 rtl:-scale-x-100" strokeWidth={2.3} />
                </motion.button>
              </form>
            </div>
          </section>
        </main>

        {/* ---- footer ---- */}
        <footer className="mt-2 pb-1 text-center text-[9px] font-semibold text-navy/35 sm:mt-4 sm:text-[10px]">
          {L(UI.footerDisclaimer, language)}
        </footer>
      </div>

      {/* ---- mobile insight drawer ---- */}
      <AnimatePresence>
        {insightOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex items-end justify-center bg-navy/30 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setInsightOpen(false)}
          >
            <motion.div
              dir={dir}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-cream p-4 pb-6 sa-scroll sm:rounded-[28px]"
            >
              <button
                type="button"
                onClick={() => setInsightOpen(false)}
                aria-label={L(UI.close, language)}
                className="absolute end-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-navy/[0.06] text-navy/60"
              >
                <X className="h-4 w-4" />
              </button>
              <SessionInsightPanel lang={language} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- overlays ---- */}
      <LoginGateModal lang={language} />
      <SmartApplyProfilePreview lang={language} />
      <VoiceConversationOverlay
        open={voiceOpen}
        lang={language}
        sessionId={sessionId}
        context={voiceContextSnapshot}
        onTranscript={handleVoiceTranscript}
        onActivity={handleVoiceActivity}
        onClose={() => setVoiceOpen(false)}
      />
    </div>
  );
}
