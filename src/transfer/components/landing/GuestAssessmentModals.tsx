import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  FileText,
  GraduationCap,
  LogIn,
  LockKeyhole,
  Plus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
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
import { useAuth } from "../../../auth/AuthContext";
import {
  buildGuestPreliminaryResult,
  clearGuestAssessment,
  createGuestAssessmentDraft,
  guestAssessmentProgress,
  readGuestAssessment,
  saveGuestAssessment,
  type GuestAssessmentDraft,
} from "@/lib/guest-assessment";
import {
  computeCourseMatches,
  newCoreCourse,
  overallMatch,
  parseGradeRatio,
  type CoreCourse,
  type CourseMatch,
  type CourseMatchStatus,
} from "@/lib/course-matching";

// Number of saved answer fields (mirrors emptyAnswers() in guest-assessment.ts).
const ANSWER_FIELD_COUNT = 8;

type StepId = "transcript" | "current" | "standing" | "target" | "courses" | "result";
const STEPS: StepId[] = ["transcript", "current", "standing", "target", "courses", "result"];
const STEP_LABEL: Record<StepId, { fa: string; en: string }> = {
  transcript: { fa: "ریزنمرات", en: "Transcript" },
  current: { fa: "تحصیل فعلی", en: "Current studies" },
  standing: { fa: "وضعیت تحصیلی", en: "Academic standing" },
  target: { fa: "مقصد انتقالی", en: "Transfer target" },
  courses: { fa: "دروس اصلی", en: "Core courses" },
  result: { fa: "نتیجه", en: "Result" },
};

const STATUS_META: Record<CourseMatchStatus, { fa: string; en: string; text: string; bar: string; chip: string }> = {
  likely: {
    fa: "محتمل",
    en: "Likely",
    text: "text-success",
    bar: "bg-success",
    chip: "bg-success/12 text-success",
  },
  review: {
    fa: "نیازمند بررسی",
    en: "Needs review",
    text: "text-[color:var(--ta-gold-deep)]",
    bar: "bg-[color:var(--ta-gold)]",
    chip: "bg-[color:var(--ta-gold)]/15 text-[color:var(--ta-gold-deep)]",
  },
  unlikely: {
    fa: "کم‌احتمال",
    en: "Unlikely",
    text: "text-destructive",
    bar: "bg-destructive",
    chip: "bg-destructive/12 text-destructive",
  },
};

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

function localizeResultValue(value: string, fa: boolean) {
  if (!fa) return value;
  const labels: Record<string, string> = {
    Low: "پایین",
    Medium: "متوسط",
    High: "بالا",
    "Year 2 may be possible": "امکان ورود به سال دوم وجود دارد",
    "Year 1 or Year 2 may be possible": "ورود به سال اول یا دوم ممکن است",
    "Year 1 is more likely": "ورود به سال اول محتمل‌تر است",
    "Cannot be estimated without verified credits": "بدون تأیید واحدها قابل برآورد نیست",
  };
  return labels[value] ?? value;
}

