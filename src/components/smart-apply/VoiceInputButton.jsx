// Microphone button with a listening animation and an honest placeholder.
// TODO(real voice integration): connect this control to voiceApi only after
// browser permission, cancellation, and streaming error states are designed.
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';

export default function VoiceInputButton({ listening, notice, onPress, lang }) {
  return (
    <div className="relative">
      <AnimatePresence>
        {(listening || notice) && (
          <motion.div
            key={listening ? 'listening' : 'notice'}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="absolute bottom-full start-0 z-20 mb-3 w-64 rounded-2xl border border-white/75 bg-white/90 px-4 py-3 text-xs font-bold leading-6 text-navy shadow-[0_18px_50px_rgba(7,26,61,0.14)] backdrop-blur-xl"
          >
            {listening ? (
              <span className="flex items-center gap-2.5">
                <span className="flex h-5 items-end gap-[3px]" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="sa-eq-bar w-[3px] rounded-full bg-emerald-600"
                      style={{ height: `${8 + (i % 3) * 5}px`, animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </span>
                {L(UI.voiceListening, lang)}
              </span>
            ) : (
              <span className="text-navy/75">{L(UI.voicePlaceholderNote, lang)}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={onPress}
        whileTap={{ scale: 0.92 }}
        title={L(UI.voiceTooltip, lang)}
        aria-label={L(UI.voiceTooltip, lang)}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
          listening
            ? 'border-emerald-500/60 bg-emerald-50 text-emerald-700'
            : 'border-navy/10 bg-white/80 text-navy hover:border-gold/50'
        }`}
      >
        {listening && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-emerald-500/50"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.45, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <Mic className="h-5 w-5" strokeWidth={2.3} />
      </motion.button>
    </div>
  );
}
