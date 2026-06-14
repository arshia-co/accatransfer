// The conversation stream. The currently active quick replies are rendered by
// their owning assistant message, never as a detached global control row.
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSmartApplyStore } from '../../store/smartApplyStore';
import { L } from '../../lib/lang';
import { UI } from '../../i18n/ui';
import MessageBubble from './MessageBubble';
import AIAssistantOrb from './AIAssistantOrb';

function AssistantActivityIndicator({ status, lang }) {
  const thinking = status === 'thinking';

  return (
    <motion.div
      key={status}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
      className="mx-auto flex w-full max-w-3xl items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <div className="hidden sm:block">
        <AIAssistantOrb size="sm" status={status} />
      </div>
      <div className="flex min-h-12 items-center gap-3 rounded-[20px] border border-white/80 bg-white/72 px-4 py-3 shadow-[0_12px_38px_rgba(7,26,61,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={`h-2 w-2 rounded-full ${thinking ? 'bg-gold' : 'bg-emerald-600'}`}
              animate={
                thinking
                  ? { opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }
                  : { y: [0, -5, 0], opacity: [0.4, 1, 0.4] }
              }
              transition={{ duration: thinking ? 1.15 : 0.9, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <span className="text-[11px] font-bold text-navy/55">
          {thinking ? L(UI.statusThinking, lang) : L(UI.statusTyping, lang)}
        </span>
      </div>
    </motion.div>
  );
}

export default function ConversationPanel({ lang }) {
  const messages = useSmartApplyStore((s) => s.messages);
  const suggestedActions = useSmartApplyStore((s) => s.suggestedActions);
  const assistantStatus = useSmartApplyStore((s) => s.assistantStatus);
  const chooseAction = useSmartApplyStore((s) => s.chooseAction);
  const canGoBack = useSmartApplyStore((s) => s.navigationHistory.length > 0);
  const goBack = useSmartApplyStore((s) => s.goBack);
  const scrollRef = useRef(null);
  const endRef = useRef(null);

  const busy = assistantStatus !== 'idle';
  const activeActionMessageId = suggestedActions.length
    ? [...messages].reverse().find((message) => message.role === 'assistant' && message.actions?.length)?.id
    : null;

  useEffect(() => {
    if (!scrollRef.current || !endRef.current) return undefined;
    const frame = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages.length, assistantStatus, activeActionMessageId]);

  return (
    <div
      ref={scrollRef}
      className="sa-scroll flex-1 space-y-5 overflow-y-auto px-4 py-6 scroll-smooth sm:px-8 sm:py-7"
      aria-live="polite"
      aria-relevant="additions"
    >
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            language={lang}
            actions={message.id === activeActionMessageId && !busy ? suggestedActions : []}
            onAction={chooseAction}
            canGoBack={message.id === activeActionMessageId && !busy && canGoBack}
            onBack={goBack}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {busy && <AssistantActivityIndicator status={assistantStatus} lang={lang} />}
      </AnimatePresence>

      <div ref={endRef} className="h-2" aria-hidden="true" />
    </div>
  );
}