function firstNumber(value: string): number | null {
  const ascii = (value ?? "").replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  const match = ascii.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function entryLevelFromCredits(credits: number | null): string {
  if (credits === null) return "Cannot be estimated without verified credits";
  if (credits >= 60) return "Year 2 may be possible";
  if (credits >= 30) return "Year 1 or Year 2 may be possible";
  return "Year 1 is more likely";
}

export function GuestAssessmentModal() {
  const { modal, closeModal, openModal } = useUI();
  const { lang } = useI18n();
  const { user, openAuth } = useAuth();
  const fa = lang === "fa";
  const open = modal === "assessment";

  const [draft, setDraft] = useState<GuestAssessmentDraft>(() => readGuestAssessment() ?? createGuestAssessmentDraft());
  const [stepIndex, setStepIndex] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const analyzeTimer = useRef<number | null>(null);

  const step = STEPS[stepIndex];
  const answers = draft.answers;
  // Stable fallback row so an empty list doesn't regenerate ids (and steal focus) each render.
  const fallbackCourse = useRef<CoreCourse>(newCoreCourse());
  const courses = draft.courses.length ? draft.courses : [fallbackCourse.current];

  useEffect(() => {
    if (!open) return;
    const stored = readGuestAssessment() ?? createGuestAssessmentDraft();
    setDraft(stored);
    if (stored.completed && stored.preliminaryResult) setStepIndex(STEPS.indexOf("result"));
    else if (stored.document || stored.documentDeferred) setStepIndex(STEPS.indexOf("current"));
    else setStepIndex(0);
    setAnalyzing(false);
  }, [open]);

  useEffect(() => () => {
    if (analyzeTimer.current) window.clearTimeout(analyzeTimer.current);
  }, []);

  const progress = useMemo(() => Math.round((stepIndex / (STEPS.length - 1)) * 100), [stepIndex]);

  const persist = (next: GuestAssessmentDraft) => {
    const saved = saveGuestAssessment(next) ?? next;
    setDraft(saved);
    return saved;
  };

  const setAnswer = (key: keyof GuestAssessmentDraft["answers"], value: string) => {
    setDraft((d) => ({ ...d, answers: { ...d.answers, [key]: value } }));
  };

  const setCourses = (next: CoreCourse[]) => setDraft((d) => ({ ...d, courses: next }));

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setDraft((d) => ({
      ...d,
      document: { name: file.name, size: file.size, type: file.type || "document" },
      documentDeferred: false,
    }));
  };

  // ── Result computation ─────────────────────────────────────────────────────
  const matches: CourseMatch[] = useMemo(
    () =>
      computeCourseMatches(courses, {
        currentProgram: answers.currentProgram,
        targetProgram: answers.targetProgram,
        gpaRatio: parseGradeRatio(answers.gpa),
      }),
    [courses, answers.currentProgram, answers.targetProgram, answers.gpa],
  );
  const overall = useMemo(() => overallMatch(matches), [matches]);
  const credits = firstNumber(answers.completedCredits);
  const entryLevel = entryLevelFromCredits(credits);
  const namedCourses = courses.filter((c) => c.name.trim().length > 0);
  const confidence =
    draft.document && answers.gpa && namedCourses.length >= 3 ? "Medium" : "Low";

  const canAdvance = (): boolean => {
    switch (step) {
      case "transcript":
        return true;
      case "current":
        return Boolean(answers.currentUniversity.trim() && answers.currentProgram.trim());
      case "standing":
        return Boolean(answers.gpa.trim());
      case "target":
        return Boolean(answers.targetProgram.trim());
      case "courses":
        return namedCourses.length >= 1;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!canAdvance()) return;

    // Build the next draft once, then persist a single merged object.
    let next = draft;
    // Leaving the transcript step without a file = defer it.
    if (step === "transcript" && !draft.document) {
      next = { ...next, documentDeferred: true };
    }

    const enteringResult = STEPS[stepIndex + 1] === "result";
    if (enteringResult) {
      const cleanCourses = namedCourses;
      const liveMatches = computeCourseMatches(cleanCourses, {
        currentProgram: answers.currentProgram,
        targetProgram: answers.targetProgram,
        gpaRatio: parseGradeRatio(answers.gpa),
      });
      const liveOverall = overallMatch(liveMatches);
      const prelim = buildGuestPreliminaryResult({ ...next, courses: cleanCourses });
      next = {
        ...next,
        courses: cleanCourses,
        completed: true,
        preliminaryResult: {
          ...prelim,
          estimatedTransferMatch: liveOverall.score || prelim.estimatedTransferMatch,
          likelyRecognizedCourses: liveMatches.length
            ? `${liveOverall.likely} / ${liveMatches.length}`
            : prelim.likelyRecognizedCourses,
          estimatedEntryLevel: entryLevel,
          aiConfidence: confidence as "Low" | "Medium",
        },
      };
      persist(next);

      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      setAnalyzing(true);
      setStepIndex(stepIndex + 1);
      if (analyzeTimer.current) window.clearTimeout(analyzeTimer.current);
      analyzeTimer.current = window.setTimeout(() => setAnalyzing(false), reduced ? 0 : 1500);
      return;
    }

    persist(next);
    setStepIndex(stepIndex + 1);
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const saveAndContinue = () => {
    persist(draft);
    closeModal();
    if (user) {
      window.location.href = "/account";
      return;
    }
    openAuth("ai_transfer", { returnTo: "/account" });
  };

  // ── Course rows helpers ────────────────────────────────────────────────────
  const updateCourse = (id: string, patch: Partial<CoreCourse>) =>
    setCourses(courses.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const addCourse = () => setCourses([...courses, newCoreCourse()]);
  const removeCourse = (id: string) => {
    const next = courses.filter((c) => c.id !== id);
    setCourses(next.length ? next : [newCoreCourse()]);
  };

  const inputClass = "mt-2 h-12 rounded-xl bg-white text-base sm:text-sm";

  return (
    <Dialog open={open} onOpenChange={(value) => !value && closeModal()}>
      <DialogContent className="sm:max-w-xl ta-glass-strong max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mb-2 flex items-center justify-between gap-3 pe-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ta-gold)]/10 px-3 py-1.5 text-[11px] font-semibold text-[color:var(--ta-gold-deep)]">
              <Sparkles className="h-3.5 w-3.5" />
              {fa ? "بررسی شانس انتقالی" : "Transfer eligibility check"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {fa ? `مرحله ${stepIndex + 1} از ${STEPS.length}` : `Step ${stepIndex + 1} of ${STEPS.length}`}
            </span>
          </div>
          <Progress value={progress} className="h-1.5 bg-[color:var(--ta-navy)]/10 [&>div]:bg-[color:var(--ta-gold)]" />
          <DialogTitle className="pt-3 font-display text-2xl">
            {step === "result"
              ? fa ? "برآورد شانس انتقالی شما" : "Your transfer eligibility estimate"
              : fa ? "مسیر انتقالی خود را بررسی کنید" : "Check your transfer path"}
          </DialogTitle>
          <DialogDescription>
            {step === "result"
              ? fa
                ? "این برآورد روی همین دستگاه و فقط از اطلاعاتی که وارد کردید ساخته شده است."
                : "This estimate is built on your device from the details you entered."
              : fa
                ? "بدون ورود شروع کنید؛ پیشرفت شما در همین مرورگر ذخیره می‌شود."
                : "Start without logging in. Your progress stays saved in this browser."}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP: transcript ─────────────────────────────────────────────── */}
        {step === "transcript" && (
          <div className="space-y-3">
            {draft.document ? (
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
            ) : (
              <label className="group flex cursor-pointer flex-col items-center rounded-3xl border border-dashed border-[color:var(--ta-gold)]/45 bg-[color:var(--ta-gold)]/[0.06] px-6 py-9 text-center transition hover:bg-[color:var(--ta-gold)]/[0.1]">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
                  <UploadCloud className="h-6 w-6 text-[color:var(--ta-gold-deep)]" />
                </span>
                <strong className="mt-4 text-base text-foreground">
                  {fa ? "ریز‌نمرات خود را انتخاب کنید" : "Choose your transcript"}
                </strong>
                <span className="mt-2 max-w-sm text-xs leading-6 text-muted-foreground">
                  {fa
                    ? "فعلاً فقط نام و مشخصات فایل در حافظه این مرورگر می‌ماند؛ خواندن خودکار (OCR) و آپلود امن فایل واقعی پس از ورود انجام می‌شود."
                    : "For now only the file name and metadata stay in this browser. Automatic reading (OCR) and secure upload of the real file happen after login."}
                </span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={(event) => onFile(event.target.files?.[0])}
                />
              </label>
            )}
            <p className="px-1 text-[11px] leading-5 text-muted-foreground">
              {fa
                ? "در ادامه، چون هنوز ریزنمرات خوانده نشده، درس‌های اصلی و تخصصی‌ات را خودت وارد می‌کنی تا همین حالا برآورد درس‌به‌درس بگیری."
                : "Next, since the transcript isn't read yet, you'll enter your core / specialised courses so we can estimate course-by-course right now."}
            </p>
          </div>
        )}

        {/* ── STEP: current studies ────────────────────────────────────────── */}
        {step === "current" && (
          <div className="space-y-4">
            <Field label={fa ? "دانشگاه فعلی" : "Current university"}>
              <Input
                autoFocus
                value={answers.currentUniversity}
                onChange={(e) => setAnswer("currentUniversity", e.target.value)}
                placeholder={fa ? "نام دانشگاه فعلی" : "Current university"}
                className={inputClass}
              />
            </Field>
            <Field
              label={fa ? "رشته فعلی" : "Current field of study"}
              hint={fa ? "رشته شما تعیین‌کننده تطبیق دروس تخصصی است." : "Your major drives the specialised-course matching."}
            >
              <Input
                value={answers.currentProgram}
                onChange={(e) => setAnswer("currentProgram", e.target.value)}
                placeholder={fa ? "مثلاً مهندسی نرم‌افزار" : "e.g. Software Engineering"}
                className={inputClass}
              />
            </Field>
          </div>
        )}

        {/* ── STEP: academic standing ──────────────────────────────────────── */}
        {step === "standing" && (
          <div className="space-y-4">
            <Field
              label={fa ? "معدل و مقیاس آن" : "GPA and its scale"}
              hint={fa ? "مثلاً ۱۶ از ۲۰، یا ۲٫۹۱ از ۴" : "e.g. 2.91 / 4.00 or 16 / 20"}
            >
              <Input
                autoFocus
                value={answers.gpa}
                onChange={(e) => setAnswer("gpa", e.target.value)}
                placeholder={fa ? "۱۶ / ۲۰" : "2.91 / 4.00"}
                className={inputClass}
                inputMode="decimal"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={fa ? "واحد گذرانده (ECTS)" : "Completed credits (ECTS)"}>
                <Input
                  value={answers.completedCredits}
                  onChange={(e) => setAnswer("completedCredits", e.target.value)}
                  placeholder={fa ? "مثلاً ۷۲" : "e.g. 72"}
                  className={inputClass}
                  inputMode="numeric"
                />
              </Field>
              <Field label={fa ? "سال / ترم فعلی" : "Current year / semester"}>
                <Input
                  value={answers.currentYear}
                  onChange={(e) => setAnswer("currentYear", e.target.value)}
                  placeholder={fa ? "مثلاً سال دوم" : "e.g. Year 2"}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP: transfer target ────────────────────────────────────────── */}
        {step === "target" && (
          <div className="space-y-4">
            <Field
              label={fa ? "رشته مقصد" : "Target program"}
              hint={fa ? "تطبیق دروس نسبت به این رشته محاسبه می‌شود." : "Course matching is computed against this program."}
            >
              <Input
                autoFocus
                value={answers.targetProgram}
                onChange={(e) => setAnswer("targetProgram", e.target.value)}
                placeholder={fa ? "رشته‌ای که می‌خواهید منتقل شوید" : "Program you want to transfer into"}
                className={inputClass}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={fa ? "کشور مقصد" : "Target country"}>
                <Input
                  value={answers.targetCountry}
                  onChange={(e) => setAnswer("targetCountry", e.target.value)}
                  placeholder={fa ? "مثلاً ترکیه" : "e.g. Türkiye"}
                  className={inputClass}
                />
              </Field>
              <Field label={fa ? "دانشگاه مقصد" : "Target university"}>
                <Input
                  value={answers.targetUniversity}
                  onChange={(e) => setAnswer("targetUniversity", e.target.value)}
                  placeholder={fa ? "نام دانشگاه یا «نامشخص»" : "University, or 'Not sure'"}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP: core courses ───────────────────────────────────────────── */}
        {step === "courses" && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-2xl bg-[color:var(--ta-gold)]/[0.06] p-3 text-[11px] leading-5 text-muted-foreground">
              <ScanLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--ta-gold-deep)]" />
              {fa
                ? "فقط درس‌های اصلی و تخصصی رشته‌ات را وارد کن (نه دروس عمومی مثل تاریخ یا تربیت بدنی). نمره هر درس را هم بنویس تا احتمال تطبیق دقیق‌تر شود."
                : "Enter only your core / specialised major courses (not general ones like History or PE). Add each grade so the matching is more accurate."}
            </div>

            <div className="space-y-2">
              {courses.map((course, index) => (
                <div key={course.id} className="flex items-center gap-2">
                  <Input
                    autoFocus={index === 0}
                    value={course.name}
                    onChange={(e) => updateCourse(course.id, { name: e.target.value })}
                    placeholder={fa ? `درس تخصصی ${index + 1}` : `Core course ${index + 1}`}
                    className="h-11 flex-1 rounded-xl bg-white text-base sm:text-sm"
                  />
                  <Input
                    value={course.grade}
                    onChange={(e) => updateCourse(course.id, { grade: e.target.value })}
                    placeholder={fa ? "نمره" : "Grade"}
                    className="h-11 w-20 rounded-xl bg-white text-center text-base sm:text-sm"
                    inputMode="text"
                  />
                  <button
                    type="button"
                    onClick={() => removeCourse(course.id)}
                    aria-label={fa ? "حذف درس" : "Remove course"}
                    className="grid h-11 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button type="button" variant="ghost" onClick={addCourse} className="w-full rounded-xl border border-dashed border-[color:var(--ta-navy)]/15">
              <Plus className="h-4 w-4" />
              {fa ? "افزودن درس دیگر" : "Add another course"}
            </Button>
          </div>
        )}

        {/* ── STEP: result ─────────────────────────────────────────────────── */}
        {step === "result" && (
          analyzing ? (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-[color:var(--ta-navy)]/10 bg-white/70 px-6 py-12 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[color:var(--ta-gold)]/10">
                <ScanLine className="h-7 w-7 animate-pulse text-[color:var(--ta-gold-deep)]" />
              </span>
              <div className="text-sm font-semibold text-foreground">
                {fa ? "در حال تحلیل دروس شما…" : "Analyzing your courses…"}
              </div>
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-[color:var(--ta-navy)]/10">
                <div className="h-full w-1/2 animate-[acca-scan_1.4s_ease-in-out_infinite] rounded-full bg-[color:var(--ta-gold)]" />
              </div>
              <style>{`@keyframes acca-scan{0%{transform:translateX(-110%)}100%{transform:translateX(220%)}}`}</style>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall score */}
              <div className="overflow-hidden rounded-3xl border border-[color:var(--ta-navy)]/10 bg-white/85">
                <div className="flex items-center gap-5 bg-gradient-to-l from-[color:var(--ta-gold)]/15 to-transparent p-5 sm:p-6">
                  <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[color:var(--ta-navy)] text-white" dir="ltr">
                    <span className="font-display text-3xl leading-none">{overall.score}<span className="text-base text-white/60">%</span></span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ta-gold-deep)]">
                      {fa ? "برآورد کل شانس انتقالی" : "Overall transfer match"}
                    </div>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      {fa
                        ? `میانگین احتمال تطبیق ${overall.total} درس تخصصی شما برای ${answers.targetProgram || "رشته مقصد"}.`
                        : `Average match probability across your ${overall.total} core ${overall.total === 1 ? "course" : "courses"} for ${answers.targetProgram || "the target program"}.`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-px bg-[color:var(--ta-navy)]/[0.07]">
                  {[
                    { label: fa ? "محتمل" : "Likely", value: overall.likely, tone: "text-success" },
                    { label: fa ? "بررسی" : "Review", value: overall.review, tone: "text-[color:var(--ta-gold-deep)]" },
                    { label: fa ? "کم‌احتمال" : "Unlikely", value: overall.unlikely, tone: "text-destructive" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white px-3 py-3 text-center">
                      <div className={`text-lg font-bold ${item.tone}`}>{item.value}</div>
                      <div className="text-[10px] text-muted-foreground">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-course breakdown */}
              <div className="rounded-3xl border border-[color:var(--ta-navy)]/10 bg-white/70 p-4 sm:p-5">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ta-gold-deep)]">
                  {fa ? "تطبیق درس‌به‌درس" : "Course-by-course matching"}
                </div>
                <div className="space-y-3">
                  {matches.map((m) => {
                    const meta = STATUS_META[m.status];
                    return (
                      <div key={m.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                            {m.name}
                            {m.gradeLabel && <span className="ms-1 text-muted-foreground">· {m.gradeLabel}</span>}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>
                            {fa ? meta.fa : meta.en}
                          </span>
                          <span className={`w-9 text-end font-mono text-xs font-semibold ${meta.text}`} dir="ltr">{m.matchScore}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--ta-navy)]/[0.07]">
                          <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${m.matchScore}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Context cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[color:var(--ta-navy)]/[0.045] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <GraduationCap className="h-4 w-4 text-[color:var(--ta-gold-deep)]" />
                    {fa ? "سطح ورود احتمالی" : "Possible entry level"}
                  </div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{localizeResultValue(entryLevel, fa)}</p>
                </div>
                <div className="rounded-2xl bg-[color:var(--ta-navy)]/[0.045] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-[color:var(--ta-gold-deep)]" />
                    {fa ? "اعتماد برآورد" : "Estimate confidence"}
                  </div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {localizeResultValue(confidence, fa)}
                    {" · "}
                    {fa
                      ? draft.document ? "ریزنمرات پس از ورود خوانده می‌شود" : "برای دقت بیشتر ریزنمرات را اضافه کنید"
                      : draft.document ? "transcript reads after login" : "add a transcript for higher accuracy"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-2xl bg-[color:var(--ta-gold)]/[0.06] p-3 text-[11px] leading-5 text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--ta-gold-deep)]" />
                {fa
                  ? "این برآورد مقدماتی است و تضمین پذیرش، معادل‌سازی درس یا سال ورود نیست. پس از ورود، ریزنمرات واقعی خوانده شده و گزارش کامل با بررسی مشاور آکا آماده می‌شود. تصمیم نهایی با دانشگاه مقصد است."
                  : "This is a preliminary estimate, not a guarantee of admission, course recognition or year placement. After login the real transcript is read and a full report is prepared with ACCA advisor review. The final decision rests with the receiving university."}
              </div>
            </div>
          )
        )}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <DialogFooter className="gap-2 sm:space-x-0">
          {step !== "result" ? (
            <>
              <Button variant="ghost" onClick={goBack} disabled={stepIndex === 0}>
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {fa ? "قبلی" : "Back"}
              </Button>
              <Button onClick={goNext} disabled={!canAdvance()} className="rounded-xl bg-[color:var(--ta-navy)] text-white">
                {step === "courses"
                  ? (fa ? "محاسبه شانس انتقالی" : "Estimate eligibility")
                  : (fa ? "ادامه" : "Continue")}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStepIndex(STEPS.indexOf("courses"))}>
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {fa ? "ویرایش دروس" : "Edit courses"}
              </Button>
              <Button onClick={saveAndContinue} className="rounded-xl bg-[color:var(--ta-navy)] text-white">
                <LogIn className="h-4 w-4" />
                {user
                  ? (fa ? "ادامه در پنل مرکزی" : "Continue in account")
                  : (fa ? "ذخیره و ادامه کامل" : "Save & unlock full process")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] leading-5 text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function FormMemoryModal() {
  const { modal, closeModal, openModal } = useUI();
  const { user, openAuth } = useAuth();
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

  const unlockFullProcess = () => {
    closeModal();
    if (user) {
      window.location.href = "/account";
      return;
    }
    openAuth("ai_transfer", { returnTo: "/account" });
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && closeModal()}>
      <DialogContent className="sm:max-w-2xl ta-glass-strong max-h-[90vh] overflow-y-auto">
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
                  <div className="mt-1 font-semibold text-foreground">{answered} / {ANSWER_FIELD_COUNT}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {fa ? "آخرین ذخیره:" : "Last saved:"} {formatUpdatedAt(draft.updatedAt, fa)}
              </div>
            </div>

            {draft.preliminaryResult && (
              <div className="overflow-hidden rounded-3xl border border-[color:var(--ta-navy)]/10 bg-white/85">
                <div className="border-b border-[color:var(--ta-navy)]/[0.07] bg-gradient-to-l from-[color:var(--ta-gold)]/15 to-transparent p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--ta-navy)] px-3 py-1.5 text-[10px] font-semibold text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                      {fa ? "راهنمایی مقدماتی" : "Preliminary guidance"}
                    </span>
                    <span className="text-[10px] font-semibold text-[color:var(--ta-gold-deep)]">
                      {fa ? "ذخیره‌شده در این مرورگر" : "Saved in this browser"}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-foreground">
                    {fa ? "تصویر اولیه پرونده انتقالی شما آماده است" : draft.preliminaryResult.headline}
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {fa
                      ? "این برآورد از پاسخ‌ها و درس‌هایی که وارد کردید ساخته شده است؛ فایل واقعی هنوز خوانده یا آپلود نشده است."
                      : "This estimate uses your answers and entered courses. The selected file has not been read or uploaded."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-px bg-[color:var(--ta-navy)]/[0.07] sm:grid-cols-4">
                  {[
                    {
                      label: fa ? "تطابق مقدماتی" : "Initial match",
                      value: `${draft.preliminaryResult.estimatedTransferMatch}%`,
                    },
                    {
                      label: fa ? "اعتماد AI" : "AI confidence",
                      value: localizeResultValue(draft.preliminaryResult.aiConfidence, fa),
                    },
                    {
                      label: fa ? "سطح ریسک" : "Risk level",
                      value: localizeResultValue(draft.preliminaryResult.riskLevel, fa),
                    },
                    {
                      label: fa ? "دروس محتمل" : "Likely courses",
                      value: draft.preliminaryResult.likelyRecognizedCourses,
                    },
                  ].map((item) => (
                    <div key={item.label} className="bg-white px-4 py-4">
                      <div className="text-[9px] text-muted-foreground">{item.label}</div>
                      <div className="mt-1 text-sm font-bold text-foreground" dir="ltr">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 p-5 sm:p-6">
                  <div className="rounded-2xl border border-[color:var(--ta-gold)]/25 bg-[color:var(--ta-gold)]/[0.06] p-4">
                    <div className="text-xs font-semibold text-foreground">
                      {fa ? "برای ادامه چه چیزی باز می‌شود؟" : "What unlocks after login?"}
                    </div>
                    <div className="mt-3 grid gap-2 text-[11px] leading-5 text-muted-foreground sm:grid-cols-2">
                      {(fa
                        ? [
                            "ذخیره نتیجه در پنل مرکزی",
                            "آپلود امن و OCR ریزنمرات",
                            "تحلیل کامل تطبیق دروس",
                            "دانشگاه‌های متناسب و ادامه درخواست",
                          ]
                        : [
                            "Save the result in your central account",
                            "Secure transcript upload and OCR",
                            "Full course-equivalency analysis",
                            "Matching universities and application continuation",
                          ]).map((item) => (
                        <span key={item} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] leading-5 text-muted-foreground">
                    {fa
                      ? "این نتیجه راهنمایی مقدماتی است و تضمین پذیرش، معادل‌سازی درس یا سال ورود نیست. تصمیم نهایی با دانشگاه مقصد است."
                      : draft.preliminaryResult.disclaimer}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-2xl bg-[color:var(--ta-navy)]/[0.045] p-3 text-[11px] leading-5 text-muted-foreground">
              <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {fa
                ? "پس از ورود، همین پیش‌نویس و نتیجه مقدماتی به پنل مرکزی شما منتقل می‌شود. فایل واقعی فقط پس از ورود و با انتخاب خودتان آپلود خواهد شد."
                : "After login, this draft and preliminary result move to your central account. The actual file uploads only when you choose it after login."}
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
          {draft?.preliminaryResult ? (
            <>
              <Button variant="outline" onClick={() => openModal("assessment")} className="rounded-xl">
                {fa ? "مرور نتیجه" : "Review result"}
              </Button>
              <Button onClick={unlockFullProcess} className="rounded-xl bg-[color:var(--ta-navy)] text-white">
                <LogIn className="h-4 w-4" />
                {user
                  ? (fa ? "ورود به پنل مرکزی" : "Open central account")
                  : (fa ? "ذخیره و ادامه در پنل مرکزی" : "Save and continue in central account")}
              </Button>
            </>
          ) : (
            <Button onClick={() => openModal("assessment")} className="rounded-xl bg-[color:var(--ta-navy)] text-white">
              {draft ? (fa ? "ادامه ارزیابی" : "Continue assessment") : (fa ? "شروع ارزیابی" : "Start assessment")}
            </Button>
          )}
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
