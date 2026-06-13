// Tiny builders that keep flow files declarative.
// Flows resolve localized strings at build time so the UI receives plain text.
import { L } from '../lib/lang';

let actionSeq = 0;

/** Assistant message. `content` may be a string or a {fa,en,tr,ar} object. */
export function aiMsg(lang, content, extra = {}) {
  return {
    role: 'assistant',
    lang,
    content: L(content, lang),
    ...extra,
  };
}

/** Dynamic quick-reply action rendered under the owning assistant message. */
export function action(lang, label, value, nextIntent, extra = {}) {
  actionSeq += 1;
  return {
    id: `act_${actionSeq}`,
    label: L(label, lang),
    value,
    nextIntent,
    ...extra,
  };
}
