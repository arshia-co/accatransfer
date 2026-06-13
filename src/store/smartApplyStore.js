// Smart Apply session store (Zustand).
// Owns the conversation state and orchestrates the mock AI provider:
// user action → echo bubble → thinking → typed assistant messages → patch.
// All conversation CONTENT comes from src/ai — the store only sequences it.
import { create } from 'zustand';
import { INTENTS } from '../ai/intents';
import { sendIntent, sendText, typingDelayFor, delay } from '../ai/mockAIProvider';
import { WHATSAPP_URL } from '../lib/constants';
import { L } from '../lib/lang';
import { UI } from '../i18n/ui';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { saveSmartApplySession, upsertProfile } from '../services/accountService';

let messageSeq = 0;
const nextMessageId = () => `msg_${String(++messageSeq).padStart(3, '0')}`;

const newSessionId = () => `sa_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const initialState = () => ({
  sessionId: newSessionId(),
  language: 'fa',
  currentIntent: INTENTS.BOOT,
  currentStep: 'boot',
  messages: [],
  studentProfile: {
    name: null,
    degree: null,
    country: null,
    gpa: null,
    budget: null,
    preferredLanguage: null,
    knownMajor: null,
    interests: [],
    scores: null,
  },
  suggestedActions: [],
  recommendedMajors: [],
  discoveryAnswers: [],
  discoveryResult: null,
  directionPrograms: [],
  goal: null,
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
});

export const useSmartApplyStore = create((set, get) => {
  /** Appends one chat message (assigning its id). */
  const pushMessage = (msg) => {
    const withId = { ...msg, id: nextMessageId(), at: Date.now() };
    set((s) => ({ messages: [...s.messages, withId] }));
    return withId;
  };

  /** Core sequencer shared by button taps and free text. */
  const runExchange = async (produce, { echoLabel } = {}) => {
    if (get().assistantStatus !== 'idle') return;

    if (echoLabel) {
      pushMessage({ role: 'user', content: echoLabel, lang: get().language });
    }
    set({ suggestedActions: [], assistantStatus: 'thinking', isAssistantSpeaking: true });

    let result;
    try {
      result = await produce(get());
    } catch {
      // Mock layer should never throw, but never strand the composer.
      set({ assistantStatus: 'idle', isAssistantSpeaking: false });
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

    if (result?.effect === 'whatsapp') {
      window.open(WHATSAPP_URL, '_blank', 'noopener');
    }
    if (result?.effect === 'open_dashboard') {
      await delay(700);
      set({ isDashboardOpen: true });
    }
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
    } catch {
      /* best-effort; never block the UI on persistence */
    }
  };

  return {
    ...initialState(),

    boot: () => {
      if (get().booted) return;
      set({ booted: true });
      get().initAuth();
      runExchange((state) => sendIntent(INTENTS.BOOT, null, state));
    },

    /** Wire up real Supabase auth when configured (no-op in the mock demo). */
    initAuth: async () => {
      if (!isSupabaseConfigured || get().authInited) return;
      set({ authInited: true });
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) set({ isAuthenticated: true, user: data.session.user });
        supabase.auth.onAuthStateChange((_event, session) => {
          set({ isAuthenticated: !!session?.user, user: session?.user ?? null });
          if (session?.user) persistSession();
        });
      } catch {
        /* offline / misconfigured — stay in guest mode */
      }
    },

    /** Email the student a one-time login code. */
    sendAuthCode: async (email) => {
      const clean = String(email || '').trim();
      if (!clean || !supabase) return;
      set({ authBusy: true, authError: null, authEmail: clean });
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: clean,
          options: { shouldCreateUser: true },
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
        set({ authBusy: false, isAuthenticated: true, user: data.user, authStage: 'idle', isLoginGateOpen: false });
        pushMessage({ role: 'assistant', lang: get().language, content: L(UI.realWelcome, get().language) });
        set({ suggestedActions: [] });
        await persistSession();
        await delay(700);
        set({ isDashboardOpen: true });
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
      // Gate/dashboard opens are local UI state — no AI round-trip, no echo.
      if (action.nextIntent === INTENTS.OPEN_LOGIN_GATE) {
        set({ isLoginGateOpen: true });
        return;
      }
      if (action.nextIntent === INTENTS.OPEN_DASHBOARD) {
        set({ isDashboardOpen: true });
        return;
      }
      runExchange(
        (state) => sendIntent(action.nextIntent, action.value, state),
        { echoLabel: action.label },
      );
    },

    /** Student submits free text from the composer. */
    submitFreeText: (text) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;
      runExchange((state) => sendText(trimmed, state), { echoLabel: trimmed });
    },

    /** Voice button: animated listening state + honest placeholder note. */
    pressVoice: async () => {
      if (get().isListening) return;
      set({ voiceMode: true, isListening: true, voiceNotice: false });
      await delay(2300);
      set({ isListening: false, voiceNotice: true });
      await delay(4200);
      set({ voiceNotice: false });
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

    restart: () => {
      set({ ...initialState(), booted: true });
      runExchange((state) => sendIntent(INTENTS.BOOT, null, state));
    },
  };
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
