// The central AI presence: a soft glass orb with a slow conic halo.
// Visual states: idle (breathing) · thinking (fast ring) · typing (ripples)
// · listening (gold pulse). Pure presentation — state comes in via props.
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const SIZES = {
  sm: { box: 'h-10 w-10', icon: 'h-4 w-4', halo: '-inset-2' },
  md: { box: 'h-16 w-16', icon: 'h-6 w-6', halo: '-inset-3' },
  hero: { box: 'h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20', icon: 'h-7 w-7 sm:h-8 sm:w-8', halo: '-inset-4' },
  lg: { box: 'h-24 w-24', icon: 'h-9 w-9', halo: '-inset-5' },
};

export default function AIAssistantOrb({ status = 'idle', listening = false, size = 'md' }) {
  const s = SIZES[size] || SIZES.md;
  const busy = status === 'thinking' || status === 'typing';

  return (
    <div className={`relative ${s.box} shrink-0`} aria-hidden="true">
      {/* Ambient glow */}
      <div
        className={`absolute ${s.halo} rounded-full blur-2xl transition-opacity duration-700 ${
          busy || listening ? 'opacity-90' : 'opacity-50'
        }`}
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.35), transparent 60%), radial-gradient(circle at 70% 70%, rgba(198,167,104,0.4), transparent 60%)',
        }}
      />

      {/* Rotating conic ring */}
      <div
        className={`sa-orb-ring absolute inset-0 rounded-full p-[2px] ${busy ? 'sa-orb-ring--fast' : ''}`}
        style={{
          background:
            'conic-gradient(from 0deg, rgba(16,185,129,0.85), rgba(198,167,104,0.9), rgba(7,26,61,0.5), rgba(16,185,129,0.85))',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Speaking ripples */}
      <AnimatePresence>
        {status === 'typing' && (
          <>
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute inset-0 rounded-full border border-emerald-400/50"
                initial={{ scale: 1, opacity: 0.55 }}
                animate={{ scale: 1.65, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
        {listening && (
          <motion.span
            key="listen"
            className="absolute inset-0 rounded-full border-2 border-gold/70"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.45, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Glass core */}
      <motion.div
        className="absolute inset-[3px] flex items-center justify-center rounded-full border border-white/80 bg-white/85 shadow-[inset_0_2px_10px_rgba(255,255,255,0.9),0_10px_30px_rgba(7,26,61,0.16)] backdrop-blur-xl"
        animate={
          busy
            ? { scale: [1, 1.05, 1] }
            : listening
              ? { scale: [1, 1.08, 1] }
              : { scale: [1, 1.025, 1] }
        }
        transition={{ duration: busy ? 1.1 : listening ? 0.9 : 3.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          backgroundImage:
            'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(247,241,232,0.75) 55%, rgba(198,167,104,0.18))',
        }}
      >
        <motion.span
          animate={busy ? { rotate: [0, 12, -8, 0] } : { rotate: 0 }}
          transition={{ duration: 1.4, repeat: busy ? Infinity : 0, ease: 'easeInOut' }}
        >
          <Sparkles className={`${s.icon} text-navy`} strokeWidth={2.2} />
        </motion.span>
      </motion.div>
    </div>
  );
}
