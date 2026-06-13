export const GUEST_ASSESSMENT_KEY = "acca-transfer-guest-assessment";
export const GUEST_ASSESSMENT_EVENT = "acca-transfer-guest-assessment-change";

export type GuestDocument = {
  name: string;
  size: number;
  type: string;
};

export type GuestAssessmentAnswers = {
  currentUniversity: string;
  currentProgram: string;
  targetCountry: string;
  targetProgram: string;
};

export type GuestAssessmentDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  document: GuestDocument | null;
  answers: GuestAssessmentAnswers;
  completed: boolean;
};

const emptyAnswers = (): GuestAssessmentAnswers => ({
  currentUniversity: "",
  currentProgram: "",
  targetCountry: "",
  targetProgram: "",
});

export function createGuestAssessmentDraft(): GuestAssessmentDraft {
  const now = new Date().toISOString();
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    document: null,
    answers: emptyAnswers(),
    completed: false,
  };
}

export function readGuestAssessment(): GuestAssessmentDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(GUEST_ASSESSMENT_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as GuestAssessmentDraft;
    return {
      ...createGuestAssessmentDraft(),
      ...parsed,
      answers: { ...emptyAnswers(), ...parsed.answers },
    };
  } catch {
    return null;
  }
}

export function saveGuestAssessment(draft: GuestAssessmentDraft) {
  if (typeof window === "undefined") return;
  const next = { ...draft, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(GUEST_ASSESSMENT_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(GUEST_ASSESSMENT_EVENT, { detail: next }));
  return next;
}

export function clearGuestAssessment() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_ASSESSMENT_KEY);
  window.dispatchEvent(new CustomEvent(GUEST_ASSESSMENT_EVENT, { detail: null }));
}

export function guestAssessmentProgress(draft: GuestAssessmentDraft | null) {
  if (!draft) return 0;
  const completedAnswers = Object.values(draft.answers).filter(Boolean).length;
  return Math.round(((draft.document ? 1 : 0) + completedAnswers) / 5 * 100);
}

// TODO(real authentication): after login, send this guest draft to the account
// migration endpoint and clear local storage only after the server confirms it.
