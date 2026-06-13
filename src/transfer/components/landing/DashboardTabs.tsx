import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useUI } from "@/lib/ui-context";
import { sampleReport } from "@/lib/api";
import type { TransferReport } from "@/lib/types";
import { SectionHeading } from "./Sections";
import {
  CheckCircle2, FileText, GraduationCap, Layers3, ListChecks,
  Loader2, Sparkles,
} from "lucide-react";

export function DashboardTabsSection() {
  const { lang } = useI18n();
  const { openModal } = useUI();
  const [report, setReport] = useState<TransferReport | null>(null);
  const fa = lang === "fa";

  useEffect(() => {
    sampleReport().then(setReport);
  }, []);

  return (
    <section id="students" className="relative py-28 px-6">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow={fa ? "داشبورد دانشجو" : "Student Dashboard"}
          title={fa ? "همه چیز در یک نمای روشن." : "Every transfer signal, in one view."}
          sub={fa
            ? "از وضعیت پرونده تا تطبیق دروس و دانشگاه‌های پیشنهادی — همه چیز برای تصمیم‌گیری سریع."
            : "From application status to course matches and university shortlists — built for fast decisions."}
        />

        <div className="mt-12 glass-strong rounded-3xl p-3 sm:p-6 shadow-cinema ring-glow">
          <Tabs defaultValue="overview">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="-mx-1 px-1 overflow-x-auto no-scrollbar">
                <TabsList className="bg-white/[0.04] border border-white/10 p-1 flex w-max">
                  <TabsTrigger value="overview" className="whitespace-nowrap"><Sparkles className="w-3.5 h-3.5 me-1.5" />{fa ? "خلاصه" : "Overview"}</TabsTrigger>
                  <TabsTrigger value="courses" className="whitespace-nowrap"><Layers3 className="w-3.5 h-3.5 me-1.5" />{fa ? "دروس" : "Courses"}</TabsTrigger>
                  <TabsTrigger value="documents" className="whitespace-nowrap"><ListChecks className="w-3.5 h-3.5 me-1.5" />{fa ? "مدارک" : "Documents"}</TabsTrigger>
                  <TabsTrigger value="universities" className="whitespace-nowrap"><GraduationCap className="w-3.5 h-3.5 me-1.5" />{fa ? "دانشگاه‌ها" : "Universities"}</TabsTrigger>
                </TabsList>
              </div>
              <Button size="sm" variant="outline" onClick={() => openModal("report")} className="w-full md:w-auto justify-center">
                <FileText className="w-3.5 h-3.5 me-1.5" /> {fa ? "مشاهده گزارش" : "View Report"}
              </Button>
            </div>

            {!report ? (
              <div className="py-20 flex justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-cyan" />
              </div>
            ) : (
              <>
                <TabsContent value="overview" className="mt-6">
                  <div className="grid lg:grid-cols-3 gap-4">
                    <Card title={fa ? "امتیاز انتقالی" : "Transfer Score"} accent>
                      <div className="font-display text-5xl text-gradient">{report.transferScore}%</div>
                      <Progress value={report.transferScore} className="mt-3 h-1.5" />
                      <div className="mt-2 text-[11.5px] text-muted-foreground">{report.notes[0]}</div>
                    </Card>
                    <Card title={fa ? "وضعیت پرونده" : "Application Status"}>
                      <Badge className="bg-cyan/15 text-cyan border-cyan/30">{report.status.replace("_", " ")}</Badge>
                      <ul className="mt-3 space-y-2 text-[12.5px]">
                        {[
                          { d: true,  l: fa ? "آپلود مدارک" : "Documents uploaded" },
                          { d: true,  l: fa ? "تحلیل AI" : "AI analysis" },
                          { d: false, l: fa ? "بررسی دانشگاه" : "University review" },
                        ].map((s) => (
                          <li key={s.l} className="flex items-center gap-2">
                            <CheckCircle2 className={`w-3.5 h-3.5 ${s.d ? "text-success" : "text-muted-foreground/50"}`} />
                            <span className={s.d ? "text-foreground" : "text-muted-foreground"}>{s.l}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                    <Card title={fa ? "خلاصه" : "Quick Stats"}>
                      <div className="grid grid-cols-2 gap-2">
                        <Stat label={fa ? "دروس پذیرفته" : "Recognized"} value={`${report.recognizedCount}/${report.totalCount}`} />
                        <Stat label={fa ? "ورود" : "Entry"} value={report.recommendedEntryYear} />
                        <Stat label={fa ? "معدل" : "GPA"} value={report.student.gpa.toFixed(2)} />
                        <Stat label={fa ? "واحدها" : "Credits"} value={String(report.student.completedCredits)} />
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="courses" className="mt-6">
                  <div className="overflow-x-auto no-scrollbar rounded-xl border border-white/10">
                    <table className="w-full min-w-[560px] text-[13px]">
                      <thead className="bg-white/[0.04] text-muted-foreground text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="text-start px-4 py-3">{fa ? "درس فعلی" : "Source course"}</th>
                          <th className="text-start px-4 py-3">{fa ? "درس مقصد" : "Target course"}</th>
                          <th className="text-start px-4 py-3">{fa ? "دلیل" : "Reason"}</th>
                          <th className="text-end px-4 py-3">{fa ? "اطمینان" : "Confidence"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.matches.map((m) => (
                          <tr key={m.source.id} className="border-t border-white/5">
                            <td className="px-4 py-3 text-foreground/90">{m.source.title}</td>
                            <td className="px-4 py-3 text-foreground/90">{m.target.title}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.reason}</td>
                            <td className={`px-4 py-3 text-end font-mono ${m.confidence >= 90 ? "text-success" : m.confidence >= 85 ? "text-cyan" : "text-warning"}`}>{m.confidence}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-6">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { name: "Transcript.pdf", ok: true },
                      { name: "Passport.jpg", ok: true },
                      { name: "Student Certificate.pdf", ok: true },
                      { name: "Syllabus.pdf", ok: false },
                      { name: "Language Certificate", ok: false },
                    ].map((d) => (
                      <div key={d.name} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${d.ok ? "border-success/20 bg-success/5" : "border-warning/20 bg-warning/5"}`}>
                        <CheckCircle2 className={`w-4 h-4 ${d.ok ? "text-success" : "text-warning/70"}`} />
                        <div className="flex-1 text-[13px] text-foreground">{d.name}</div>
                        <span className={`text-[10px] uppercase tracking-wider ${d.ok ? "text-success" : "text-warning"}`}>{d.ok ? (fa ? "دریافت شد" : "Received") : (fa ? "نیاز است" : "Required")}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="universities" className="mt-6">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {report.universities.map((u) => (
                      <div key={u.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-[14px] text-foreground">{u.name}</div>
                          <span className="font-mono text-cyan text-sm">{u.matchScore}%</span>
                        </div>
                        <Progress value={u.matchScore} className="mt-2 h-1" />
                        <div className="mt-2 text-[11.5px] text-muted-foreground">
                          {u.recognizedCourses}/{u.totalCourses} {fa ? "دروس · " : "courses · "}{u.recommendedYear}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
    </section>
  );
}

function Card({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? "border-cyan/20 bg-cyan/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-2.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-[14px] text-foreground font-display">{value}</div>
    </div>
  );
}
