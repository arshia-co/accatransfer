// Smart in-conversation understanding for Major Discovery.
//
// While the student is on a discovery question they can type freely instead of
// tapping an option. This module classifies that text so the assistant can:
//   • explain a term they don't understand (e.g. "what does introvert mean?")
//   • answer a general/off-topic study question (via the knowledge base)
//   • reassure when they ask "which should I pick?"
//   • map their own words to the closest option and ask them to confirm
//
// It is deterministic and mock — a real LLM would replace classify() while
// keeping the same return contract. Nothing here selects an answer on its own:
// option mapping always returns a *proposal* the student must confirm.
import { L } from '../lib/lang';
import { matchGlossary } from '../data/discoveryGlossary';
import { matchKnowledge } from '../data/knowledgeBase';

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[‌‏‎]/g, ' ')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const QUESTION_PUNCT = ['?', '؟'];
const QUESTION_WORDS = [
  // fa
  'چیه', 'چیست', 'یعنی', 'معنی', 'منظور', 'چرا', 'چطور', 'چگونه', 'فرق', 'تفاوت',
  'نمیدونم', 'نمی دانم', 'نمیفهمم', 'متوجه نشدم', 'متوجه نمیشم', 'توضیح',
  // en
  'what', 'why', 'how', 'which', 'mean', 'meaning', 'difference', 'explain',
  'confused', "don't understand", 'dont understand', "don't know", 'idk', 'not sure',
  // tr
  'neden', 'nasıl', 'nasil', 'hangi', 'anlam', 'anlamadım', 'bilmiyorum', 'açıkla',
  // ar
  'لماذا', 'كيف', 'معنى', 'الفرق', 'لا أفهم', 'لا أعرف', 'اشرح', 'ماذا',
];

const PICK_MARKERS = [
  'کدوم', 'کدام', 'برای من بهتر', 'پیشنهاد', 'انتخاب کن', 'تو بگو', 'کمکم کن',
  'which should', 'which one', 'best for me', 'recommend', 'you choose', 'help me choose', 'suggest',
  'hangisini', 'bana uygun', 'sen seç', 'öner',
  'أيها', 'أيهما', 'الأنسب لي', 'اقترح', 'اختر لي', 'ساعدني',
];

// Ordinal phrases → option index (0-based). Latin + fa/ar numerals + words.
const ORDINALS = [
  { i: 0, words: ['first', '1st', 'option 1', 'اول', 'اولی', 'گزینه اول', 'یکم', 'birinci', '1.', 'الأول', 'الأولى', '۱', '1'] },
  { i: 1, words: ['second', '2nd', 'option 2', 'دوم', 'دومی', 'گزینه دوم', 'ikinci', '2.', 'الثاني', 'الثانية', '۲', '2'] },
  { i: 2, words: ['third', '3rd', 'option 3', 'سوم', 'سومی', 'گزینه سوم', 'üçüncü', 'ucuncu', '3.', 'الثالث', 'الثالثة', '۳', '3'] },
  { i: 3, words: ['fourth', '4th', 'option 4', 'چهارم', 'چهارمی', 'گزینه چهارم', 'dördüncü', 'dorduncu', '4.', 'الرابع', 'الرابعة', '۴', '4'] },
];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'i', 'me', 'my', 'is', 'am', 'are', 'be', 'it', 'that', 'this', 'like', 'want', 'would', 'prefer',
  'و', 'با', 'به', 'از', 'که', 'را', 'رو', 'یه', 'یک', 'من', 'هم', 'تو', 'این', 'اون', 'می', 'خیلی', 'دوست', 'دارم', 'کنم', 'هست',
  've', 'bir', 'ben', 'çok', 'daha', 'için',
  'في', 'من', 'على', 'مع', 'أنا', 'هذا', 'هذه',
]);

function tokens(s) {
  return norm(s).split(' ').filter((w) => w.length >= 2 && !STOPWORDS.has(w));
}

function detectOrdinal(text, optionCount) {
  // Whole-token match only (space-padded). A bare substring check would fire
  // on false positives like "دوم" (second) hiding inside "کدوم" (which).
  const t = ` ${norm(text)} `;
  for (const o of ORDINALS) {
    if (o.i >= optionCount) continue;
    if (o.words.some((w) => t.includes(` ${norm(w)} `))) return o.i;
  }
  return null;
}

// Lenient token match: exact, or shared stem/substring for tokens ≥4 chars.
// This absorbs Persian/Turkish/Arabic morphology (e.g. تنها↔تنهایی,
// پروژه↔پروژه‌هایم) without a full stemmer — good enough for the mock.
function tokenMatch(a, b) {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4) {
    return a.startsWith(b) || b.startsWith(a) || a.includes(b) || b.includes(a);
  }
  return false;
}

/** Token-overlap score of the student's text against one option label. */
function optionScore(textTokens, optionLabel, lang) {
  const optTokens = tokens(L(optionLabel, lang));
  if (!optTokens.length) return 0;
  const shared = optTokens.filter((o) => textTokens.some((t) => tokenMatch(t, o))).length;
  return shared / Math.max(2, optTokens.length * 0.6);
}

function bestOption(text, question, lang) {
  const tt = tokens(text);
  let best = { option: null, score: 0 };
  for (const option of question.options) {
    const score = optionScore(tt, option.label, lang);
    if (score > best.score) best = { option, score };
  }
  return best;
}

// `includes` of an empty needle is always true, so never test an empty marker.
const hasMarker = (t, markers) => markers.some((m) => {
  const n = norm(m);
  return n.length > 0 && t.includes(n);
});
const isQuestionLike = (text) => {
  const raw = String(text || '');
  if (QUESTION_PUNCT.some((p) => raw.includes(p))) return true;
  return hasMarker(norm(text), QUESTION_WORDS);
};
const asksToPick = (text) => hasMarker(norm(text), PICK_MARKERS);

const STRONG = 0.5;
const WEAK = 0.3;

/**
 * @returns {{ kind: 'map'|'clarify'|'kb'|'help'|'unsure', optionId?, glossary?, kb? }}
 */
export function classifyDiscoveryText(text, question, lang) {
  const optionCount = question.options.length;

  // 1) Explicit ordinal / number ("the second one", "گزینه ۳") → propose it.
  const ord = detectOrdinal(text, optionCount);
  if (ord != null) return { kind: 'map', optionId: question.options[ord].id };

  const glossary = matchGlossary(text);
  const kb = matchKnowledge(norm(text));
  const match = bestOption(text, question, lang);

  // 2) Clearly a question / confusion → explain or answer, never auto-answer.
  if (isQuestionLike(text) || asksToPick(text)) {
    if (asksToPick(text) && !glossary) return { kind: 'help' };
    if (glossary) return { kind: 'clarify', glossary };
    if (kb) return { kind: 'kb', kb };
    return { kind: 'help' };
  }

  // 3) A statement → try to map it to an option, then confirm.
  if (match.option && match.score >= STRONG) return { kind: 'map', optionId: match.option.id };
  if (glossary) return { kind: 'clarify', glossary };
  if (kb) return { kind: 'kb', kb };
  if (match.option && match.score >= WEAK) return { kind: 'map', optionId: match.option.id };
  return { kind: 'unsure' };
}
