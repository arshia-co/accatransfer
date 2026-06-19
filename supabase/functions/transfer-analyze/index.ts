import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyTurnstile } from "../_shared/security.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const allowedOrigins = new Set([
  "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://localhost:5173", "http://localhost:5174",
  "https://accatransfer.com", "https://www.accatransfer.com",
  ...(Deno.env.get("APP_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
]);

function responseHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://accatransfer.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(req) });
}
function extractText(data: Record<string, unknown>) {
  if (typeof data.output_text === "string") return data.output_text;
  return (Array.isArray(data.output) ? data.output : [])
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((item: any) => item?.type === "output_text")
    .map((item: any) => item.text).join("");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function readSignedFileData(signedUrl: string, mimeType: string | null) {
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("Could not read the private document for transfer analysis.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  return `data:${mimeType || "application/octet-stream"};base64,${bytesToBase64(bytes)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (!OPENAI_API_KEY) return json(req, { error: "AI service is not configured." }, 503);
  const authorization = req.headers.get("authorization");
  if (!authorization) return json(req, { error: "Authentication required" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json(req, { error: "Invalid session" }, 401);

  let payload: { assessmentId?: string; documentId?: string; turnstileToken?: string };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }
  const security = await verifyTurnstile(req, payload.turnstileToken, "transfer_analyze");
  if (!security.ok) {
    return json(req, { error: security.message || "Security check failed." }, security.status || 403);
  }
  if (!payload.assessmentId || !payload.documentId) return json(req, { error: "Assessment and document are required" }, 400);

  const [{ data: assessment, error: assessmentError }, { data: document, error: documentError }] = await Promise.all([
    supabase.from("transfer_assessments").select("*").eq("id", payload.assessmentId).single(),
    supabase.from("student_documents").select("*").eq("id", payload.documentId).eq("product", "ai_transfer").single(),
  ]);
  if (assessmentError || documentError || !assessment || !document) return json(req, { error: "The requested private record was not found." }, 404);

  await supabase.from("transfer_assessments").update({ status: "analyzing" }).eq("id", assessment.id);
  await supabase.from("student_documents").update({ status: "processing" }).eq("id", document.id);
  let fileContent: Record<string, unknown> | null = null;
  if (!document.ai_extraction) {
    const { data: signed, error: signedError } = await supabase.storage.from(document.bucket_id).createSignedUrl(document.object_path, 300);
    if (signedError || !signed?.signedUrl) return json(req, { error: "Could not prepare the document." }, 500);
    const fileData = await readSignedFileData(signed.signedUrl, document.mime_type);
    fileContent = document.mime_type === "application/pdf"
      ? {
        type: "input_file",
        filename: document.original_name || "student-transcript.pdf",
        file_data: fileData,
      }
      : { type: "input_image", image_url: fileData, detail: "high" };
  }

  const extractionContext = document.ai_extraction
    ? JSON.stringify(document.ai_extraction).slice(0, 120_000)
    : "No separate OCR result is available. Read the attached private document directly.";
  const prompt = `Review this academic document for an explainable preliminary university-transfer assessment.
Current university: ${assessment.current_university ?? "not provided"}
Current program: ${assessment.current_program ?? "not provided"}
Target country: ${assessment.target_country ?? "not provided"}
Target university: ${assessment.target_university ?? "not provided"}
Target program: ${assessment.target_program ?? "not provided"}
Document review status: ${document.review_status ?? "not reviewed"}
OCR confidence: ${document.ocr_confidence ?? "not available"}
Structured OCR result: ${extractionContext}

Analysis rules:
- Act as an academic transfer pre-review assistant, not a final admissions authority.
- Separate facts extracted from the document, facts provided by the student, AI estimates, items requiring human review, and items reserved for the university.
- Use the structured OCR result as preliminary evidence, not verified truth.
- Never invent unreadable values, university rules, deadlines, tuition, recognition status, course equivalency, or admission outcomes.
- Transfer match estimates suitability for review. AI confidence measures the reliability of the available evidence. Never combine these into one concept.
- Lower confidence when the transcript is unconfirmed, incomplete, low quality, missing credits, missing GPA scale, or queued for human review.
- Only suggest course recognition when a source course is visible. Without a target curriculum or syllabus, use "Insufficient Data" or "Needs Syllabus Review".
- Entry level is advisory and must be based on visible credits, course volume, and missing core-course risk.
- Recommend human ACCA advisor review for regulated fields, uncertain equivalency, recognition concerns, failed/repeated core courses, or any submission-ready request.
- Never say accepted, eligible, approved, guaranteed, or officially recognized.
- Return concise student-facing text in Persian when the supplied case data is predominantly Persian; otherwise use English.
- Return only valid JSON matching the schema.`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: `You are ACCA AI Transfer, a careful academic transfer analyst and admissions pre-review assistant.
Your work is advisory, cautious, explainable, and human-reviewable.
The receiving university always decides admission, course recognition, and year placement.
Use confidence labels and clearly communicate missing evidence.`,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            ...(fileContent ? [fileContent] : []),
          ],
        }],
        text: { format: {
          type: "json_schema", name: "transfer_preliminary_result", strict: true,
          schema: {
            type: "object", additionalProperties: false,
            properties: {
              headline: { type: "string" }, overview: { type: "string" },
              document_quality: { type: "string", enum: ["clear", "partially_readable", "insufficient"] },
              detected_program: { type: ["string", "null"] }, detected_gpa: { type: ["string", "null"] },
              detected_gpa_scale: { type: ["string", "null"] },
              detected_completed_credits: { type: ["string", "null"] },
              completed_course_count: { type: ["integer", "null"] },
              estimated_transfer_match: { type: "integer", minimum: 0, maximum: 100 },
              ai_confidence: { type: "string", enum: ["High", "Medium", "Low"] },
              risk_level: { type: "string", enum: ["High", "Medium", "Low"] },
              estimated_entry_level: { type: "string" },
              likely_recognized_courses: { type: "string" },
              preliminary_transfer_fit: {
                type: "string",
                enum: [
                  "Strong Candidate for Transfer Review",
                  "Good Candidate with Document Review Needed",
                  "Possible Candidate with Significant Risks",
                  "Weak Transfer Fit",
                  "Not Enough Data",
                ],
              },
              strengths: { type: "array", items: { type: "string" }, maxItems: 4 },
              missing_information: { type: "array", items: { type: "string" }, maxItems: 5 },
              missing_documents: {
                type: "array",
                maxItems: 8,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    document_name: { type: "string" },
                    reason: { type: "string" },
                    priority: { type: "string", enum: ["High", "Medium", "Low"] },
                    needed_when: { type: "string", enum: ["Now", "Before advisor review", "Before university submission"] },
                    affects_confidence: { type: "boolean" },
                  },
                  required: ["document_name", "reason", "priority", "needed_when", "affects_confidence"],
                },
              },
              risk_factors: {
                type: "array",
                maxItems: 8,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    explanation: { type: "string" },
                    severity: { type: "string", enum: ["High", "Medium", "Low"] },
                    recommended_action: { type: "string" },
                  },
                  required: ["title", "explanation", "severity", "recommended_action"],
                },
              },
              course_equivalency_preview: {
                type: "array",
                maxItems: 12,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    source_course: { type: "string" },
                    suggested_target_course: { type: ["string", "null"] },
                    match_score: { type: ["integer", "null"], minimum: 0, maximum: 100 },
                    confidence: { type: "string", enum: ["High", "Medium", "Low"] },
                    status: {
                      type: "string",
                      enum: [
                        "Likely Recognized",
                        "Needs Syllabus Review",
                        "Needs Human Review",
                        "Weak Match",
                        "Not Recommended for Recognition",
                        "Insufficient Data",
                      ],
                    },
                    explanation: { type: "string" },
                    required_next_action: { type: "string" },
                  },
                  required: [
                    "source_course",
                    "suggested_target_course",
                    "match_score",
                    "confidence",
                    "status",
                    "explanation",
                    "required_next_action",
                  ],
                },
              },
              source_boundaries: {
                type: "object",
                additionalProperties: false,
                properties: {
                  confirmed_from_document: { type: "array", items: { type: "string" }, maxItems: 8 },
                  provided_by_student: { type: "array", items: { type: "string" }, maxItems: 8 },
                  estimated_by_ai: { type: "array", items: { type: "string" }, maxItems: 8 },
                  requires_human_review: { type: "array", items: { type: "string" }, maxItems: 8 },
                  requires_university_decision: { type: "array", items: { type: "string" }, maxItems: 8 },
                },
                required: [
                  "confirmed_from_document",
                  "provided_by_student",
                  "estimated_by_ai",
                  "requires_human_review",
                  "requires_university_decision",
                ],
              },
              next_steps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
              human_review_status: {
                type: "string",
                enum: [
                  "Needs document completion first",
                  "Advisor review recommended",
                  "Ready for advisor review",
                  "Ready for university pre-review",
                ],
              },
              admission_reality_note: { type: "string" },
            },
            required: [
              "headline",
              "overview",
              "document_quality",
              "detected_program",
              "detected_gpa",
              "detected_gpa_scale",
              "detected_completed_credits",
              "completed_course_count",
              "estimated_transfer_match",
              "ai_confidence",
              "risk_level",
              "estimated_entry_level",
              "likely_recognized_courses",
              "preliminary_transfer_fit",
              "strengths",
              "missing_information",
              "missing_documents",
              "risk_factors",
              "course_equivalency_preview",
              "source_boundaries",
              "next_steps",
              "human_review_status",
              "admission_reality_note",
            ],
          },
        }},
        max_output_tokens: 2600,
        store: false,
      }),
    });
    if (!response.ok) {
      console.error("OpenAI analysis failed", response.status, await response.text());
      await supabase.from("transfer_assessments").update({ status: "documents_ready" }).eq("id", assessment.id);
      await supabase.from("student_documents").update({ status: "uploaded" }).eq("id", document.id);
      return json(req, { error: "AI analysis is temporarily unavailable." }, 502);
    }
    const result = JSON.parse(extractText(await response.json()));
    await Promise.all([
      supabase.from("transfer_assessments").update({ status: "preliminary_result", ai_result: result }).eq("id", assessment.id),
      supabase.from("student_documents").update({ status: "review_ready" }).eq("id", document.id),
    ]);
    return json(req, { result, model: OPENAI_MODEL });
  } catch (error) {
    console.error("transfer-analyze failed", error);
    await supabase.from("transfer_assessments").update({ status: "documents_ready" }).eq("id", assessment.id);
    await supabase.from("student_documents").update({ status: "uploaded" }).eq("id", document.id);
    return json(req, { error: "Unexpected analysis error." }, 500);
  }
});
