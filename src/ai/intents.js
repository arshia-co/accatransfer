// Intent catalog for the Smart Apply conversation.
// Every dynamic action button carries a `nextIntent` from this list, and the
// conversation engine routes it to the owning flow. A future real AI provider
// only needs to emit these same intents to stay compatible with the UI.
export const INTENTS = {
  // Session
  BOOT: 'boot',
  RESTART: 'restart',
  FREE_TEXT: 'free_text',

  // Language
  SET_LANGUAGE: 'set_language',

  // Goal routing
  SET_GOAL: 'set_goal',
  BACK_TO_GOALS: 'back_to_goals',

  // Major discovery
  DISCOVERY_START: 'discovery_start',
  DISCOVERY_SET_NAME: 'discovery_set_name',
  DISCOVERY_ANSWER: 'discovery_answer',
  DISCOVERY_SHOW_RESULT: 'discovery_show_result',
  DISCOVERY_SEE_UNIVERSITIES: 'discovery_see_universities',
  DISCOVERY_FREE_TEXT: 'discovery_free_text', // student typed instead of tapping → smart help
  DISCOVERY_RESHOW: 'discovery_reshow', // re-display the current question + options
  DISCOVERY_EXPLAIN: 'discovery_explain', // "What does this mean?" → explain current question

  // Known major → universities
  KNOWN_MAJOR_CATEGORY: 'known_major_category',
  KNOWN_MAJOR_PICK: 'known_major_pick',

  // Application (shared funnel: degree → country → gpa → budget → direction)
  APPLY_START: 'apply_start',
  APPLY_SET_DEGREE: 'apply_set_degree',
  APPLY_SET_COUNTRY: 'apply_set_country',
  APPLY_SET_GPA: 'apply_set_gpa',
  APPLY_SET_BUDGET: 'apply_set_budget',
  APPLY_SHOW_DIRECTION: 'apply_show_direction',

  // Documents
  DOCUMENTS_OVERVIEW: 'documents_overview',

  // FAQ
  FAQ_START: 'faq_start',
  FAQ_QUESTION: 'faq_question',

  // Value gate + account
  OPEN_LOGIN_GATE: 'open_login_gate',
  LOGIN_MOCK: 'login_mock',
  CONTINUE_GUEST: 'continue_guest',
  TALK_TO_COUNSELOR: 'talk_to_counselor',
  OPEN_DASHBOARD: 'open_dashboard',
};

export const GOALS = {
  UNKNOWN_MAJOR: 'unknown_major',
  KNOWN_MAJOR: 'known_major',
  APPLY: 'apply',
  QUESTIONS: 'questions',
};
