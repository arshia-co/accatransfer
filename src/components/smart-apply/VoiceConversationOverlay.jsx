import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, Mic, MicOff, PhoneOff, RotateCcw, ShieldCheck } from 'lucide-react';
import { L, dirFor } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import { startRealtimeVoiceSession } from '../../services/realtimeVoiceService';
import AIAssistantOrb from './AIAssistantOrb';

function phaseCopy(phase, lang) {
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

export default function VoiceConversationOverlay({
  open,
  lang,
  sessionId,
  context,
  onTranscript,
  onActivity,
  onClose,
}) {
  const voiceSession = useRef(null);
  const turn = useRef({ userAdded: false, pendingAssistant: null, pendingTimer: null });
  const assistantPlayback = useRef(false);
  const mutedRef = useRef(false);
  const deliveredIds = useRef(new Set());
  const [phase, setPhase] = useState('connecting');
  const [caption, setCaption] = useState('');
  const [muted, setMuted] = useState(false);
  const [errorCode, setErrorCode] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    turn.current = { userAdded: false, pendingAssistant: null, pendingTimer: null };
    assistantPlayback.current = false;
    mutedRef.current = false;
    deliveredIds.current = new Set();

    const deliver = (role, text, id) => {
      const clean = String(text || '').trim();
      const deliveryId = `${role}:${id || clean}`;
      if (!clean || deliveredIds.current.has(deliveryId)) return;
      deliveredIds.current.add(deliveryId);
      onTranscript(role, clean, deliveryId);
    };

    const flushAssistant = () => {
      const pending = turn.current.pendingAssistant;
      if (!pending) return;
      deliver('assistant', pending.text, pending.id);
      turn.current.pendingAssistant = null;
      if (turn.current.pendingTimer) clearTimeout(turn.current.pendingTimer);
      turn.current.pendingTimer = null;
    };

    const handleEvent = (event) => {
      if (cancelled) return;
      switch (event.type) {
        case 'session.created':
        case 'session.updated':
          setPhase('ready');
          break;
        case 'input_audio_buffer.speech_started':
          if (assistantPlayback.current) break;
          flushAssistant();
          if (turn.current.pendingTimer) {
            window.clearTimeout(turn.current.pendingTimer);
            turn.current.pendingTimer = null;
          }
          turn.current.userAdded = false;
          turn.current.pendingAssistant = null;
          setCaption('');
          setPhase('listening');
          break;
        case 'input_audio_buffer.speech_stopped':
          setPhase('thinking');
          break;
        case 'conversation.item.input_audio_transcription.completed':
          setCaption(event.transcript || '');
          deliver('user', event.transcript, event.item_id);
          turn.current.userAdded = true;
          flushAssistant();
          break;
        case 'response.created':
          assistantPlayback.current = true;
          setCaption('');
          setPhase('thinking');
          break;
        case 'output_audio_buffer.started':
          assistantPlayback.current = true;
          setPhase('speaking');
          break;
        case 'response.output_audio_transcript.delta':
          setPhase('speaking');
          setCaption((current) => `${current}${event.delta || ''}`);
          break;
        case 'response.output_audio_transcript.done': {
          const assistant = { text: event.transcript, id: event.item_id || event.response_id };
          setCaption(event.transcript || '');
          if (turn.current.userAdded) {
            deliver('assistant', assistant.text, assistant.id);
          } else {
            turn.current.pendingAssistant = assistant;
            turn.current.pendingTimer = setTimeout(flushAssistant, 1400);
          }
          break;
        }
        case 'response.done':
          if (event.response?.status !== 'completed') {
            assistantPlayback.current = false;
            setPhase(mutedRef.current ? 'muted' : 'ready');
          }
          break;
        case 'output_audio_buffer.stopped':
        case 'output_audio_buffer.cleared':
          assistantPlayback.current = false;
          flushAssistant();
          setPhase(mutedRef.current ? 'muted' : 'ready');
          break;
        case 'error':
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
      setMuted(false);
      setErrorCode(null);

      try {
        const session = await startRealtimeVoiceSession({
          language: lang,
          sessionId,
          context,
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
      } catch (error) {
        if (cancelled) return;
        setErrorCode(error?.code || 'session_failed');
        setPhase('error');
      }
    };

    beginSession();

    return () => {
      cancelled = true;
      if (turn.current.pendingTimer) clearTimeout(turn.current.pendingTimer);
      voiceSession.current?.close();
      voiceSession.current = null;
      onActivity({ listening: false, speaking: false });
    };
  }, [open, attempt, lang, sessionId, context, onActivity, onTranscript]);

  useEffect(() => {
    onActivity({
      listening: phase === 'listening' || phase === 'ready',
      speaking: phase === 'speaking',
    });
  }, [phase, onActivity]);

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);
    voiceSession.current?.setMuted(next);
    setPhase(next ? 'muted' : 'ready');
  };

  const retry = () => {
    voiceSession.current?.close();
    voiceSession.current = null;
    setAttempt((value) => value + 1);
  };

  const errorText = errorCode === 'permission_denied'
    ? L(UI.voicePermissionError, lang)
    : errorCode === 'unsupported'
      ? L(UI.voiceUnsupported, lang)
      : L(UI.voiceConnectionError, lang);

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
            className="relative flex min-h-[560px] w-full max-w-xl flex-col overflow-hidden rounded-[36px] border border-white/15 bg-[linear-gradient(155deg,rgba(255,255,255,0.13),rgba(255,255,255,0.045))] px-6 pb-6 pt-8 text-cream shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:px-10 sm:pb-8"
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

            <div className="relative flex flex-1 flex-col items-center justify-center py-8">
              <div className="relative">
                <AIAssistantOrb
                  size="lg"
                  listening={phase === 'listening' || phase === 'ready'}
                  status={phase === 'speaking' ? 'typing' : phase === 'thinking' ? 'thinking' : 'idle'}
                />
                {(phase === 'connecting' || phase === 'thinking') && (
                  <LoaderCircle className="absolute -end-2 -top-2 h-7 w-7 animate-spin rounded-full bg-navy p-1.5 text-gold" />
                )}
              </div>

              <motion.p
                key={phase}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-7 text-sm font-black text-cream"
              >
                {phaseCopy(phase, lang)}
              </motion.p>

              <div className="mt-5 min-h-24 w-full max-w-md rounded-[24px] border border-white/10 bg-black/10 px-5 py-4 text-center backdrop-blur-md">
                {phase === 'error' ? (
                  <p className="text-sm font-bold leading-7 text-rose-100">{errorText}</p>
                ) : (
                  <p className="text-sm font-semibold leading-7 text-cream/75">
                    {caption || L(UI.voiceStartHint, lang)}
                  </p>
                )}
              </div>
            </div>

            <div className="relative flex items-center justify-center gap-4">
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
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={phase === 'connecting'}
                  className={`flex h-16 w-16 items-center justify-center rounded-full border transition disabled:opacity-40 ${
                    muted
                      ? 'border-rose-300/30 bg-rose-400/15 text-rose-100'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/16'
                  }`}
                  aria-label={muted ? L(UI.voiceUnmute, lang) : L(UI.voiceMute, lang)}
                >
                  {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-[0_14px_34px_rgba(244,63,94,0.32)] transition hover:bg-rose-600"
                aria-label={L(UI.voiceEnd, lang)}
              >
                <PhoneOff className="h-6 w-6" />
              </button>
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
