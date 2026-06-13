// Core domain types for ACCA Transfer AI.
// Shape mirrors what real backend endpoints will eventually return,
// so swapping fake handlers in `src/lib/api.ts` for HTTP calls is mechanical.

export type ApplicationStatus =
  | "draft"
  | "documents_pending"
  | "ai_analysis"
  | "in_review"
  | "approved"
  | "rejected";

export type DocumentKind =
  | "transcript"
  | "passport"
  | "student_certificate"
  | "syllabus"
  | "language_certificate"
  | "other";

export interface Document {
  id: string;
  kind: DocumentKind;
  name: string;
  sizeBytes: number;
  uploadedAt: string; // ISO
  status: "pending" | "uploaded" | "verified" | "rejected";
}

export interface Course {
  id: string;
  code?: string;
  title: string;
  credits: number;
  grade?: string;
  semester?: string;
}

export interface University {
  id: string;
  name: string;
  country: string;
  matchScore: number; // 0-100
  recognizedCourses: number;
  totalCourses: number;
  recommendedYear: string;
  fit: "strong" | "good" | "moderate" | "low";
}

export interface CourseMatch {
  source: Course;
  target: Course;
  confidence: number; // 0-100
  reason: string;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  currentUniversity: string;
  currentDepartment: string;
  gpa: number;
  completedCredits: number;
  targetCountry: string;
  targetUniversity: string;
  targetDepartment: string;
}

export interface TransferReport {
  id: string;
  student: Student;
  status: ApplicationStatus;
  createdAt: string;
  transferScore: number; // 0-100
  recognizedCount: number;
  totalCount: number;
  missingDocuments: DocumentKind[];
  recommendedEntryYear: string;
  matches: CourseMatch[];
  universities: University[];
  notes: string[];
}
