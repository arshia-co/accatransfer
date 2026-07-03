import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, Mic, MicOff, PhoneOff, RotateCcw, ShieldCheck } from 'lucide-react';
import { L, dirFor } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { startRealtimeVoiceSession } from '../../services/realtimeVoiceService';
import AIAssistantOrb from './AIAssistantOrb';

const STUDENT_SPEECH_GRACE_MS = 2200;
const ASSISTANT_SCRIPT_SETTLE_MS = 260;

const VOICE_ADVANCING_COPY = {
  fa: 'دستیار آکا در حال خواندن مرحله بعد است؛ لطفاً صبر کنید.',
  en: 'ACCA is reading the next step. Please wait a moment.',
  tr: 'ACCA bir sonraki adımı okuyor. Lütfen kısa bir an bekleyin.',
  ar: 'يقوم مساعد ACCA بقراءة الخطوة التالية. يرجى الانتظار قليلًا.',
};

function phaseCopy(phase, lang) {
  if (phase === 'advancing') return L(VOICE_ADVANCING_COPY, lang);
  const key = {
    connecting: 'voiceConnecting',
    ready: 'voiceReady',
    listening: 'voiceListeningLive',
    thinking: 'voiceThinking',
    speaking: 'voiceSpeaking',
    muted: 'voiceMuted',
    error: 'voiceError',
  }[phase] || 'voiceReady';
  return L(UI[key], lang);
}

function transcriptLabel(role, lang) {
  return role === 'user' ? L(UI.voiceStudentLabel, lang) : L(UI.voiceAssistantLabel, lang);
}

function pickNextAssistantScript(scripts) {
  return [...scripts].reverse().find((script) => script?.hasActions)
    || scripts[scripts.length - 1]
    || null;
}

