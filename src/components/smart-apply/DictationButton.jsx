// Speech-to-text "voice typing" — distinct from the live realtime voice button.
// Press it, speak, and your words are transcribed INTO the composer input so you
// can edit them and send yourself (like the mic in ChatGPT's text box). Uses the
// browser's built-in SpeechRecognition — no backend, no API key. Degrades
// gracefully when the browser doesn't support it.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';

const LOCALE = { fa: 'fa-IR', en: 'en-US', tr: 'tr-TR', ar: 'ar-SA' };
const getSpeechRecognition = () =>
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function DictationButton({ baseText = '', onText, disabled, lang }) {
  const [listening, setListening] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const recRef = useRef(null);
  const baseRef = useRef('');

  useEffect(() => () => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const toggle = () => {
    if (listening) {
      try { recRef.current?.stop(); } catch { /* ignore */ }
      setListening(false);
      return;
    }
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setUnsupported(true);
      setTimeout(() => setUnsupported(false), 4000);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = LOCALE[lang] || 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    // Capture whatever is already typed, once, so transcription appends cleanly.
    baseRef.current = (baseText || '').trim();

    rec.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      transcript = transcript.trim();
      const base = baseRef.current;
      onText?.(base ? `${base} ${transcript}` : transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <div className="relative shrink-0">
      {unsupported && (
        <span className="absolute bottom-full start-0 mb-2 w-52 rounded-xl border border-white/70 bg-white/95 px-3 py-2 text-[10px] font-bold leading-5 text-navy shadow-[0_12px_30px_rgba(7,26,61,0.18)]">
          {L(UI.dictationUnsupported, lang)}
        </span>
      )}
      <motion.button
        type="button"
        onClick={toggle}
        disabled={disabled}
        whileTap={{ scale: 0.92 }}
        title={L(UI.dictationTooltip, lang)}
        aria-label={L(UI.dictationTooltip, lang)}
        aria-pressed={listening}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
          listening
            ? 'border-rose-400/60 bg-rose-50 text-rose-600'
            : 'border-navy/10 bg-white/80 text-navy hover:border-gold/50'
        }`}
      >
        {listening && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-rose-400/60"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.45, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        {listening ? <MicOff className="h-5 w-5" strokeWidth={2.3} /> : <Mic className="h-5 w-5" strokeWidth={2.3} />}
      </motion.button>
    </div>
  );
}
