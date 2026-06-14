// Contextual quick-reply pills shown under the latest assistant message.
// The conversation engine decides WHICH actions exist; this component only
// animates and renders them.
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { getIcon } from '../../lib/icons';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';

export default function DynamicActionButtons({
  actions = [],
  onSelect,
  disabled = false,
  showBack = false,
  onBack,
  lang = 'fa',
}) {
  return (
    <AnimatePresence mode="popLayout">
      {actions.length > 0 && (
        <motion.div
          key={actions.map((a) => a.id).join('|')}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex w-full flex-wrap gap-2"
        >
          {actions.map((action, i) => {
            const Icon = action.icon ? getIcon(action.icon) : null;
            const primary = action.variant === 'primary';
            const help = action.variant === 'help';
            return (
              <motion.button
                key={action.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect?.(action)}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.25, ease: 'easeOut' }}
                whileHover={{ scale: 1.015, y: -1 }}
                whileTap={{ scale: 0.985 }}
                className={`inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-[12px] font-black transition-all disabled:opacity-50 sm:text-[13px] ${
                  primary
                    ? 'bg-emerald-700 text-white shadow-[0_8px_28px_rgba(5,150,105,0.30)] hover:bg-emerald-800 hover:shadow-[0_11px_32px_rgba(5,150,105,0.34)]'
                    : help
                      ? 'border border-dashed border-gold/55 bg-gold/[0.14] text-[#8a6c33] shadow-[0_6px_18px_rgba(198,167,104,0.14)] hover:bg-gold/[0.22] hover:border-gold/70'
                      : 'border border-navy/10 bg-white/82 text-navy shadow-[0_6px_20px_rgba(7,26,61,0.055)] backdrop-blur-md hover:border-gold/45 hover:bg-white hover:shadow-[0_9px_26px_rgba(198,167,104,0.18)]'
                }`}
              >
                {Icon && <Icon className={`h-4 w-4 ${primary ? '' : help ? 'text-[#a8853f]' : 'text-emerald-700'}`} strokeWidth={2.4} />}
                <span>{action.label}</span>
              </motion.button>
            );
          })}
          {showBack && (
            <motion.button
              type="button"
              disabled={disabled}
              onClick={onBack}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.05 + actions.length * 0.05, duration: 0.25, ease: 'easeOut' }}
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.985 }}
              className="inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-full border border-navy/10 bg-navy/[0.035] px-4 py-2 text-[12px] font-black text-navy/65 transition-all hover:border-gold/45 hover:bg-white disabled:opacity-50 sm:text-[13px]"
            >
              <Undo2 className="h-4 w-4 text-gold" strokeWidth={2.4} />
              <span>{L(UI.backPrevious, lang)}</span>
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