export default function VoiceConversationOverlay({
  open,
  lang,
  sessionId,
  context,
  initialScript,
  assistantScripts = [],
  assistantBusy = false,
  voiceId,
  inputDeviceId,
  outputDeviceId,
  autoReadNextStep = true,
  onStudentSpeech,
  onActivity,
  onClose,
}) {
  const voiceSession = useRef(null);
  const assistantScriptsRef = useRef(assistantScripts);
  const assistantPlayback = useRef(false);
  const mutedRef = useRef(true);
  const acceptingSpeechRef = useRef(false);
  const spokenAssistantIds = useRef(new Set());
  const deliveredStudentIds = useRef(new Set());
  const pendingStudentTextRef = useRef('');
  const interimStudentTextRef = useRef('');
  const pendingStudentSourceIdsRef = useRef([]);
  const studentFlushTimerRef = useRef(null);
  const assistantScriptTimerRef = useRef(null);
  const flushStudentSpeechRef = useRef(null);
  const [phase, setPhase] = useState('connecting');
  const [caption, setCaption] = useState('');
  const [muted, setMuted] = useState(true);
  const [errorCode, setErrorCode] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [sessionReadyTick, setSessionReadyTick] = useState(0);
  const [userCaption, setUserCaption] = useState('');
  const currentScriptTextRef = useRef('');

  useEffect(() => {
    assistantScriptsRef.current = assistantScripts;
  }, [assistantScripts]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    assistantPlayback.current = false;
    mutedRef.current = true;
    acceptingSpeechRef.current = false;
    deliveredStudentIds.current = new Set();
    spokenAssistantIds.current = new Set(
      assistantScriptsRef.current.map((script) => script?.id).filter(Boolean),
    );

    const clearStudentFlushTimer = () => {
      if (studentFlushTimerRef.current) {
        window.clearTimeout(studentFlushTimerRef.current);
        studentFlushTimerRef.current = null;
      }
    };

    const renderStudentCaption = () => {
      const text = [
        pendingStudentTextRef.current,
        interimStudentTextRef.current,
      ].filter(Boolean).join(' ').trim();
      setUserCaption(text);
    };

    const setMicrophoneMuted = (nextMuted, nextPhase) => {
      mutedRef.current = nextMuted;
      acceptingSpeechRef.current = false;
      setMuted(nextMuted);
      voiceSession.current?.setMuted(nextMuted);
      if (nextPhase) setPhase(nextPhase);
    };

    const handleStudentSpeech = (text, id) => {
      const clean = String(text || '').trim();
      const deliveryId = id || clean;
      if (!clean || deliveredStudentIds.current.has(deliveryId)) return;
      deliveredStudentIds.current.add(deliveryId);
      onStudentSpeech?.(clean, deliveryId);
    };

    const flushStudentSpeech = ({ nextPhase = 'thinking' } = {}) => {
      clearStudentFlushTimer();
      const clean = pendingStudentTextRef.current.trim();
      pendingStudentTextRef.current = '';
      interimStudentTextRef.current = '';
      const sourceIds = pendingStudentSourceIdsRef.current.filter(Boolean);
      pendingStudentSourceIdsRef.current = [];
      if (!clean) {
        setMicrophoneMuted(true, 'muted');
        return false;
      }
      setUserCaption(clean);
      handleStudentSpeech(
        clean,
        sourceIds.length ? sourceIds.join('|') : `voice_${Date.now()}`,
      );
      setMicrophoneMuted(true, nextPhase);
      return true;
    };

    const scheduleStudentFlush = () => {
      clearStudentFlushTimer();
      studentFlushTimerRef.current = window.setTimeout(() => {
        flushStudentSpeech();
      }, STUDENT_SPEECH_GRACE_MS);
    };

    flushStudentSpeechRef.current = flushStudentSpeech;

    const handleEvent = (event) => {
      if (cancelled) return;
      switch (event.type) {
        case 'session.created':
        case 'session.updated':
          setPhase(mutedRef.current ? 'muted' : 'ready');
          break;
        case 'client.script_started':
          if (event.scriptId) spokenAssistantIds.current.add(event.scriptId);
          currentScriptTextRef.current = String(event.script || '').trim();
          setCaption(currentScriptTextRef.current);
          setPhase('speaking');
          break;
        case 'input_audio_buffer.speech_started':
          if (mutedRef.current || assistantPlayback.current) {
            acceptingSpeechRef.current = false;
            break;
          }
          currentScriptTextRef.current = '';
          acceptingSpeechRef.current = true;
          clearStudentFlushTimer();
          interimStudentTextRef.current = '';
          renderStudentCaption();
          setPhase('listening');
          break;
        case 'input_audio_buffer.speech_stopped':
          setPhase(acceptingSpeechRef.current ? 'thinking' : (mutedRef.current ? 'muted' : 'ready'));
          break;
        case 'conversation.item.input_audio_transcription.completed': {
          const transcript = String(event.transcript || '').trim();
          const shouldAccept = acceptingSpeechRef.current && !assistantPlayback.current && !mutedRef.current;
          acceptingSpeechRef.current = false;
          if (!shouldAccept) {
            setPhase(mutedRef.current ? 'muted' : 'ready');
            break;
          }
          if (transcript) {
            pendingStudentTextRef.current = [
              pendingStudentTextRef.current,
              transcript,
            ].filter(Boolean).join(' ').trim();
            pendingStudentSourceIdsRef.current.push(event.item_id || `voice_${Date.now()}`);
            interimStudentTextRef.current = '';
            renderStudentCaption();
            scheduleStudentFlush();
            setPhase('ready');
          } else {
            setPhase('ready');
          }
          break;
        }
        case 'conversation.item.input_audio_transcription.delta':
          if (acceptingSpeechRef.current && !assistantPlayback.current && !mutedRef.current) {
            interimStudentTextRef.current = `${interimStudentTextRef.current}${event.delta || ''}`;
            renderStudentCaption();
          }
          break;
        case 'conversation.item.input_audio_transcription.failed':
          interimStudentTextRef.current = '';
          renderStudentCaption();
          setPhase(pendingStudentTextRef.current ? 'ready' : 'muted');
          break;
        case 'response.created':
          assistantPlayback.current = true;
          setMicrophoneMuted(true);
          if (!currentScriptTextRef.current) setCaption('');
          setPhase('thinking');
          break;
        case 'output_audio_buffer.started':
          assistantPlayback.current = true;
          setMicrophoneMuted(true);
          setPhase('speaking');
          break;
        case 'response.output_audio_transcript.delta':
          setPhase('speaking');
          if (!currentScriptTextRef.current) {
            setCaption((current) => `${current}${event.delta || ''}`);
          }
          break;
        case 'response.output_audio_transcript.done': {
          const transcript = String(event.transcript || '').trim();
          if (!currentScriptTextRef.current) {
            setCaption(transcript);
          }
          break;
        }
        case 'response.done':
          if (event.response?.status !== 'completed') {
            assistantPlayback.current = false;
            currentScriptTextRef.current = '';
            setPhase('muted');
          }
          break;
        case 'client.script_finished':
        case 'response.audio.done':
        case 'response.output_audio.done':
        case 'output_audio_buffer.stopped':
          assistantPlayback.current = false;
          currentScriptTextRef.current = '';
          setPhase('muted');
          break;
        case 'error':
          if (String(event.error?.code || event.error?.message || event.code || '').toLowerCase().includes('cancel')) {
            break;
          }
          setErrorCode('session_failed');
          setPhase('error');
          break;
        default:
          break;
      }
    };

    const beginSession = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setPhase('connecting');
      setCaption('');
      setUserCaption('');
      clearStudentFlushTimer();
      pendingStudentTextRef.current = '';
      interimStudentTextRef.current = '';
      pendingStudentSourceIdsRef.current = [];
      currentScriptTextRef.current = '';
      setMuted(true);
      mutedRef.current = true;
      acceptingSpeechRef.current = false;
      setErrorCode(null);
      setSessionReadyTick((value) => value + 1);

      try {
        const session = await startRealtimeVoiceSession({
          language: lang,
          sessionId,
          context,
          initialScript: initialScript?.text,
          voiceId,
          inputDeviceId,
          outputDeviceId,
          startMuted: true,
          onEvent: handleEvent,
          onConnectionChange: (state) => {
            if (cancelled) return;
            if (state === 'failed' || state === 'disconnected' || state === 'error') {
              setErrorCode('session_failed');
              setPhase('error');
            }
          },
        });
        if (cancelled) {
          session.close();
          return;
        }
        voiceSession.current = session;
        setSessionReadyTick((value) => value + 1);
      } catch (error) {
        if (cancelled) return;
        setErrorCode(error?.code || 'session_failed');
        setPhase('error');
      }
    };

    beginSession();

    return () => {
      cancelled = true;
      clearStudentFlushTimer();
      if (assistantScriptTimerRef.current) {
        window.clearTimeout(assistantScriptTimerRef.current);
        assistantScriptTimerRef.current = null;
      }
      flushStudentSpeechRef.current = null;
      currentScriptTextRef.current = '';
      voiceSession.current?.close();
      voiceSession.current = null;
      onActivity({ listening: false, speaking: false });
    };
  }, [open, attempt, lang, sessionId, context, initialScript, voiceId, inputDeviceId, outputDeviceId, onActivity, onStudentSpeech]);

  useEffect(() => {
    if (!open || !voiceSession.current || assistantBusy || !autoReadNextStep) return undefined;
    if (assistantScriptTimerRef.current) {
      window.clearTimeout(assistantScriptTimerRef.current);
      assistantScriptTimerRef.current = null;
    }

    assistantScriptTimerRef.current = window.setTimeout(() => {
      const unspoken = assistantScripts.filter(
        (script) => script?.id && script.text && !spokenAssistantIds.current.has(script.id),
      );
      if (!unspoken.length || !voiceSession.current) return;

      const script = pickNextAssistantScript(unspoken);
      if (!script?.text) return;

      mutedRef.current = true;
      acceptingSpeechRef.current = false;
      setMuted(true);
      voiceSession.current.setMuted(true);
      currentScriptTextRef.current = script.text;
      setCaption(script.text);
      setPhase('advancing');
      try {
        voiceSession.current.speak(script.text, { id: script.id, replace: true });
        unspoken
          .filter((item) => item.id !== script.id)
          .forEach((item) => spokenAssistantIds.current.add(item.id));
      } catch (error) {
        setErrorCode(error?.code || 'session_failed');
        setPhase('error');
      }
    }, ASSISTANT_SCRIPT_SETTLE_MS);

    return () => {
      if (assistantScriptTimerRef.current) {
        window.clearTimeout(assistantScriptTimerRef.current);
        assistantScriptTimerRef.current = null;
      }
    };
  }, [assistantScripts, assistantBusy, open, sessionReadyTick, autoReadNextStep]);

  useEffect(() => {
    onActivity({
      listening: phase === 'listening' || (phase === 'ready' && !muted),
      speaking: phase === 'speaking',
    });
  }, [phase, muted, onActivity]);

  const toggleMute = () => {
    const next = !muted;
    if (next && flushStudentSpeechRef.current?.({ nextPhase: 'thinking' })) return;
    mutedRef.current = next;
    acceptingSpeechRef.current = false;
    setMuted(next);
    voiceSession.current?.setMuted(next);
    currentScriptTextRef.current = '';
    if (!next) setUserCaption('');
    setPhase(next ? 'muted' : 'ready');
  };

  const retry = () => {
    voiceSession.current?.close();
    voiceSession.current = null;
    setAttempt((value) => value + 1);
  };

  const handleClose = () => {
    flushStudentSpeechRef.current?.({ nextPhase: 'thinking' });
    onClose();
  };

  const errorText = errorCode === 'permission_denied'
    ? L(UI.voicePermissionError, lang)
    : errorCode === 'unsupported'
      ? L(UI.voiceUnsupported, lang)
      : L(UI.voiceConnectionError, lang);
  const micHint = muted ? L(UI.voiceMicOffHint, lang) : L(UI.voiceMicOnHint, lang);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          dir={dirFor(lang)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/82 p-4 backdrop-blur-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={L(UI.voiceTitle, lang)}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative flex max-h-[92vh] min-h-[560px] w-full max-w-2xl flex-col overflow-y-auto rounded-[36px] border border-white/15 bg-[linear-gradient(155deg,rgba(255,255,255,0.13),rgba(255,255,255,0.045))] px-6 pb-6 pt-8 text-cream shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:px-10 sm:pb-8"
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute inset-x-10 top-0 h-52 rounded-full bg-emerald-400/15 blur-[80px]" />
              <div className="absolute bottom-0 end-0 h-72 w-72 rounded-full bg-gold/15 blur-[90px]" />
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.35) 1px, transparent 1px)',
                  backgroundSize: '28px 28px',
                  maskImage: 'linear-gradient(to bottom, black, transparent 80%)',
                }}
              />
            </div>

            <div className="relative text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">
                {L(UI.voiceEyebrow, lang)}
              </p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">{L(UI.voiceTitle, lang)}</h2>
              <p className="mx-auto mt-2 max-w-sm text-xs font-semibold leading-6 text-cream/55">
                {L(UI.voiceSubtitle, lang)}
              </p>
            </div>

            <div className="relative flex flex-1 flex-col items-center justify-start py-7">
              <div className="relative">
                <AIAssistantOrb
                  size="lg"
                  listening={phase === 'listening' || (phase === 'ready' && !muted)}
                  status={phase === 'speaking' ? 'typing' : (phase === 'thinking' || phase === 'advancing') ? 'thinking' : 'idle'}
                />
                {(phase === 'connecting' || phase === 'thinking' || phase === 'advancing') && (
                  <LoaderCircle className="absolute -end-2 -top-2 h-7 w-7 animate-spin rounded-full bg-navy p-1.5 text-gold" />
                )}
              </div>

              <motion.p
                key={phase}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-5 text-center text-sm font-black leading-6 text-cream"
              >
                {phaseCopy(phase, lang)}
              </motion.p>

              <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black ${
                !muted && phase !== 'speaking' && phase !== 'advancing'
                  ? 'border-emerald-300/35 bg-emerald-400/15 text-emerald-100'
                  : 'border-white/10 bg-white/[0.08] text-cream/55'
              }`}>
                <span className={`h-2 w-2 rounded-full ${!muted && phase !== 'speaking' && phase !== 'advancing' ? 'animate-pulse bg-emerald-300' : 'bg-cream/35'}`} />
                {micHint}
              </div>

              <div className="mt-5 w-full max-w-xl space-y-3">
                <div className="min-h-24 rounded-[24px] border border-white/10 bg-black/10 px-5 py-4 text-start backdrop-blur-md">
                  <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-gold/80">
                    {transcriptLabel('assistant', lang)}
                  </div>
                {phase === 'error' ? (
                  <p className="text-sm font-bold leading-7 text-rose-100">{errorText}</p>
                ) : (
                  <p className="whitespace-pre-line text-sm font-semibold leading-7 text-cream/75">
                    {caption || L(UI.voiceStartHint, lang)}
                  </p>
                )}
                </div>

                <div className={`min-h-20 rounded-[24px] border px-5 py-4 text-start backdrop-blur-md ${
                  !muted && phase !== 'speaking' && phase !== 'advancing'
                    ? 'border-emerald-300/25 bg-emerald-300/10'
                    : 'border-white/10 bg-white/[0.055]'
                }`}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/75">
                      {transcriptLabel('user', lang)}
                    </span>
                    {!muted && phase !== 'speaking' && phase !== 'advancing' && (
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-emerald-100/70">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                        {L(UI.voiceListeningLive, lang)}
                      </span>
                    )}
                  </div>
                  <p className="min-h-6 whitespace-pre-line break-words text-sm font-semibold leading-7 text-emerald-50/85">
                    {userCaption || (
                      !muted && phase !== 'speaking' && phase !== 'advancing'
                        ? L(UI.voiceMicOnHint, lang)
                        : L(UI.voiceMicOffHint, lang)
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex items-start justify-center gap-4">
              {phase === 'error' ? (
                <button
                  type="button"
                  onClick={retry}
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-white px-6 text-sm font-black text-navy transition hover:bg-cream"
                >
                  <RotateCcw className="h-4 w-4" />
                  {L(UI.voiceRetry, lang)}
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    disabled={phase === 'connecting' || phase === 'speaking' || phase === 'thinking' || phase === 'advancing'}
                    className={`flex h-16 w-16 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      muted
                        ? 'border-emerald-300/35 bg-emerald-400/16 text-emerald-100 hover:bg-emerald-400/22'
                        : 'border-emerald-200/65 bg-emerald-400/28 text-white shadow-[0_0_0_9px_rgba(52,211,153,0.10)]'
                    }`}
                    aria-label={muted ? L(UI.voiceUnmute, lang) : L(UI.voiceMute, lang)}
                  >
                    {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </button>
                  <span className="max-w-28 text-center text-[10px] font-black leading-4 text-cream/55">
                    {muted ? L(UI.voiceUnmute, lang) : L(UI.voiceMute, lang)}
                  </span>
                </div>
              )}

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-[0_14px_34px_rgba(244,63,94,0.32)] transition hover:bg-rose-600"
                  aria-label={L(UI.voiceEnd, lang)}
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
                <span className="max-w-28 text-center text-[10px] font-black leading-4 text-cream/55">
                  {L(UI.voiceEnd, lang)}
                </span>
              </div>
            </div>

            <p className="relative mt-5 flex items-center justify-center gap-2 text-center text-[10px] font-semibold leading-5 text-cream/40">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300/70" />
              {L(UI.voiceDisclosure, lang)}
            </p>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
