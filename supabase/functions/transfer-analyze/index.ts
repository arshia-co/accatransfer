import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.4-mini";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const allowedOrigins = new Set([
  "http://127.0.0.1:5173", "http://localhost:5173",
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

  let payload: { assessmentId?: string; documentId?: string };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }
  if (!payload.assessmentId || !payload.documentId) return json(req, { error: "Assessment and document are required" }, 400);

  const [{ data: assessment, error: assessmentError }, { data: document, error: documentError }] = await Promise.all([
    supabase.from("transfer_assessments").select("*").eq("id", payload.assessmentId).single(),
    supabase.from("student_documents").select("*").eq("id", payload.documentId).eq("product", "ai_transfer").single(),
  ]);
  if (assessmentError || documentError || !assessment || !document) return json(req, { error: "The requested private record was not found." }, 404);

  await supabase.from("transfer_assessments").update({ status: "analyzing" }).eq("id", assessment.id);
  await supabase.from("student_documents").update({ status: "processing" }).eq("id", document.id);
  const { data: signed, error: signedError } = await supabase.storage.from(document.bucket_id).createSignedUrl(document.object_path, 300);
  if (signedError || !signed?.signedUrl) return json(req, { error: "Could not prepare the document." }, 500);

  const fileContent = document.mime_type === "application/pdf"
    ? { type: "input_file", file_url: signed.signedUrl }
    : { type: "input_image", image_url: signed.signedUrl, detail: "high" };
  const prompt = `Review this academic document for preliminary transfer guidance.
Current university: ${assessment.current_university ?? "not provided"}
Current program: ${assessment.current_program ?? "not provided"}
Target country: ${assessment.target_country ?? "not provided"}
Target program: ${assessment.target_program ?? "not provided"}
Be conservative and do not invent unreadable values. This is educational guidance, not official OCR, course equivalency, admission, or a university decision. Return only valid JSON.`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: "You are ACCA AI Transfer, a careful international university transfer guidance assistant.",
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }, fileContent] }],
        text: { format: {
          type: "json_schema", name: "transfer_preliminary_result", strict: true,
          schema: {
            type: "object", additionalProperties: false,
            properties: {
              headline: { type: "string" }, overview: { type: "string" },
              document_quality: { type: "string", enum: ["clear", "partially_readable", "insufficient"] },
              detected_program: { type: ["string", "null"] }, detected_gpa: { type: ["string", "null"] },
              completed_course_count: { type: ["integer", "null"] },
              preliminary_transfer_fit: { type: "string", enum: ["promising", "needs_review", "insufficient_information"] },
              strengths: { type: "array", items: { type: "string" }, maxItems: 4 },
              missing_information: { type: "array", items: { type: "string" }, maxItems: 5 },
              next_steps: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
              admission_reality_note: { type: "string" },
            },
            required: ["headline", "overview", "document_quality", "detected_program", "detected_gpa", "completed_course_count", "preliminary_transfer_fit", "strengths", "missing_information", "next_steps", "admission_reality_note"],
          },
        }},
        max_output_tokens: 1100,
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
      supabase.from("student_documents").update({ status: "review_ready", ai_extraction: result }).eq("id", document.id),
    ]);
    return json(req, { result, model: OPENAI_MODEL });
  } catch (error) {
    console.error("transfer-analyze failed", error);
    await supabase.from("transfer_assessments").update({ status: "documents_ready" }).eq("id", assessment.id);
    await supabase.from("student_documents").update({ status: "uploaded" }).eq("id", document.id);
    return json(req, { error: "Unexpected analysis error." }, 500);
  }
});
