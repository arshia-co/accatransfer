// Smart Apply page shell: ambient background, header, AI cockpit (orb +
// conversation + composer), session insight panel, login gate and the
// dashboard preview. One central AI interface — no menus, no long forms.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ExternalLink, X, Sparkles, LayoutGrid, LayoutDashboard, SlidersHorizontal } from 'lucide-react';
import { L, dirFor, readStoredLang, subscribeStoredLang } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { BRAND_NAME, PRODUCT_NAME, MAIN_SITE_URL, LOGO_SRC } from '../../lib/constants';
import { sessionProgress, useSmartApplyStore } from '../../store/smartApplyStore';
import { readSmartApplySettings } from '../../lib/smartApplySettings';
import { INTENTS } from '../../ai/intents';
import { ARCHETYPES, ACCA_CATEGORY_LABELS } from '../../data/majorQuestions';
import { getMajor } from '../../data/mockPrograms';
import AIAssistantOrb from './AIAssistantOrb';
import ConversationPanel from './ConversationPanel';
import VoiceInputButton from './VoiceInputButton';
import DictationButton from './DictationButton';
import VoiceConversationOverlay from './VoiceConversationOverlay';
import AssistantSettingsModal from './AssistantSettingsModal';
import SmartApplyConsentGate from './SmartApplyConsentGate';
import SessionInsightPanel from './SessionInsightPanel';
import LoginGateModal from './LoginGateModal';
import SmartApplyProfilePreview from './SmartApplyProfilePreview';

const VOICE_SELECTABLE_INTENTS = new Set([
  INTENTS.SET_LANGUAGE,
  INTENTS.SET_GOAL,
  INTENTS.GUIDED_CONFIRM_OPTION,
  INTENTS.GUIDED_CANCEL_CONFIRMATION,
  INTENTS.DISCOVERY_ANSWER,
  INTENTS.DEEP_FIT_ANSWER,
  INTENTS.KNOWN_MAJOR_CATEGORY,
  INTENTS.KNOWN_MAJOR_PICK,
  INTENTS.APPLY_SET_DEGREE,
  INTENTS.APPLY_SET_COUNTRY,
  INTENTS.APPLY_SET_GPA,
  INTENTS.APPLY_SET_BUDGET,
]);

const VOICE_OPTION_INTRO = {
  fa: 'گزینه‌های قابل انتخاب:',
  en: 'Available options:',
  tr: 'Seçilebilir seçenekler:',
  ar: 'الخيارات المتاحة:',
};

const VOICE_ACTION_FINAL_HINT = {
  fa: 'حالا برای جلو رفتن، شماره یا متن گزینه‌ای را بگو که می‌خواهی ثبت شود؛ یا دکمه همان گزینه را بزن.',
  en: 'Now, to continue, say the number or text of the option you want to save, or tap that option.',
  tr: 'Devam etmek için kaydetmek istediğin seçeneğin numarasını ya da metnini söyle veya o seçeneğe dokun.',
  ar: 'الآن للمتابعة، قل رقم الخيار أو نصه الذي تريد حفظه، أو اضغط على ذلك الخيار.',
};

const ASSISTANT_SETTINGS_LABEL = {
  fa: 'تنظیمات',
  en: 'Settings',
  tr: 'Ayarlar',
  ar: 'الإعدادات',
};

const RESULT_DISCLAIMER = {
  fa: 'این نتیجه یک راهنمای مقدماتی آموزشی بر اساس پاسخ‌های شماست؛ تشخیص روان‌شناختی یا تضمین پذیرش نیست.',
  en: 'This is a preliminary educational guidance result based on your answers, not a psychological diagnosis or guaranteed admission result.',
  tr: 'Bu sonuç yanıtlarına dayalı ön eğitim rehberliğidir; psikolojik tanı veya kesin kabul garantisi değildir.',
  ar: 'هذه نتيجة إرشاد تعليمي أولية بناء على إجاباتك، وليست تشخيصا نفسيا أو ضمانا للقبول.',
};

