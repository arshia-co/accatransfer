import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUI } from "@/lib/ui-context";
import { useI18n } from "@/lib/i18n";
import { requestDemo, sampleReport } from "@/lib/api";
import { ACCA_CONTACT } from "@/lib/contact";
import type { TransferReport } from "@/lib/types";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2, Sparkles, CheckCircle2, FileText, GraduationCap, Download,
  Building2, Users, ShieldCheck, Mail, Phone, MapPin, Camera,
  Layers3, ListChecks, Activity, FolderCheck,
} from "lucide-react";

/* ---------------- Request Demo ---------------- */

const demoSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(5, "Phone is too short").max(40).optional().or(z.literal("")),
  organization: z.enum(["student", "agent", "university", "institution", "other"]),
  contactMethod: z.enum(["email", "phone", "whatsapp", "instagram"]),
  message: z.string().trim().max(600).optional(),
});

export function RequestDemoModal() {
  const { modal, closeModal } = useUI();
  const { lang } = useI18n();
  const open = modal === "demo";
  const fa = lang === "fa";
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    organization: "student" as z.infer<typeof demoSchema>["organization"],
    contactMethod: "email" as z.infer<typeof demoSchema>["contactMethod"],
    message: "",
  });

  useEffect(() => {
    if (!open) {
      setDone(false);
      setForm({ name: "", email: "", phone: "", organization: "student", contactMethod: "email", message: "" });
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = demoSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      await requestDemo({ name: parsed.data.name, email: parsed.data.email, role: parsed.data.organization, message: parsed.data.message });
      setDone(true);
      toast.success(fa ? "ممنون. تیم ACCA با شما تماس می‌گیرد." : "Thank you. ACCA team will contact you soon.");
    } catch {
      toast.error(fa ? "خطا. دوباره تلاش کنید." : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const orgs: Array<{ k: z.infer<typeof demoSchema>["organization"]; en: string; fa: string }> = [
    { k: "student", en: "Student", fa: "دانشجو" },
    { k: "agent", en: "Agent", fa: "ایجنت" },
    { k: "university", en: "University", fa: "دانشگاه" },
    { k: "institution", en: "Institution", fa: "موسسه" },
    { k: "other", en: "Other", fa: "سایر" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="sm:max-w-lg glass-strong border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-[0.18em] border-gold/40 text-gold">
            <Sparkles className="w-3 h-3 me-1" /> {fa ? "درخواست دمو" : "Request Demo"}
          </Badge>
          <DialogTitle className="font-display text-2xl">
            {fa ? "ACCA Transfer AI را از نزدیک ببینید" : "See ACCA Transfer AI in action"}
          </DialogTitle>
          <DialogDescription>
            {fa ? "اطلاعات خود را وارد کنید تا یک جلسه دمو ۲۰ دقیقه‌ای ترتیب دهیم." : "Tell us about your role and we'll book a 20-min walkthrough."}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-success/15 grid place-items-center">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <div className="mt-4 font-display text-xl">{fa ? "درخواست شما ثبت شد" : "Request received"}</div>
            <div className="mt-1.5 text-[12.5px] text-muted-foreground max-w-xs">
              {fa ? "تیم ACCA به‌زودی با شما تماس می‌گیرد." : "The ACCA team will reach out shortly."}
            </div>
            <Button onClick={closeModal} variant="outline" className="mt-6">{fa ? "بستن" : "Close"}</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="d-name">{fa ? "نام کامل" : "Full name"}</Label>
                <Input id="d-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-email">{fa ? "ایمیل" : "Email"}</Label>
                <Input id="d-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={255} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-phone">{fa ? "شماره تماس" : "Phone"}</Label>
              <Input id="d-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} placeholder="+90 ..." />
            </div>
            <div className="space-y-1.5">
              <Label>{fa ? "نوع سازمان" : "Organization type"}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {orgs.map((r) => (
                  <button
                    type="button"
                    key={r.k}
                    onClick={() => setForm({ ...form, organization: r.k })}
                    className={`text-[11.5px] px-2 py-2 rounded-lg border transition ${
                      form.organization === r.k
                        ? "border-gold/50 bg-gold/10 text-gold"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {fa ? r.fa : r.en}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{fa ? "روش ارتباطی ترجیحی" : "Preferred contact method"}</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["email", "phone", "whatsapp", "instagram"] as const).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setForm({ ...form, contactMethod: m })}
                    className={`text-[11.5px] px-2 py-2 rounded-lg border capitalize ${
                      form.contactMethod === m ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-white/10 text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-msg">{fa ? "پیام (اختیاری)" : "Message (optional)"}</Label>
              <Textarea id="d-msg" value={form.message} maxLength={600} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeModal}>{fa ? "انصراف" : "Cancel"}</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Sparkles className="w-4 h-4 me-2" />}
                {fa ? "ثبت درخواست" : "Request demo"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- View Report ---------------- */

export function ViewReportModal() {
  const { modal, closeModal } = useUI();
  const { lang } = useI18n();
  const open = modal === "report";
  const [report, setReport] = useState<TransferReport | null>(null);
  const fa = lang === "fa";

  useEffect(() => {
    if (!open) return;
    setReport(null);
    sampleReport().then(setReport);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="sm:max-w-2xl glass-strong border-white/10 max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-[0.18em] border-gold/30 text-gold">
            <FileText className="w-3 h-3 me-1" /> {fa ? "پیش‌نمایش گزارش" : "Report Preview"}
          </Badge>
          <DialogTitle className="font-display text-2xl">{fa ? "گزارش انتقالی هوشمند" : "AI Transfer Report"}</DialogTitle>
          <DialogDescription>
            {fa ? "این یک نمونه گزارش است که توسط موتور تحلیل ACCA تولید شده." : "Sample of the report ACCA's analysis engine generates for each student."}
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <div className="py-16 flex flex-col items-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
            <span className="mt-3 text-[12px]">{fa ? "در حال آماده‌سازی…" : "Preparing report…"}</span>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex items-center gap-5">
              <div className="relative w-20 h-20 rounded-full grid place-items-center bg-gradient-to-br from-gold/30 to-primary/30">
                <span className="font-display text-2xl text-foreground">{report.transferScore}%</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {fa ? "تحلیل کامل شد" : "Analysis complete"}
                </div>
                <div className="font-display text-lg text-foreground mt-0.5">{report.student.fullName}</div>
                <div className="text-[12px] text-muted-foreground truncate">
                  {report.student.currentUniversity} → {report.student.targetUniversity}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label={fa ? "دروس پذیرفته" : "Recognized"} value={`${report.recognizedCount}/${report.totalCount}`} />
              <Stat label={fa ? "ورود پیشنهادی" : "Entry"} value={report.recommendedEntryYear} />
              <Stat label={fa ? "مدارک ناقص" : "Missing"} value={String(report.missingDocuments.length)} />
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {fa ? "تطبیق دروس" : "Course matches"}
              </div>
              <div className="space-y-1.5">
                {report.matches.slice(0, 4).map((m) => (
                  <div key={m.source.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-[12.5px]">
                    <span className="flex-1 truncate text-foreground/85">{m.source.title}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="flex-1 truncate text-foreground/85">{m.target.title}</span>
                    <span className={`text-[11px] font-mono ${m.confidence >= 90 ? "text-success" : m.confidence >= 85 ? "text-cyan" : "text-warning"}`}>
                      {m.confidence}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {fa ? "دانشگاه پیشنهادی" : "Top university match"}
              </div>
              <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gold/15 grid place-items-center">
                  <GraduationCap className="w-4 h-4 text-gold" />
                </div>
                <div className="flex-1">
                  <div className="text-[14px] text-foreground">{report.universities[0].name}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {report.universities[0].matchScore}% match · {report.universities[0].recommendedYear}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="ghost" onClick={closeModal}>{fa ? "بستن" : "Close"}</Button>
          <Button variant="outline" onClick={() => toast(fa ? "این نسخه، پیش‌نمایش کامل گزارش است." : "This demo already shows the complete report preview.")}>
            <FileText className="w-4 h-4 me-2" />{fa ? "گزارش کامل" : "Full report"}
          </Button>
          <Button onClick={() => toast.success(fa ? "گزارش دانلود شد (نمونه)" : "Report downloaded (sample)")}>
            <Download className="w-4 h-4 me-2" /> PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-lg text-foreground">{value}</div>
    </div>
  );
}

/* ---------------- Requirements (View Requirements) ---------------- */

export function RequirementsModal() {
  const { modal, modalPayload, closeModal, openModal } = useUI();
  const { lang } = useI18n();
  const open = modal === "requirements";
  const fa = lang === "fa";
  const uniName = (modalPayload as { name?: string } | null)?.name ?? "Istanbul Medipol University";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="sm:max-w-xl glass-strong border-white/10 max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-[0.18em] border-gold/40 text-gold">
            <GraduationCap className="w-3 h-3 me-1" /> {fa ? "شرایط دانشگاه" : "Transfer Requirements"}
          </Badge>
          <DialogTitle className="font-display text-2xl">{uniName}</DialogTitle>
          <DialogDescription>
            {fa ? "شرایط مرجع برای انتقالی به این دانشگاه (نمونه)." : "Reference transfer requirements for this university (sample)."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-[13px]">
          {[
            { en: "Minimum GPA: 2.50 / 4.00 (or equivalent).", fa: "حداقل معدل: ۲.۵۰ از ۴.۰۰ یا معادل آن." },
            { en: "Completed at least one full academic semester at the source university.", fa: "گذراندن حداقل یک ترم کامل در دانشگاه مبدأ." },
            { en: "Course equivalency reviewed by the relevant faculty board.", fa: "بررسی معادل‌سازی دروس توسط شورای دانشکده." },
            { en: "Language proficiency: TOEFL iBT 72 / IELTS 5.5 or in-house exam.", fa: "مدرک زبان: TOEFL iBT ۷۲ / IELTS ۵.۵ یا آزمون داخلی." },
            { en: "Documents: transcript, syllabi, passport, student certificate.", fa: "مدارک: ریزنمرات، سرفصل، پاسپورت، گواهی اشتغال به تحصیل." },
            { en: "Entry placement is decided by the receiving department.", fa: "تعیین سال ورود توسط دانشکده مقصد انجام می‌شود." },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-gold shrink-0 mt-0.5" />
              <span className="text-foreground/90">{fa ? r.fa : r.en}</span>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={closeModal}>{fa ? "بستن" : "Close"}</Button>
          <Button onClick={() => { closeModal(); openModal("assessment"); }}>
            <Sparkles className="w-4 h-4 me-2" />{fa ? "بررسی شانس انتقالی" : "Check Eligibility"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Generic Lead modal: Agent Access / Partnership ---------------- */

const leadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  organization: z.string().trim().min(2).max(160),
  notes: z.string().trim().max(500).optional(),
});

function LeadModal({
  k, icon: Icon, titleEn, titleFa, descEn, descFa, ctaEn, ctaFa, orgLabel,
}: {
  k: "agentAccess" | "partnership";
  icon: React.ComponentType<{ className?: string }>;
  titleEn: string; titleFa: string;
  descEn: string; descFa: string;
  ctaEn: string; ctaFa: string;
  orgLabel: { en: string; fa: string };
}) {
  const { modal, closeModal } = useUI();
  const { lang } = useI18n();
  const open = modal === k;
  const fa = lang === "fa";
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", organization: "", notes: "" });

  useEffect(() => {
    if (!open) {
      setDone(false);
      setForm({ name: "", email: "", organization: "", notes: "" });
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      setDone(true);
      toast.success(fa ? "درخواست شما دریافت شد." : "Request received.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="sm:max-w-lg glass-strong border-white/10">
        <DialogHeader>
          <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-[0.18em] border-gold/40 text-gold">
            <Icon className="w-3 h-3 me-1" /> {fa ? titleFa : titleEn}
          </Badge>
          <DialogTitle className="font-display text-2xl">{fa ? titleFa : titleEn}</DialogTitle>
          <DialogDescription>{fa ? descFa : descEn}</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="py-8 flex flex-col items-center text-center">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <div className="mt-3 font-display text-lg">{fa ? "ممنون. به‌زودی تماس می‌گیریم." : "Thanks. We'll be in touch soon."}</div>
            <Button onClick={closeModal} variant="outline" className="mt-5">{fa ? "بستن" : "Close"}</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{fa ? "نام" : "Full name"}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} required />
              </div>
              <div className="space-y-1.5">
                <Label>{fa ? "ایمیل" : "Email"}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{fa ? orgLabel.fa : orgLabel.en}</Label>
              <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} maxLength={160} required />
            </div>
            <div className="space-y-1.5">
              <Label>{fa ? "توضیحات" : "Notes"}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeModal}>{fa ? "انصراف" : "Cancel"}</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Sparkles className="w-4 h-4 me-2" />}
                {fa ? ctaFa : ctaEn}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AgentAccessModal() {
  return (
    <LeadModal
      k="agentAccess"
      icon={Users}
      titleEn="Agent Workspace Access"
      titleFa="درخواست دسترسی ایجنت"
      descEn="Apply for early access to the ACCA agent workspace and student pipeline."
      descFa="برای دسترسی زودهنگام به فضای کاری ایجنت ACCA و خط لوله دانشجویان درخواست بدهید."
      ctaEn="Request access"
      ctaFa="درخواست دسترسی"
      orgLabel={{ en: "Agency name", fa: "نام آژانس" }}
    />
  );
}

export function PartnershipModal() {
  return (
    <LeadModal
      k="partnership"
      icon={Building2}
      titleEn="Partner With ACCA"
      titleFa="همکاری با ACCA"
      descEn="Bring your university into the ACCA AI-assisted transfer review network."
      descFa="دانشگاه خود را به شبکه بررسی انتقالی هوشمند ACCA متصل کنید."
      ctaEn="Start partnership"
      ctaFa="شروع همکاری"
      orgLabel={{ en: "University", fa: "نام دانشگاه" }}
    />
  );
}

/* ---------------- Portal Preview Modal ---------------- */

type PortalKey = "portalStudent" | "portalAgent" | "portalUniversity" | "portalAdmin";

export function PortalPreviewModal() {
  const { modal, closeModal, openModal } = useUI();
  const { lang } = useI18n();
  const fa = lang === "fa";
  const portalKeys: PortalKey[] = ["portalStudent", "portalAgent", "portalUniversity", "portalAdmin"];
  const open = modal !== null && (portalKeys as ModalKey[]).includes(modal as ModalKey);
  if (!open) return null;
  const active = modal as PortalKey;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
      <DialogContent className="sm:max-w-3xl glass-strong border-white/10 max-h-[90vh] overflow-y-auto p-0">
        <div className="px-6 pt-6">
          <DialogHeader>
            <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-[0.18em] border-gold/40 text-gold">
              <Activity className="w-3 h-3 me-1" /> {fa ? "پیش‌نمایش پورتال" : "Portal Preview"}
            </Badge>
            <DialogTitle className="font-display text-2xl">{portalTitle(active, fa)}</DialogTitle>
            <DialogDescription>{portalDesc(active, fa)}</DialogDescription>
          </DialogHeader>
        </div>

        {/* Mini tabs */}
        <div className="px-6 mt-3 flex flex-wrap gap-1.5">
          {portalKeys.map((k) => (
            <button
              key={k}
              onClick={() => openModal(k)}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition ${
                k === active ? "bg-gold/15 border-gold/40 text-gold" : "bg-white/[0.02] border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {portalShortLabel(k, fa)}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 mt-5">
          {active === "portalStudent" && <StudentPortalPreview fa={fa} />}
          {active === "portalAgent" && <AgentPortalPreview fa={fa} />}
          {active === "portalUniversity" && <UniversityPortalPreview fa={fa} />}
          {active === "portalAdmin" && <AdminPortalPreview fa={fa} />}
        </div>

        <DialogFooter className="gap-2 px-6 pb-6">
          <Button variant="ghost" onClick={closeModal}>{fa ? "بستن" : "Close"}</Button>
          <Button onClick={() => { closeModal(); openModal("demo"); }}>
            <Sparkles className="w-4 h-4 me-2" /> {fa ? "درخواست دمو" : "Request Demo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function portalTitle(k: PortalKey, fa: boolean) {
  if (k === "portalStudent") return fa ? "پورتال دانشجو" : "Student Portal";
  if (k === "portalAgent") return fa ? "پورتال ایجنت" : "Agent Portal";
  if (k === "portalUniversity") return fa ? "پورتال دانشگاه" : "University Portal";
  return fa ? "پورتال ادمین" : "Admin Portal";
}
function portalShortLabel(k: PortalKey, fa: boolean) {
  if (k === "portalStudent") return fa ? "دانشجو" : "Student";
  if (k === "portalAgent") return fa ? "ایجنت" : "Agent";
  if (k === "portalUniversity") return fa ? "دانشگاه" : "University";
  return fa ? "ادمین" : "Admin";
}
function portalDesc(k: PortalKey, fa: boolean) {
  if (k === "portalStudent") return fa ? "نمای دانشجو از وضعیت پرونده، مدارک و دانشگاه‌های پیشنهادی." : "Student-side view of application status, documents, and recommended universities.";
  if (k === "portalAgent") return fa ? "خط لوله چند دانشجو با وضعیت و امتیاز AI." : "Multi-student pipeline with status and AI scores.";
  if (k === "portalUniversity") return fa ? "صف بررسی پرونده‌ها برای دانشگاه مقصد." : "Review queue and decision tools for the receiving university.";
  return fa ? "نمای ادمین: همه پرونده‌ها، اعتبارسنجی AI و مدیریت ایجنت‌ها." : "Admin overview: all applications, AI validation queue, and agent/university management.";
}

function PortalCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function StatusDot({ tone }: { tone: "success" | "warning" | "cyan" | "muted" }) {
  const c = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : tone === "cyan" ? "bg-cyan" : "bg-muted-foreground/40";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${c}`} />;
}

function StudentPortalPreview({ fa }: { fa: boolean }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <PortalCard title={fa ? "وضعیت پرونده" : "Application status"}>
        <div className="flex items-center gap-2 text-[12.5px]"><StatusDot tone="cyan" /> {fa ? "در حال بررسی" : "In review"}</div>
        <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#D6A46B] to-[#C8965F]" style={{ width: "68%" }} /></div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">68% complete</div>
      </PortalCard>
      <PortalCard title={fa ? "امتیاز انتقالی AI" : "AI Transfer Score"}>
        <div className="font-display text-3xl text-gradient">87%</div>
        <div className="text-[11px] text-muted-foreground">Estimated match · Year 2 entry</div>
      </PortalCard>
      <PortalCard title={fa ? "مدارک" : "Uploaded documents"}>
        <ul className="space-y-1 text-[12px]">
          {[{n: "Transcript.pdf", ok: true}, {n: "Passport.jpg", ok: true}, {n: "Student Cert.pdf", ok: true}, {n: "Syllabus", ok: false}].map(d => (
            <li key={d.n} className="flex items-center justify-between"><span className="text-foreground/85">{d.n}</span>{d.ok ? <span className="text-[10px] text-success">{fa ? "تأیید" : "Verified"}</span> : <span className="text-[10px] text-warning">{fa ? "نیاز است" : "Required"}</span>}</li>
          ))}
        </ul>
      </PortalCard>
      <PortalCard title={fa ? "دانشگاه‌های پیشنهادی" : "Recommended universities"}>
        <ul className="space-y-1.5 text-[12px]">
          {["Istanbul Medipol — 87%", "Bahçeşehir — 78%", "Aydın — 82%"].map(u => (
            <li key={u} className="flex items-center justify-between"><span>{u.split(" — ")[0]}</span><span className="text-cyan font-mono text-[11px]">{u.split(" — ")[1]}</span></li>
          ))}
        </ul>
      </PortalCard>
      <PortalCard title={fa ? "اقدام بعدی" : "Next action"}>
        <div className="text-[12.5px] text-foreground/90">{fa ? "بارگذاری سرفصل دروس فیزیک ۱" : "Upload Physics I syllabus"}</div>
        <div className="mt-1 text-[11px] text-warning">{fa ? "برای رساندن امتیاز به ۹۰٪" : "To raise match above 90%"}</div>
      </PortalCard>
      <PortalCard title={fa ? "مدارک ناقص" : "Missing documents"}>
        <ul className="space-y-1 text-[12px]">
          <li className="flex items-center gap-2"><StatusDot tone="warning" /> Physics I syllabus</li>
          <li className="flex items-center gap-2"><StatusDot tone="warning" /> Language certificate</li>
        </ul>
      </PortalCard>
    </div>
  );
}

function AgentPortalPreview({ fa }: { fa: boolean }) {
  const rows = [
    { name: "Deniz A.", uni: "Medipol", score: 87, stage: fa ? "بررسی AI" : "AI Review", tone: "cyan" as const },
    { name: "Sara M.", uni: "Bahçeşehir", score: 74, stage: fa ? "نقص مدارک" : "Docs Pending", tone: "warning" as const },
    { name: "Arman T.", uni: "Aydın", score: 91, stage: fa ? "ارسال شد" : "Submitted", tone: "success" as const },
    { name: "Lina K.", uni: "Altınbaş", score: 68, stage: fa ? "پیش‌نویس" : "Draft", tone: "muted" as const },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <PortalCard title={fa ? "دانشجویان فعال" : "Active students"}><div className="font-display text-2xl text-foreground">12</div></PortalCard>
        <PortalCard title={fa ? "گزارش آماده" : "Reports ready"}><div className="font-display text-2xl text-cyan">8</div></PortalCard>
        <PortalCard title={fa ? "نقص مدارک" : "Pending docs"}><div className="font-display text-2xl text-warning">3</div></PortalCard>
      </div>
      <PortalCard title={fa ? "خط لوله دانشجویان" : "Student pipeline"}>
        <div className="overflow-hidden rounded-lg border border-white/5">
          <table className="w-full text-[12.5px]">
            <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr><th className="text-start px-3 py-2">{fa ? "دانشجو" : "Student"}</th><th className="text-start px-3 py-2">{fa ? "دانشگاه" : "Target"}</th><th className="text-start px-3 py-2">AI</th><th className="text-start px-3 py-2">{fa ? "مرحله" : "Stage"}</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} className="border-t border-white/5">
                  <td className="px-3 py-2.5 text-foreground">{r.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.uni}</td>
                  <td className="px-3 py-2.5 font-mono text-cyan">{r.score}%</td>
                  <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 text-[11px]"><StatusDot tone={r.tone} />{r.stage}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalCard>
    </div>
  );
}

function UniversityPortalPreview({ fa }: { fa: boolean }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <PortalCard title={fa ? "صف بررسی" : "Review queue"}><div className="font-display text-2xl">24</div></PortalCard>
        <PortalCard title={fa ? "بررسی‌شده امروز" : "Reviewed today"}><div className="font-display text-2xl text-success">7</div></PortalCard>
        <PortalCard title={fa ? "نیاز به مدرک" : "Needs document"}><div className="font-display text-2xl text-warning">3</div></PortalCard>
      </div>
      <PortalCard title={fa ? "خلاصه دانشجو" : "Student academic summary"}>
        <div className="grid sm:grid-cols-3 gap-3 text-[12.5px]">
          <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</div><div className="text-foreground">Deniz A.</div></div>
          <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">GPA</div><div className="text-foreground">2.91 / 4.00</div></div>
          <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Credits</div><div className="text-foreground">72 ECTS</div></div>
        </div>
      </PortalCard>
      <PortalCard title={fa ? "پیشنهاد معادل‌سازی AI" : "AI equivalency suggestions"}>
        <ul className="space-y-1.5 text-[12.5px]">
          {["Calculus I → Mathematics I (94%)", "Programming I → Intro to Programming (96%)", "Physics I → General Physics (82%)"].map(s => (
            <li key={s} className="flex items-center gap-2"><Layers3 className="w-3.5 h-3.5 text-cyan" /> {s}</li>
          ))}
        </ul>
      </PortalCard>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="bg-success text-background hover:bg-success/90"><CheckCircle2 className="w-3.5 h-3.5 me-1.5" />{fa ? "تأیید" : "Approve"}</Button>
        <Button size="sm" variant="outline" className="border-warning/40 text-warning"><FolderCheck className="w-3.5 h-3.5 me-1.5" />{fa ? "نیاز به بررسی" : "Needs Review"}</Button>
        <Button size="sm" variant="outline" className="border-destructive/40 text-destructive">{fa ? "رد" : "Reject"}</Button>
      </div>
    </div>
  );
}

function AdminPortalPreview({ fa }: { fa: boolean }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <PortalCard title={fa ? "همه پرونده‌ها" : "All applications"}><div className="font-display text-2xl">214</div></PortalCard>
        <PortalCard title={fa ? "صف اعتبارسنجی AI" : "AI validation"}><div className="font-display text-2xl text-cyan">19</div></PortalCard>
        <PortalCard title={fa ? "ایجنت‌ها" : "Agents"}><div className="font-display text-2xl">11</div></PortalCard>
        <PortalCard title={fa ? "دانشگاه‌ها" : "Universities"}><div className="font-display text-2xl">8</div></PortalCard>
      </div>
      <PortalCard title={fa ? "گزارش وضعیت" : "Status logs"}>
        <ul className="space-y-1.5 text-[12px]">
          <li className="flex items-center justify-between"><span><StatusDot tone="success" /> <span className="ms-2">AI report generated · #ACC-2841</span></span><span className="text-muted-foreground">2m</span></li>
          <li className="flex items-center justify-between"><span><StatusDot tone="warning" /> <span className="ms-2">Document missing · #ACC-2839</span></span><span className="text-muted-foreground">14m</span></li>
          <li className="flex items-center justify-between"><span><StatusDot tone="cyan" /> <span className="ms-2">University reviewing · #ACC-2820</span></span><span className="text-muted-foreground">1h</span></li>
        </ul>
      </PortalCard>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline"><ShieldCheck className="w-3.5 h-3.5 me-1.5" />{fa ? "تأیید بازبینی" : "Approve review"}</Button>
        <Button size="sm" variant="outline"><ListChecks className="w-3.5 h-3.5 me-1.5" />{fa ? "اعتبارسنجی AI" : "Validate AI"}</Button>
      </div>
    </div>
  );
}

/* ---------------- Aggregator ---------------- */

export function GlobalModals() {
  return (
    <>
      <RequestDemoModal />
      <ViewReportModal />
      <RequirementsModal />
      <AgentAccessModal />
      <PartnershipModal />
      <PortalPreviewModal />
    </>
  );
}

import type { ModalKey } from "@/lib/ui-context";
export type { ModalKey };

// Footer helper — not a modal but exported so other components can render official ACCA contact
export function ContactStrip({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const text = tone === "dark" ? "text-[#B8C5CE]" : "text-muted-foreground";
  const icon = "text-[#C8965F]";
  return (
    <div className={`space-y-2 text-[12.5px] ${text}`}>
      <div className="flex items-center gap-2"><Mail className={`w-3.5 h-3.5 ${icon}`} /><a href={`mailto:${ACCA_CONTACT.email}`} className="hover:underline">{ACCA_CONTACT.email}</a></div>
      <div className="flex items-center gap-2"><Phone className={`w-3.5 h-3.5 ${icon}`} /><a href={`tel:${ACCA_CONTACT.phone.replace(/\s|\(|\)/g, "")}`} className="hover:underline">{ACCA_CONTACT.phone}</a></div>
      <div className="flex items-start gap-2"><MapPin className={`w-3.5 h-3.5 ${icon} mt-0.5 shrink-0`} /><span>{ACCA_CONTACT.address}</span></div>
      <div className="flex items-center gap-2"><Camera className={`w-3.5 h-3.5 ${icon}`} /><a href={ACCA_CONTACT.instagramUrl} target="_blank" rel="noreferrer" className="hover:underline">@{ACCA_CONTACT.instagram}</a></div>
    </div>
  );
}
