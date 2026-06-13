// Maps raw store state to localized, display-ready profile rows.
// Keeps SessionInsightPanel / ProgressMemoryCard free of data lookups.
import { UI } from '../i18n/ui';
import { L, langLabel } from './lang';
import { GOALS } from '../ai/intents';
import { ACCA_CATEGORY_LABELS } from '../data/majorQuestions';
import { getMajor } from '../data/mockPrograms';
import { DEGREE_LEVELS, COUNTRIES, GPA_RANGES, BUDGET_RANGES } from '../data/mockAdmissionRules';

const GOAL_DISPLAY = {
  [GOALS.UNKNOWN_MAJOR]: { fa: 'کشف رشته', en: 'Major discovery', tr: 'Bölüm keşfi', ar: 'اكتشاف التخصص' },
  [GOALS.KNOWN_MAJOR]: { fa: 'یافتن دانشگاه', en: 'Find universities', tr: 'Üniversite bul', ar: 'إيجاد جامعات' },
  [GOALS.APPLY]: { fa: 'ثبت درخواست', en: 'Apply', tr: 'Başvuru', ar: 'التقديم' },
  [GOALS.QUESTIONS]: { fa: 'پرسش و پاسخ', en: 'Q&A', tr: 'Soru-cevap', ar: 'سؤال وجواب' },
};

const findLabel = (list, id) => {
  const item = list.find((x) => x.id === id);
  return item ? item.label : null;
};

/**
 * @returns [{ key, icon, label, value|null }]
 */
export function buildProfileRows(state, lang) {
  const p = state.studentProfile || {};

  const interestValue = () => {
    if (p.knownMajor) {
      const major = getMajor(p.knownMajor);
      return major ? L(major.name, lang) : null;
    }
    const keys = (p.interests || []).slice(0, 2);
    if (!keys.length) return null;
    return keys.map((k) => L(ACCA_CATEGORY_LABELS[k] || k, lang)).join(' · ');
  };

  return [
    { key: 'language', icon: 'Languages', label: L(UI.fieldLanguage, lang), value: p.preferredLanguage ? langLabel(state.language) : null },
    { key: 'goal', icon: 'Target', label: L(UI.fieldGoal, lang), value: state.goal ? L(GOAL_DISPLAY[state.goal], lang) : null },
    { key: 'degree', icon: 'GraduationCap', label: L(UI.fieldDegree, lang), value: p.degree ? L(findLabel(DEGREE_LEVELS, p.degree), lang) : null },
    { key: 'country', icon: 'Globe2', label: L(UI.fieldCountry, lang), value: p.country ? L(findLabel(COUNTRIES, p.country), lang) : null },
    { key: 'interest', icon: 'Compass', label: L(UI.fieldInterest, lang), value: interestValue() },
    { key: 'gpa', icon: 'GaugeCircle', label: L(UI.fieldGpa, lang), value: p.gpa ? L(findLabel(GPA_RANGES, p.gpa), lang) : null },
    { key: 'budget', icon: 'Wallet', label: L(UI.fieldBudget, lang), value: p.budget ? L(findLabel(BUDGET_RANGES, p.budget), lang) : null },
  ];
}