const VOICE_SCRIPT_LIMIT = 620;
const VOICE_ACTION_CONTENT_LIMIT = 430;
const VOICE_SENTENCE_BOUNDARIES = ['.', '\u061F', '?', '!', '\u061B', '\n'];
const VOICE_SOFT_BOUNDARIES = [',', '\u060C', ':', '\u061B'];

function compactVoiceText(text) {
  return String(text || '')
    .replace(/[*_`>#]/g, '')
    .replace(/[•·]/g, '. ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function trimVoiceScript(script, limit = VOICE_SCRIPT_LIMIT) {
  const clean = String(script || '').trim();
  if (clean.length <= limit) return clean;
  const head = clean.slice(0, limit);
  const boundary = Math.max(...VOICE_SENTENCE_BOUNDARIES.map((mark) => head.lastIndexOf(mark)));
  if (boundary > Math.floor(limit * 0.55)) return head.slice(0, boundary + 1).trim();
  const softBoundary = Math.max(...VOICE_SOFT_BOUNDARIES.map((mark) => head.lastIndexOf(mark)));
  if (softBoundary > Math.floor(limit * 0.62)) return `${head.slice(0, softBoundary + 1).trim()}…`;
  const spaceBoundary = head.lastIndexOf(' ');
  const cut = spaceBoundary > Math.floor(limit * 0.58) ? spaceBoundary : limit;
  return `${head.slice(0, cut).trim()}…`;
}

function selectableOptionLines(actions = [], lang) {
  const seen = new Set();
  const selectable = actions.filter((item) => VOICE_SELECTABLE_INTENTS.has(item.nextIntent));
  const lines = [];
  selectable.forEach((item) => {
    const label = trimVoiceScript(compactVoiceText(item.label), 92);
    if (!label || seen.has(label)) return;
    seen.add(label);
    lines.push(`${lines.length + 1}. ${label}`);
  });
  if (!lines.length) return '';
  return [
    L(VOICE_OPTION_INTRO, lang),
    lines.join(lang === 'en' ? '; ' : '، '),
    L(VOICE_ACTION_FINAL_HINT, lang),
  ].join('\n');
}

function archetypeName(result, lang) {
  const id = result?.accaArchetype?.primary || result?.archetypeId;
  const archetype = ARCHETYPES.find((item) => item.id === id);
  return archetype ? L(archetype.name, lang) : '';
}

function interestNames(result, lang) {
  const entries = result?.topInterestAreas || result?.accaTop || result?.interests || [];
  return entries
    .slice(0, 3)
    .map((item) => (typeof item === 'string' ? item : item?.key))
    .filter(Boolean)
    .map((key) => L(ACCA_CATEGORY_LABELS[key] || { en: key }, lang))
    .filter(Boolean);
}

function discoveryMajorNames(result, lang) {
  return (result?.recommendedMajors || [])
    .slice(0, 3)
    .map((item) => getMajor(item.majorId))
    .filter(Boolean)
    .map((major) => L(major.name, lang));
}

function deepMajorNames(result, lang) {
  return (result?.recommendedMajors || [])
    .slice(0, 3)
    .map((item) => {
      const name = typeof item?.name === 'string' ? item.name : L(item?.name, lang);
      return item?.match ? `${name} (${item.match}%)` : name;
    })
    .filter(Boolean);
}

function resultVoiceSummary(message, lang) {
  const result = message?.payload || {};
  const isFa = lang === 'fa';
  const isDeep = message.component === 'deep_fit_result';
  const title = isDeep
    ? compactVoiceText(L(result.signature?.label, lang) || archetypeName(result, lang))
    : compactVoiceText(archetypeName(result, lang));
  const interests = interestNames(result, lang).join(isFa ? '، ' : ', ');
  const majors = (isDeep ? deepMajorNames(result, lang) : discoveryMajorNames(result, lang))
    .join(isFa ? '، ' : ', ');

  if (isFa) {
    return [
      isDeep ? 'تحلیل عمیق آماده است.' : 'نتیجه اولیه آماده است.',
      title ? `عنوان پروفایل آموزشی شما: ${title}.` : '',
      interests ? `حوزه‌های علاقه اصلی: ${interests}.` : '',
      majors ? `رشته‌های پیشنهادی: ${majors}.` : '',
      L(RESULT_DISCLAIMER, lang),
    ].filter(Boolean).join(' ');
  }

  return [
    isDeep ? 'Your deep educational analysis is ready.' : 'Your preliminary result is ready.',
    title ? `Educational profile: ${title}.` : '',
    interests ? `Top interest areas: ${interests}.` : '',
    majors ? `Recommended majors: ${majors}.` : '',
    L(RESULT_DISCLAIMER, lang),
  ].filter(Boolean).join(' ');
}

function voiceScriptForMessage(message, lang) {
  if (!message || message.role !== 'assistant') return '';
  if (message.component === 'major_result' || message.component === 'deep_fit_result') {
    return resultVoiceSummary(message, lang);
  }
  const content = compactVoiceText(message.content);
  const options = selectableOptionLines(message.actions || [], lang);
  if (options) {
    return [
      trimVoiceScript(content, VOICE_ACTION_CONTENT_LIMIT),
      options,
    ].filter(Boolean).join('\n\n');
  }
  return trimVoiceScript(content);
}

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
  const submitFreeText = useSmartApplyStore((s) => s.submitFreeText);
  const setVoiceActivity = useSmartApplyStore((s) => s.setVoiceActivity);
  const openDashboard = useSmartApplyStore((s) => s.openDashboard);
  const isAuthenticated = useSmartApplyStore((s) => s.isAuthenticated);
  const authInited = useSmartApplyStore((s) => s.authInited);
  const startDeepFit = useSmartApplyStore((s) => s.startDeepFit);
  const progress = useSmartApplyStore(sessionProgress);

  const [draft, setDraft] = useState('');
  const [insightOpen, setInsightOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceContextSnapshot, setVoiceContextSnapshot] = useState('');
  const [voiceInitialScript, setVoiceInitialScript] = useState(null);
  const [assistantSettingsOpen, setAssistantSettingsOpen] = useState(false);
  const [assistantSettings, setAssistantSettings] = useState(() => readSmartApplySettings());
  const deepFitQueryHandled = useRef(false);

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
    if (!assistantSettings.consent?.accepted) return;
    boot();
  }, [boot, assistantSettings.consent?.accepted]);

  useEffect(() => {
    const savedLang = readStoredLang({ fallback: null });
    if (savedLang && savedLang !== useSmartApplyStore.getState().language) {
      useSmartApplyStore.setState({ language: savedLang });
    }

    return subscribeStoredLang((nextLang) => {
      const current = useSmartApplyStore.getState().language;
      if (nextLang !== current) {
        useSmartApplyStore.setState({ language: nextLang });
      }
    });
  }, []);

  useEffect(() => {
    if (deepFitQueryHandled.current || !authInited) return;
    const requested = new URLSearchParams(window.location.search).get('deep-fit') === '1';
    if (!requested) {
      deepFitQueryHandled.current = true;
      return;
    }
    deepFitQueryHandled.current = true;
    startDeepFit();
  }, [authInited, isAuthenticated, startDeepFit]);

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

  const voiceScripts = useMemo(() => messages
    .filter((message) => message.role === 'assistant')
    .map((message) => {
      const text = voiceScriptForMessage(message, language);
      return {
        id: message.id,
        text,
        hasActions: Boolean(message.actions?.length),
        component: message.component || null,
      };
    })
    .filter((item) => item.text), [messages, language]);

  const handleVoiceSpeech = useCallback((text, sourceId) => {
    submitFreeText(text, { source: 'voice', sourceId });
  }, [submitFreeText]);

  const handleVoiceActivity = useCallback((activity) => {
    setVoiceActivity(activity);
  }, [setVoiceActivity]);

  const handleOpenVoice = useCallback(() => {
    setVoiceContextSnapshot(voiceContext);
    setVoiceInitialScript(voiceScripts[voiceScripts.length - 1] || null);
    setVoiceOpen(true);
  }, [voiceContext, voiceScripts]);

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
          <a href="/" className="flex items-center gap-3" aria-label={BRAND_NAME}>
            <img src={LOGO_SRC} alt={BRAND_NAME} width="92" height="40" className="h-10 w-[92px] object-contain" />
            <span className="hidden h-7 w-px bg-navy/10 sm:block" />
            <span className="hidden sm:block">
              <span className="block text-sm font-black leading-4 text-navy">{PRODUCT_NAME}</span>
              <span className="mt-0.5 block text-[10px] font-bold text-gold">{L(UI.assistantName, language)}</span>
            </span>
          </a>

          {/* All actions stay visible on mobile (icon-only), expanding to
              labelled pills on larger screens. */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* user panel / dashboard */}
            <button
              type="button"
              onClick={openDashboard}
              title={L(UI.panelButton, language)}
              aria-label={L(UI.panelButton, language)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-navy px-2.5 text-[11px] font-black text-cream shadow-[0_8px_22px_rgba(7,26,61,0.25)] transition hover:bg-navy/90 sm:px-4"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0 text-gold" />
              <span className="hidden sm:inline">{L(UI.panelButton, language)}</span>
            </button>
            {/* session memory */}
            <button
              type="button"
              onClick={() => setInsightOpen(true)}
              title={L(UI.openInsight, language)}
              aria-label={L(UI.openInsight, language)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-navy/10 bg-white/70 px-2.5 text-[11px] font-black text-navy backdrop-blur-md transition hover:border-gold/50 sm:px-3.5"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-gold" />
              <span className="hidden sm:inline">{L(UI.openInsight, language)}</span>
            </button>
            {/* all services / gateway */}
            <a
              href="/"
              title={L(UI.allServices, language)}
              aria-label={L(UI.allServices, language)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-navy/10 bg-white/70 px-2.5 text-[11px] font-black text-navy/70 backdrop-blur-md transition hover:border-gold/50 hover:text-navy lg:px-4"
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{L(UI.allServices, language)}</span>
            </a>
            {/* ACCA EDU main site */}
            <a
              href={MAIN_SITE_URL}
              title={L(UI.backToSite, language)}
              aria-label={L(UI.backToSite, language)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-navy/10 bg-white/70 px-2.5 text-[11px] font-black text-navy/70 backdrop-blur-md transition hover:border-gold/50 hover:text-navy lg:px-4"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="hidden lg:inline">{L(UI.backToSite, language)}</span>
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
                <button
                  type="button"
                  onClick={() => setAssistantSettingsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/10 bg-emerald-600/[0.06] px-2.5 py-1.5 text-[10px] font-black text-emerald-800 transition hover:border-emerald-700/25 hover:bg-emerald-600/[0.10] sm:gap-2 sm:px-3"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {L(ASSISTANT_SETTINGS_LABEL, language)}
                </button>
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
                {/* Speech-to-text: speak → editable text → you send it. */}
                <DictationButton
                  baseText={draft}
                  onText={setDraft}
                  disabled={busy}
                  lang={language}
                />
                {/* Live realtime voice conversation (separate button). */}
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
      <AssistantSettingsModal
        open={assistantSettingsOpen}
        lang={language}
        settings={assistantSettings}
        onSave={setAssistantSettings}
        onClose={() => setAssistantSettingsOpen(false)}
      />
      <SmartApplyConsentGate
        open={!assistantSettings.consent?.accepted}
        lang={language}
        settings={assistantSettings}
        onAccept={setAssistantSettings}
      />
      <VoiceConversationOverlay
        open={voiceOpen}
        lang={language}
        sessionId={sessionId}
        context={voiceContextSnapshot}
        initialScript={voiceInitialScript}
        assistantScripts={voiceScripts}
        assistantBusy={assistantStatus !== 'idle'}
        voiceId={assistantSettings.voiceId}
        inputDeviceId={assistantSettings.inputDeviceId}
        outputDeviceId={assistantSettings.outputDeviceId}
        autoReadNextStep={assistantSettings.chat.autoReadNextStep}
        onStudentSpeech={handleVoiceSpeech}
        onActivity={handleVoiceActivity}
        onClose={() => setVoiceOpen(false)}
      />
    </div>
  );
}
