// One chat message. Assistant bubbles are glass cards (with optional rich
// blocks: result preview, universities, timeline, documents); user bubbles
// are navy pills. Direction follows the message's own language.
import { motion } from 'framer-motion';
import { CheckCircle2, Info, Lightbulb, Sparkles } from 'lucide-react';
import { dirFor } from '../../lib/lang';
import DynamicActionButtons from './DynamicActionButtons';
import MajorResultPreview from './MajorResultPreview';
import UniversityMatchCards from './UniversityMatchCards';
import AdmissionTimelinePreview from './AdmissionTimelinePreview';
import DocumentUploadPlaceholder from './DocumentUploadPlaceholder';
import JourneyPreview from './JourneyPreview';

const QUESTION_WORD = { fa: 'سؤال', en: 'Question', tr: 'Soru', ar: 'السؤال' };

function RichBlock({ message, language }) {
  switch (message.component) {
    case 'major_result':
      return <MajorResultPreview result={message.payload} lang={language} />;
    case 'university_list':
      return <UniversityMatchCards programIds={message.payload?.programIds || []} lang={language} />;
    case 'timeline':
      return <AdmissionTimelinePreview degree={message.payload?.degree} lang={language} />;
    case 'document_grid':
      return <DocumentUploadPlaceholder degree={message.payload?.degree} lang={language} compact />;
    case 'journey_map':
      return <JourneyPreview lang={language} />;
    default:
      return null;
  }
}

export default function MessageBubble({
  message,
  language,
  actions = [],
  onAction,
  canGoBack = false,
  onBack,
}) {
  const isUser = message.role === 'user';
  const dir = dirFor(message.lang || language);
  const isNote = message.meta?.tone === 'note';
  const isRecap = message.meta?.tone === 'recap';
  const isAssist = message.meta?.tone === 'assist';
  const softTone = isNote || isRecap || isAssist;
  const progress = message.meta?.progress;
  const hasRich = Boolean(message.component);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div
          dir={dir}
          className="max-w-[82%] rounded-[20px] rounded-ee-[6px] bg-navy px-4 py-2.5 text-sm font-bold leading-7 text-cream shadow-[0_10px_28px_rgba(7,26,61,0.28)]"
        >
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto w-full max-w-3xl"
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white/80 shadow-sm sm:flex ${
          isRecap || isAssist ? 'border-emerald-600/20 text-emerald-700' : 'border-gold/25 text-gold'
        }`}>
          {isRecap ? <CheckCircle2 className="h-3.5 w-3.5" /> : isAssist ? <Lightbulb className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        </span>
        <div
          dir={dir}
          className={`${hasRich ? 'w-full' : 'max-w-[94%] sm:max-w-[88%]'} rounded-[22px] border px-4 py-3.5 shadow-[0_14px_44px_rgba(7,26,61,0.055)] backdrop-blur-xl sm:px-5 ${
            isNote
              ? 'border-gold/35 bg-gold/[0.08]'
              : isRecap
                ? 'border-emerald-600/20 bg-emerald-600/[0.055]'
                : isAssist
                  ? 'border-emerald-600/20 bg-gradient-to-br from-white/88 to-emerald-600/[0.06]'
                  : 'border-white/80 bg-white/74'
          }`}
        >
          {progress && (
            <div className="mb-2.5 flex items-center gap-2">
              <span className="rounded-full bg-navy/[0.055] px-2.5 py-0.5 text-[11px] font-black text-navy/60">
                {QUESTION_WORD[message.lang] || QUESTION_WORD.en} {progress}/{message.meta.total}
              </span>
              <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-navy/[0.07]">
                <motion.span
                  className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-emerald-600 to-gold"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress / message.meta.total) * 100}%` }}
                  transition={{ duration: 0.65, ease: 'easeOut' }}
                />
              </span>
            </div>
          )}

          {message.content && (
            <div className={`whitespace-pre-line text-[13px] leading-7 sm:text-sm ${
              softTone ? 'flex items-start gap-2 font-semibold text-navy/75' : 'font-bold text-navy'
            }`}>
              {isNote && <Info className="mt-1 h-4 w-4 shrink-0 text-gold" />}
              {isRecap && <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700 sm:hidden" />}
              {isAssist && <Lightbulb className="mt-1 h-4 w-4 shrink-0 text-emerald-700 sm:hidden" />}
              <span>{message.content}</span>
            </div>
          )}

          {hasRich && (
            <div className={message.content ? 'mt-4' : ''}>
              <RichBlock message={message} language={language} />
            </div>
          )}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="mt-3 sm:ps-11">
          <DynamicActionButtons
            actions={actions}
            onSelect={onAction}
            showBack={canGoBack}
            onBack={onBack}
            lang={language}
          />
        </div>
      )}
    </motion.div>
  );
}
