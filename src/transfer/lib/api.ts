// Frontend-only mock API. Each function returns a Promise so swapping for
// `fetch(...)` or a TanStack server fn later is a one-line change per call.

import type {
  CourseMatch, Student, TransferReport, University, Document, DocumentKind,
} from "./types";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const SAMPLE_MATCHES: CourseMatch[] = [
  { source: { id: "1", title: "Calculus I", credits: 4 }, target: { id: "t1", title: "Mathematics I", credits: 5 }, confidence: 94, reason: "Syllabus and credit overlap > 90%." },
  { source: { id: "2", title: "Programming I", credits: 4 }, target: { id: "t2", title: "Intro to Programming", credits: 4 }, confidence: 96, reason: "Identical learning outcomes." },
  { source: { id: "3", title: "Physics I", credits: 4 }, target: { id: "t3", title: "General Physics", credits: 5 }, confidence: 82, reason: "Missing lab component verification." },
  { source: { id: "4", title: "Academic English", credits: 3 }, target: { id: "t4", title: "English for Engineers", credits: 3 }, confidence: 88, reason: "Equivalent CEFR target level." },
  { source: { id: "5", title: "Linear Algebra", credits: 4 }, target: { id: "t5", title: "Linear Algebra", credits: 4 }, confidence: 91, reason: "Direct topic match." },
];

const SAMPLE_UNIS: University[] = [
  { id: "medipol", name: "Istanbul Medipol University", country: "Turkey", matchScore: 87, recognizedCourses: 12, totalCourses: 18, recommendedYear: "Year 2", fit: "strong" },
  { id: "bahcesehir", name: "Bahçeşehir University", country: "Turkey", matchScore: 78, recognizedCourses: 10, totalCourses: 18, recommendedYear: "Year 1 or 2", fit: "good" },
  { id: "aydin", name: "Istanbul Aydın University", country: "Turkey", matchScore: 82, recognizedCourses: 11, totalCourses: 18, recommendedYear: "Year 2", fit: "good" },
  { id: "altinbas", name: "Altınbaş University", country: "Turkey", matchScore: 74, recognizedCourses: 9, totalCourses: 18, recommendedYear: "Year 1", fit: "moderate" },
];

export async function uploadDocument(kind: DocumentKind, file: File): Promise<Document> {
  await delay(600);
  return {
    id: crypto.randomUUID(),
    kind,
    name: file.name,
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
    status: "uploaded",
  };
}

export async function requestDemo(payload: { name: string; email: string; role: string; message?: string }): Promise<{ ok: true }> {
  await delay(900);
  void payload;
  return { ok: true };
}

export async function generateTransferReport(student: Partial<Student>): Promise<TransferReport> {
  await delay(400);
  return {
    id: "RPT-2026-0042",
    createdAt: new Date().toISOString(),
    status: "in_review",
    transferScore: 87,
    recognizedCount: 12,
    totalCount: 18,
    missingDocuments: ["syllabus", "language_certificate"],
    recommendedEntryYear: "Year 2",
    matches: SAMPLE_MATCHES,
    universities: SAMPLE_UNIS,
    notes: [
      "Strong eligibility for Year 2 entry at Istanbul Medipol.",
      "Upload Physics I syllabus to lift score above 90%.",
    ],
    student: {
      id: "stu_demo",
      fullName: student.fullName ?? "Demo Student",
      email: student.email ?? "demo@acca.ai",
      phone: student.phone,
      currentUniversity: student.currentUniversity ?? "—",
      currentDepartment: student.currentDepartment ?? "—",
      gpa: Number(student.gpa ?? 3.4),
      completedCredits: Number(student.completedCredits ?? 64),
      targetCountry: student.targetCountry ?? "Turkey",
      targetUniversity: student.targetUniversity ?? "Istanbul Medipol University",
      targetDepartment: student.targetDepartment ?? "Computer Engineering",
    },
  };
}

export const sampleReport = () => generateTransferReport({});
