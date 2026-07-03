// Smart Apply session store (Zustand).
// Owns the conversation state and orchestrates the mock AI provider:
// user action → echo bubble → thinking → typed assistant messages → patch.
// All conversation CONTENT comes from src/ai — the store only sequences it.
import { create } from 'zustand';
import { INTENTS } from '../ai/intents';
import { sendIntent, sendText, typingDelayFor, delay } from '../ai/mockAIProvider';
import { WHATSAPP_URL } from '../lib/constants';
import {
  L,
  normalizeLang,
  readStoredLang,
  SUPPORTED_LANGS as SHARED_SUPPORTED_LANGS,
  writeStoredLang,
} from '../lib/lang';
import { UI } from '../i18n/ui';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getTurnstileToken } from '../lib/turnstile';
import {
  loadSmartApplyDeepProfile,
  saveSmartApplyDeepProfile,
  saveSmartApplySession,
  upsertProfile,
} from '../services/accountService';

let messageSeq = 0;
const nextMessageId = () => `msg_${String(++messageSeq).padStart(3, '0')}`;

const newSessionId = () => `sa_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Persist the chosen conversation language so a refresh never resets it.
const SESSION_MEMORY_KEY = 'acca_smart_apply_session_v1';
const MAX_HISTORY_ENTRIES = 60;
const SUPPORTED_LANGS = new Set(SHARED_SUPPORTED_LANGS);
let skipNextBrowserWrite = false;
let persistenceTimer = null;

const loadSavedLanguage = () => {
  if (typeof window === 'undefined') return null;
  try {
    const v = readStoredLang({ fallback: null });
    return SUPPORTED_LANGS.has(v) ? v : null;
  } catch {
    return null;
  }
};
const saveSavedLanguage = (lang) => {
  const normalized = normalizeLang(lang, null);
  if (typeof window === 'undefined' || !normalized || !SUPPORTED_LANGS.has(normalized)) return;
  try {
    writeStoredLang(normalized);
  } catch {
    /* private mode / quota — non-fatal */
  }
};

const defaultStudentProfile = () => ({
  name: null,
  degree: null,
  country: null,
  gpa: null,
  budget: null,
  preferredLanguage: null,
  knownMajor: null,
  interests: [],
  scores: null,
});

const cloneData = (value) => JSON.parse(JSON.stringify(value));

const loadBrowserMemory = () => {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SESSION_MEMORY_KEY) || 'null');
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.state?.messages)) return null;
    return parsed.state || null;
  } catch {
    return null;
  }
};

const clearBrowserMemory = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_MEMORY_KEY);
  } catch {
    /* private mode / quota — non-fatal */
  }
};

const persistentState = (state) => ({
  sessionId: state.sessionId,
  language: state.language,
  currentIntent: state.currentIntent,
  currentStep: state.currentStep,
  messages: state.messages,
  studentProfile: state.studentProfile,
  suggestedActions: state.suggestedActions,
  recommendedMajors: state.recommendedMajors,
  discoveryAnswers: state.discoveryAnswers,
  discoveryResult: state.discoveryResult,
  deepFitAnswers: state.deepFitAnswers,
  deepFitAdaptiveIds: state.deepFitAdaptiveIds,
  deepFitResult: state.deepFitResult,
  deepFitStatus: state.deepFitStatus,
  directionPrograms: state.directionPrograms,
  goal: state.goal,
  pendingOptionConfirmation: state.pendingOptionConfirmation,
  navigationHistory: state.navigationHistory,
});

const saveBrowserMemory = (state) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_MEMORY_KEY, JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      state: persistentState(state),
    }));
  } catch {
    /* Browser storage is best-effort; the active session continues in memory. */
  }
};

const initialState = ({ restore = true } = {}) => {
  const base = {
    sessionId: newSessionId(),
    language: restore ? (loadSavedLanguage() || 'fa') : 'fa',
    currentIntent: INTENTS.BOOT,
    currentStep: 'boot',
    messages: [],
    studentProfile: defaultStudentProfile(),
    suggestedActions: [],
    recommendedMajors: [],
    discoveryAnswers: [],
    discoveryResult: null,
    deepFitAnswers: [],
    deepFitAdaptiveIds: [],
    deepFitResult: null,
    deepFitStatus: 'locked',
    pendingDeepFitStart: false,
    directionPrograms: [],
    goal: null,
    pendingOptionConfirmation: null,
    navigationHistory: [],
    isLoginGateOpen: false,
    isDashboardOpen: false,
    isAuthenticated: false,
    // Real auth (Supabase) — unused in the pure-mock demo.
    user: null,
    authStage: 'idle', // idle | code_sent
    authBusy: false,
    authError: null,
    authEmail: null,
    authInited: false,
    voiceMode: false,
    isListening: false,
    isAssistantSpeaking: false,
    assistantStatus: 'idle', // idle | thinking | typing
    voiceNotice: false,
    booted: false,
  };

  const stored = restore ? loadBrowserMemory() : null;
  if (!stored) return base;

  const restoredMessages = Array.isArray(stored.messages) ? stored.messages : [];
  const highestMessageId = restoredMessages.reduce((highest, message) => {
    const numericId = Number.parseInt(String(message?.id || '').replace(/\D/g, ''), 10);
    return Number.isFinite(numericId) ? Math.max(highest, numericId) : highest;
  }, 0);
  messageSeq = Math.max(messageSeq, highestMessageId, restoredMessages.length);

  return {
    ...base,
    ...stored,
    language: SUPPORTED_LANGS.has(stored.language) ? stored.language : base.language,
    messages: restoredMessages,
    studentProfile: { ...defaultStudentProfile(), ...(stored.studentProfile || {}) },
    suggestedActions: Array.isArray(stored.suggestedActions) ? stored.suggestedActions : [],
    recommendedMajors: Array.isArray(stored.recommendedMajors) ? stored.recommendedMajors : [],
    discoveryAnswers: Array.isArray(stored.discoveryAnswers) ? stored.discoveryAnswers : [],
    deepFitAnswers: Array.isArray(stored.deepFitAnswers) ? stored.deepFitAnswers : [],
    deepFitAdaptiveIds: Array.isArray(stored.deepFitAdaptiveIds) ? stored.deepFitAdaptiveIds : [],
    deepFitResult: stored.deepFitResult || null,
    deepFitStatus: stored.deepFitStatus || 'locked',
    directionPrograms: Array.isArray(stored.directionPrograms) ? stored.directionPrograms : [],
    navigationHistory: Array.isArray(stored.navigationHistory) ? stored.navigationHistory : [],
    assistantStatus: 'idle',
    voiceMode: false,
    isListening: false,
    isAssistantSpeaking: false,
    voiceNotice: false,
    booted: false,
  };
};

const captureNavigationSnapshot = (state) => ({
  messagesLength: state.messages.length,
  language: state.language,
  currentIntent: state.currentIntent,
  currentStep: state.currentStep,
  studentProfile: cloneData(state.studentProfile),
  suggestedActions: cloneData(state.suggestedActions),
  recommendedMajors: cloneData(state.recommendedMajors),
  discoveryAnswers: cloneData(state.discoveryAnswers),
  discoveryResult: cloneData(state.discoveryResult),
  deepFitAnswers: cloneData(state.deepFitAnswers),
  deepFitAdaptiveIds: cloneData(state.deepFitAdaptiveIds),
  deepFitResult: cloneData(state.deepFitResult),
  deepFitStatus: state.deepFitStatus,
  directionPrograms: cloneData(state.directionPrograms),
  goal: state.goal,
  pendingOptionConfirmation: cloneData(state.pendingOptionConfirmation),
});

export const useSmartApplyStore = create((set, get) => {
  /** Appends one chat message (assigning its id). */
  const pushMessage = (msg) => {
    const withId = { ...msg, id: nextMessageId(), at: Date.now() };
    set((s) => ({ messages: [...s.messages, withId] }));
    return withId;
  };

  /** Core sequencer shared by button taps and free text. */
  const runExchange = async (produce, { echoLabel, echoMeta = null, remember = false } = {}) => {
    if (get().assistantStatus !== 'idle') return;

    const previousHistory = get().navigationHistory;
    set({
      navigationHistory: remember
        ? [
          ...previousHistory,
          captureNavigationSnapshot(get()),
        ].slice(-MAX_HISTORY_ENTRIES)
        : previousHistory,
      suggestedActions: [],
      assistantStatus: 'thinking',
      isAssistantSpeaking: true,
    });

    if (echoLabel) {
      pushMessage({
        role: 'user',
        content: echoLabel,
        lang: get().language,
        ...(echoMeta ? { meta: echoMeta } : {}),
      });
    }

    let result;
    try {
      result = await produce(get());
    } catch {
      // Mock layer should never throw, but never strand the composer.
      set({
        assistantStatus: 'idle',
        isAssistantSpeaking: false,
        ...(remember ? { navigationHistory: previousHistory } : {}),
      });
      return;
    }

    const messages = result?.messages || [];
    let lastDelivered = null;
    for (let i = 0; i < messages.length; i += 1) {
      set({ assistantStatus: 'typing' });
      await delay(typingDelayFor(messages[i], i));
      lastDelivered = pushMessage(messages[i]);
    }

    const patch = result?.patch || {};
    set((s) => ({
      ...patch,
      studentProfile: { ...s.studentProfile, ...(patch.studentProfile || {}) },
      assistantStatus: 'idle',
      isAssistantSpeaking: false,
      suggestedActions: lastDelivered?.actions || [],
    }));
    if (patch.language) saveSavedLanguage(patch.language); // remember across refresh

    if (result?.effect === 'whatsapp') {
      window.open(WHATSAPP_URL, '_blank', 'noopener');
    }
    if (result?.effect === 'open_dashboard') {
      await delay(700);
      set({ isDashboardOpen: true });
    }
    scheduleSignedInPersistence();
  };

  /** Save the signed-in student's profile + discovery result to Supabase. */
  const persistSession = async () => {
    const s = get();
    if (!supabase || !s.user) return;
    try {
      await upsertProfile(s.user, 'smart_apply', {
        fullName: s.studentProfile?.name || null,
        language: s.language,
      });
      await saveSmartApplySession(s.user, s);
      if (s.deepFitStatus !== 'locked' || s.deepFitAnswers?.length || s.deepFitResult) {
        await saveSmartApplyDeepProfile(s.user, s);
      }
    } catch {
      /* best-effort; never block the UI on persistence */
    }
  };

  const scheduleSignedInPersistence = () => {
    if (!get().user || !supabase) return;
    if (persistenceTimer) window.clearTimeout(persistenceTimer);
    persistenceTimer = window.setTimeout(() => {
      persistenceTimer = null;
      persistSession();
    }, 450);
  };

  const hydrateDeepProfile = async (user) => {
    if (!user?.id || !supabase) return;
    try {
      const remote = await loadSmartApplyDeepProfile(user.id);
      if (!remote) return;
      const localCount = get().deepFitAnswers?.length || 0;
      const remoteAnswers = Array.isArray(remote.answers) ? remote.answers : [];
      const remoteWins = remote.status === 'completed' || remoteAnswers.length > localCount;
      if (!remoteWins) return;
      set({
        deepFitAnswers: remoteAnswers,
        deepFitAdaptiveIds: Array.isArray(remote.adaptive_question_ids)
          ? remote.adaptive_question_ids
          : [],
        deepFitResult: remote.result || null,
        deepFitStatus: remote.status || 'in_progress',
      });
    } catch {
      /* The local memory remains usable while the remote profile is unavailable. */
    }
  };

  const startDeepFit = async () => {
    if (!get().isAuthenticated || !get().user) {
      set({ isLoginGateOpen: true, pendingDeepFitStart: true });
      return;
    }
    await hydrateDeepProfile(get().user);
    set({ pendingDeepFitStart: false, isDashboardOpen: false });
    await runExchange(
      (state) => sendIntent(INTENTS.DEEP_FIT_START, null, state),
      { remember: true },
    );
  };

  return {
    ...initialState(),

    boot: () => {
      if (get().booted) return;
      set({ booted: true });
      get().initAuth();
      if (get().messages.length > 0) return;
      // If the student already picked a language before, resume in it and skip
      // the language question entirely (refresh must not reset the language).
      const savedLang = loadSavedLanguage();
      if (savedLang) {
        set({ language: savedLang });
        runExchange((state) => sendIntent(INTENTS.SET_LANGUAGE, savedLang, state));
      } else {
        runExchange((state) => sendIntent(INTENTS.BOOT, null, state));
      }
    },

    /** Wire up real Supabase auth when configured (no-op in the mock demo). */
    initAuth: async () => {
      if (get().authInited) return;
      if (!isSupabaseConfigured) {
        set({ authInited: true });
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          set({ isAuthenticated: true, user: data.session.user });
          await hydrateDeepProfile(data.session.user);
        }
        supabase.auth.onAuthStateChange((_event, session) => {
          set({ isAuthenticated: !!session?.user, user: session?.user ?? null });
          if (session?.user) {
            hydrateDeepProfile(session.user).finally(() => persistSession());
          }
        });
      } catch {
        /* offline / misconfigured — stay in guest mode */
      } finally {
        // Query-string actions must wait until the existing session check is done.
        set({ authInited: true });
      }
    },

    /** Email the student a one-time login code. */
    sendAuthCode: async (email) => {
      const clean = String(email || '').trim();
      if (!clean || !supabase) return;
      set({ authBusy: true, authError: null, authEmail: clean });
      try {
        const captchaToken = await getTurnstileToken('smart_apply_login');
        const { error } = await supabase.auth.signInWithOtp({
          email: clean,
          options: {
            shouldCreateUser: true,
            ...(captchaToken ? { captchaToken } : {}),
          },
        });
        if (error) set({ authBusy: false, authError: error.message || true });
        else set({ authBusy: false, authStage: 'code_sent' });
      } catch {
        set({ authBusy: false, authError: true });
      }
    },

    /** Verify the emailed code, then persist + open the dashboard. */
    verifyAuthCode: async (code) => {
      const token = String(code || '').trim();
      if (!token || !supabase) return;
      set({ authBusy: true, authError: null });
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: get().authEmail,
          token,
          type: 'email',
        });
        if (error) {
          set({ authBusy: false, authError: error.message || true });
          return;
        }
        const shouldStartDeepFit = get().pendingDeepFitStart;
        set({
          authBusy: false,
          isAuthenticated: true,
          user: data.user,
          authStage: 'idle',
          isLoginGateOpen: false,
        });
        await hydrateDeepProfile(data.user);
        pushMessage({ role: 'assistant', lang: get().language, content: L(UI.realWelcome, get().language) });
        set({ suggestedActions: [] });
        await persistSession();
        await delay(500);
        if (shouldStartDeepFit) startDeepFit();
        else set({ isDashboardOpen: true });
      } catch {
        set({ authBusy: false, authError: true });
      }
    },

    resetAuth: () => set({ authStage: 'idle', authError: null }),

    signOutReal: async () => {
      if (supabase) {
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
      }
      set({ isAuthenticated: false, user: null, isDashboardOpen: false });
    },

    /** Student taps a dynamic action button. */
    chooseAction: (action) => {
      if (action.nextIntent === INTENTS.DEEP_FIT_START) {
        startDeepFit();
        return;
      }
      // Gate/dashboard opens are local UI state — no AI round-trip, no echo.
      if (action.nextIntent === INTENTS.OPEN_LOGIN_GATE) {
        set({ isLoginGateOpen: true });
        return;
      }
      if (action.nextIntent === INTENTS.OPEN_DASHBOARD) {
        set({ isDashboardOpen: true });
        return;
      }
      if (action.nextIntent === INTENTS.OPEN_ACCOUNT) {
        window.location.assign('/account');
        return;
      }
      runExchange(
        (state) => sendIntent(action.nextIntent, action.value, state),
        { echoLabel: action.label, remember: true },
      );
    },

    /** Student submits free text from the composer. */
    submitFreeText: (text, options = {}) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;
      const echoMeta = options.source === 'voice'
        ? {
          voice: true,
          voiceSourceId: options.sourceId || `voice_${Date.now()}`,
        }
        : null;
      runExchange(
        (state) => sendText(trimmed, state, options),
        { echoLabel: trimmed, echoMeta, remember: true },
      );
    },

    goBack: () => {
      if (get().assistantStatus !== 'idle') return;
      const history = get().navigationHistory;
      const previous = history[history.length - 1];
      if (!previous) return;

      set((state) => ({
        language: previous.language,
        currentIntent: previous.currentIntent,
        currentStep: previous.currentStep,
        messages: state.messages.slice(0, previous.messagesLength),
        studentProfile: cloneData(previous.studentProfile),
        suggestedActions: cloneData(previous.suggestedActions),
        recommendedMajors: cloneData(previous.recommendedMajors),
        discoveryAnswers: cloneData(previous.discoveryAnswers),
        discoveryResult: cloneData(previous.discoveryResult),
        deepFitAnswers: cloneData(previous.deepFitAnswers),
        deepFitAdaptiveIds: cloneData(previous.deepFitAdaptiveIds),
        deepFitResult: cloneData(previous.deepFitResult),
        deepFitStatus: previous.deepFitStatus,
        directionPrograms: cloneData(previous.directionPrograms),
        goal: previous.goal,
        pendingOptionConfirmation: cloneData(previous.pendingOptionConfirmation),
        navigationHistory: history.slice(0, -1),
        assistantStatus: 'idle',
        isAssistantSpeaking: false,
        isListening: false,
      }));
      saveSavedLanguage(previous.language);
      scheduleSignedInPersistence();
    },

    setVoiceActivity: ({ listening = false, speaking = false }) => {
      set({
        voiceMode: listening || speaking,
        isListening: listening,
        isAssistantSpeaking: speaking,
        voiceNotice: false,
      });
    },

    appendVoiceTranscript: (role, content, sourceId) => {
      const text = String(content || '').trim();
      if (!text || (role !== 'user' && role !== 'assistant')) return;
      const duplicate = get().messages.some((message) => message.meta?.voiceSourceId === sourceId);
      if (duplicate) return;
      pushMessage({
        role,
        content: text,
        lang: get().language,
        meta: { voice: true, voiceSourceId: sourceId },
      });
      set({ suggestedActions: [] });
    },

    openLoginGate: () => set({ isLoginGateOpen: true }),
    closeLoginGate: () => set({ isLoginGateOpen: false }),

    /** Demo sign-in: no real auth — flows through the mock engine. */
    mockLogin: () => {
      set({ isLoginGateOpen: false });
      runExchange((state) => sendIntent(INTENTS.LOGIN_MOCK, null, state));
    },

    continueAsGuest: () => {
      set({ isLoginGateOpen: false });
      runExchange((state) => sendIntent(INTENTS.CONTINUE_GUEST, null, state));
    },

    talkToCounselor: () => {
      set({ isLoginGateOpen: false });
      runExchange((state) => sendIntent(INTENTS.TALK_TO_COUNSELOR, null, state));
    },

    openDashboard: () => set({ isDashboardOpen: true }),
    closeDashboard: () => set({ isDashboardOpen: false }),
    startDeepFit,

    clearSessionMemory: () => {
      const authState = {
        isAuthenticated: get().isAuthenticated,
        user: get().user,
        authInited: get().authInited,
      };
      skipNextBrowserWrite = true;
      clearBrowserMemory();
      set({ ...initialState({ restore: false }), ...authState, booted: true });
      runExchange((state) => sendIntent(INTENTS.BOOT, null, state));
    },
  };
});

useSmartApplyStore.subscribe((state) => {
  if (skipNextBrowserWrite) {
    skipNextBrowserWrite = false;
    return;
  }
  if (state.assistantStatus !== 'idle' || state.isAssistantSpeaking) return;
  saveBrowserMemory(state);
});

/** Profile completion 0–100 for the insight panel progress ring. */
export function profileProgress(state) {
  const p = state.studentProfile;
  const checks = [
    state.language && state.goal,
    p.degree,
    p.country,
    p.gpa,
    p.budget,
    (p.interests || []).length > 0 || p.knownMajor,
    state.discoveryResult || state.directionPrograms.length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

/** Guided-session progress shown in the central assistant header. */
export function sessionProgress(state) {
  const p = state.studentProfile;

  if (state.deepFitResult || state.deepFitStatus === 'completed') return 100;
  if (state.deepFitStatus === 'in_progress' || String(state.currentStep || '').startsWith('deep_fit_')) {
    return Math.min(98, Math.round(((state.deepFitAnswers?.length || 0) / 56) * 100));
  }

  if (!p.preferredLanguage) return 5;
  if (!state.goal) return 15;

  if (state.goal === 'unknown_major') {
    if (state.discoveryResult) return 100;
    return Math.min(92, 25 + Math.round(((state.discoveryAnswers?.length || 0) / 25) * 65));
  }

  if (state.goal === 'questions') {
    return state.currentStep?.startsWith('faq_') ? 70 : 35;
  }

  const milestones = [
    p.knownMajor || (p.interests || []).length > 0,
    p.degree,
    p.country,
    p.gpa,
    p.budget,
    state.directionPrograms.length > 0,
  ];
  return Math.min(100, 25 + milestones.filter(Boolean).length * 12.5);
}
