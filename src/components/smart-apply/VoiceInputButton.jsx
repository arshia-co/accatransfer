// Entry point for the full-duplex OpenAI Realtime voice conversation.
import { motion } from 'framer-motion';
import { AudioLines, Mic } from 'lucide-react';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';

export default function VoiceInputButton({ active, disabled, onPress, lang }) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      disabled={disabled}
      whileTap={{ scale: 0.92 }}
      title={L(UI.voiceTooltip, lang)}
      aria-label={L(UI.voiceTooltip, lang)}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        active
          ? 'border-emerald-500/60 bg-emerald-50 text-emerald-700'
          : 'border-navy/10 bg-white/80 text-navy hover:border-gold/50'
      }`}
    >
      {active && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-emerald-500/50"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 1.45, opacity: 0 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      {active ? <AudioLines className="h-5 w-5" /> : <Mic className="h-5 w-5" strokeWidth={2.3} />}
    </motion.button>
  );
}
