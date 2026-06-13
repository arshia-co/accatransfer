import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  LockKeyhole,
  RotateCcw,
  UploadCloud,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { useUI } from "@/lib/ui-context";
import {
  clearGuestAssessment,
  createGuestAssessmentDraft,
  guestAssessmentProgress,
  readGuestAssessment,
  saveGuestAssessment,
  type GuestAssessmentAnswers,
  type GuestAssessmentDraft,
} from "@/lib/guest-assessment";

const questions: Array<{
  key: keyof GuestAssessmentAnswers;
  en: string;
  fa: string;
  placeholderEn: string;
  placeholderFa: string;
}> = [
  {
    key: "currentUniversity",
    en: "Which university are you currently studying at?",
    fa: "در حال حاضر در کدام دانشگاه تحصیل می‌کنید؟",
    placeholderEn: "Current university",
    placeholderFa: "نام دانشگاه فعلی",
  },
  {
    key: "currentProgram",
    en: "What is your current field of study?",
    fa: "رشته فعلی شما چیست؟",
    placeholderEn: "Current program",
    placeholderFa: "مثلاً مهندسی نرم‌افزار",
  },
  {
    key: "targetCountry",
    en: "Which destination country are you considering?",
    fa: "برای انتقالی کدام کشور را در نظر دارید؟",
    placeholderEn: "Target country",
    placeholderFa: "مثلاً ترکیه",
  },
  {
    key: "targetProgram",
    en: "Which program would you like to transfer into?",
    fa: "مایلید به چه رشته‌ای منتقل شوید؟",
    placeholderEn: "Target program",
    placeholderFa: "رشته مقصد",
  },
];

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUpdatedAt(value: string, fa: boolean) {
  return new Intl.DateTimeFormat(fa ? "fa-IR" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function GuestAssessmentModal() {
  const { modal, closeModal, openModal } = useUI();
  const { lang } = useI18n();
  const fa = lang === "fa";
  const open = modal === "assessment";
  const [draft, setDraft] = useState<GuestAssessmentDraft>(() => readGuestAssessment() ?? createGuestAssessmentDraft());
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (!open) return;
    const stored = readGuestAssessment() ?? createGuestAssessmentDraft();
    const firstIncomplete = questions.findIndex((question) => !stored.answers[question.key]);
    const nextIndex = firstIncomplete === -1 ? questions.length - 1 : firstIncomplete;
    setDraft(stored);
    setQuestionIndex(nextIndex);
    setAnswer(stored.answers[questions[nextIndex].key]);
  }, [open]);

  const question = questions[questionIndex];
  const progress = guestAssessmentProgress(draft);

  const updateDraft = (next: GuestAssessmentDraft) => {
    const saved = saveGuestAssessment(next) ?? next;
    setDraft(saved);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    updateDraft({
      ...draft,
      document: { name: file.name, size: file.size, type: file.type || "document" },
      completed: false,
    });
  };

  const saveAnswer = () => {
    const value = answer.trim();
    if (!value) return;
    const nextAnswers = { ...draft.answers, [question.key]: value };
    const lastQuestion = questionIndex === questions.length - 1;
    updateDraft({ ...draft, answers: nextAnswers, completed: lastQuestion });

    if (lastQuestion) {
      closeModal();
      openModal("memory");
      return;
    }

    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    setAnswer(nextAnswers[questions[nextIndex].key]);
  };

  const previousQuestion = () => {
    const nextIndex = Math.max(0, questionIndex - 1);
    setQuestionIndex(nextIndex);
    setAnswer(draft.answers[questions[nextIndex].key]);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && closeModal()}>
      <DialogContent className="sm:max-w-xl ta-glass-strong max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex items-center justify-between gap-3 pe-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ta-gold)]/10 px-3 py-1.5 text-[11px] font-semibold text-[color:var(--ta-gold-deep)]">
              <Database className="h-3.5 w-3.5" />
              {fa ? "ارزیابی مهمان" : "Guest assessment"}
            </span>
            <span className="text-[11px] text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-[color:var(--ta-navy)]/10 [&>div]:bg-[color:var(--ta-gold)]" />
          <DialogTitle className="pt-3 font-display text-2xl">
            {fa ? "مسیر انتقالی خود را شروع کنید" : "Start your transfer assessment"}
          </DialogTitle>
          <DialogDescription>
            {fa
              ? "بدون ورود شروع کنید. پیشرفت شما در همین مرورگر ذخیره می‌شود."
              : "Start without logging in. Your progress stays saved in this browser."}
          </DialogDescription>
        </DialogHeader>

        {!draft.document ? (
          <label className="group flex cursor-pointer flex-col items-center rounded-3xl border border-dashed border-[color:var(--ta-gold)]/45 bg-[color:var(--ta-gold)]/[0.06] px-6 py-10 text-center transition hover:bg-[color:var(--ta-gold)]/[0.1]">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
              <UploadCloud className="h-6 w-6 text-[color:var(--ta-gold-deep)]" />
            </span>
            <strong className="mt-4 text-base text-foreground">
              {fa ? "ریز‌نمرات خود را انتخاب کنید" : "Choose your transcript"}
            </strong>
            <span className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
              {fa
                ? "در این نمونه فقط نام و مشخصات فایل ذخیره می‌شود؛ فایل واقعی آپلود نمی‌شود."
                : "This demo stores only the file name and metadata. The actual file is not uploaded."}
            </span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="sr-only"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--ta-navy)]/10 bg-white/75 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color:var(--ta-gold)]/10">
                <FileText className="h-5 w-5 text-[color:var(--ta-gold-deep)]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{draft.document.name}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{formatFileSize(draft.document.size)}</div>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>

            <div className="rounded-3xl border border-[color:var(--ta-navy)]/10 bg-white/70 p-5 sm:p-6">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ta-gold-deep)]">
                {fa ? `سؤال ${questionIndex + 1} از ${questions.length}` : `Question ${questionIndex + 1} of ${questions.length}`}
              </div>
              <h3 className="mt-3 text-lg font-semibold leading-8 text-foreground">
                {fa ? question.fa : question.en}
              </h3>
              <Input
                autoFocus
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveAnswer();
                }}
                placeholder={fa ? question.placeholderFa : question.placeholderEn}
                className="mt-5 h-12 rounded-xl bg-white"
              />
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-2xl bg-[color:var(--ta-navy)]/[0.045] p-3 text-[11px] leading-5 text-muted-foreground">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--ta-navy)]/60" />
          {fa
            ? "این پیش‌نویس فقط روی همین دستگاه نگه‌داری می‌شود و پس از فعال‌شدن ورود، آماده انتقال به حساب دانشجو است."
            : "This draft stays on this device and is ready to be transferred to the student account when authentication is connected."}
        </div>

        {draft.document && (
          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="ghost" onClick={previousQuestion} disabled={questionIndex === 0}>
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {fa ? "قبلی" : "Back"}
            </Button>
            <Button onClick={saveAnswer} disabled={!answer.trim()} className="rounded-xl bg-[color:var(--ta-navy)] text-white">
              {questionIndex === questions.length - 1 ? (fa ? "ذخیره نتیجه اولیه" : "Save preliminary result") : (fa ? "ادامه" : "Continue")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function FormMemoryModal() {
  const { modal, closeModal, openModal } = useUI();
  const { lang } = useI18n();
  const fa = lang === "fa";
  const open = modal === "memory";
  const [draft, setDraft] = useState<GuestAssessmentDraft | null>(null);

  useEffect(() => {
    if (open) setDraft(readGuestAssessment());
  }, [open]);

  const progress = guestAssessmentProgress(draft);
  const answered = useMemo(
    () => draft ? Object.values(draft.answers).filter(Boolean).length : 0,
    [draft],
  );

  const reset = () => {
    clearGuestAssessment();
    setDraft(null);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && closeModal()}>
      <DialogContent className="sm:max-w-lg ta-glass-strong">
        <DialogHeader>
          <span className="mb-2 inline-flex w-fit items-center gap-2 rounded-full bg-[color:var(--ta-gold)]/10 px-3 py-1.5 text-[11px] font-semibold text-[color:var(--ta-gold-deep)]">
            <Database className="h-3.5 w-3.5" />
            {fa ? "حافظه فرم" : "Form memory"}
          </span>
          <DialogTitle className="font-display text-2xl">
            {fa ? "پیش‌نویس ارزیابی انتقالی" : "Your transfer assessment draft"}
          </DialogTitle>
          <DialogDescription>
            {fa
              ? "پیشرفت مهمان روی همین مرورگر باقی می‌ماند تا بعداً ادامه دهید."
              : "Your guest progress stays in this browser so you can continue later."}
          </DialogDescription>
        </DialogHeader>

        {!draft ? (
          <div className="rounded-3xl border border-dashed border-[color:var(--ta-navy)]/15 bg-white/55 px-6 py-10 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[color:var(--ta-navy)]/[0.06]">
              <Database className="h-6 w-6 text-[color:var(--ta-navy)]/55" />
            </span>
            <h3 className="mt-4 font-semibold text-foreground">{fa ? "هنوز پیش‌نویسی ندارید" : "No saved draft yet"}</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
              {fa
                ? "ارزیابی را بدون ورود شروع کنید؛ پاسخ‌ها و مشخصات مدرک اینجا ذخیره می‌شوند."
                : "Start the assessment without logging in. Your answers and document metadata will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-3xl border border-[color:var(--ta-gold)]/25 bg-[color:var(--ta-gold)]/[0.06] p-5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{fa ? "پیشرفت فرم" : "Form progress"}</span>
                <span className="font-semibold text-[color:var(--ta-gold-deep)]">{progress}%</span>
              </div>
              <Progress value={progress} className="mt-3 h-2 bg-white [&>div]:bg-[color:var(--ta-gold)]" />
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="text-muted-foreground">{fa ? "مدرک" : "Document"}</div>
                  <div className="mt-1 truncate font-semibold text-foreground">
                    {draft.document?.name ?? (fa ? "انتخاب نشده" : "Not selected")}
                  </div>
                </div>
                <div className="rounded-xl bg-white/70 p-3">
                  <div className="text-muted-foreground">{fa ? "پاسخ‌ها" : "Answers"}</div>
                  <div className="mt-1 font-semibold text-foreground">{answered} / {questions.length}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {fa ? "آخرین ذخیره:" : "Last saved:"} {formatUpdatedAt(draft.updatedAt, fa)}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-2xl bg-[color:var(--ta-navy)]/[0.045] p-3 text-[11px] leading-5 text-muted-foreground">
              <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {fa
                ? "پس از فعال‌شدن ورود واقعی، این پیش‌نویس فقط با تأیید دانشجو به حساب او منتقل خواهد شد."
                : "When real login is connected, this draft will move to the account only after the student confirms it."}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:space-x-0">
          {draft && (
            <Button variant="ghost" onClick={reset} className="text-destructive">
              <RotateCcw className="h-4 w-4" />
              {fa ? "پاک‌کردن حافظه" : "Clear memory"}
            </Button>
          )}
          <Button onClick={() => openModal("assessment")} className="rounded-xl bg-[color:var(--ta-navy)] text-white">
            {draft ? (fa ? "ادامه فرم" : "Continue form") : (fa ? "شروع فرم" : "Start form")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GuestAssessmentModals() {
  return (
    <>
      <GuestAssessmentModal />
      <FormMemoryModal />
    </>
  );
}
