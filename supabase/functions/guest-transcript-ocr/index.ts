import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyTurnstile } from "../_shared/security.ts";

// Public, no-auth transcript reader for the GUEST "Check Eligibility" flow.
// The image is sent directly (data URL), read by the OpenAI vision model, and
// the courses/grades/GPA are returned for the student to CONFIRM — nothing is
// persisted (store:false, no storage, no DB). The private post-login pipeline
// stays in `document-ocr`; this is a lightweight pre-login estimate only.

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_OCR_MODEL")
  ?? Deno.env.get("OPENAI_MODEL")
  ?? "gpt-4o-mini";
const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://accatransfer.com",
  "https://www.accatransfer.com",
  ...(Deno.env.get("APP_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
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

function extractResponseText(data: Record<string, unknown>) {
  if (typeof data.output_text === "string") return data.output_text;
  return (Array.isArray(data.output) ? data.output : [])
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .filter((item: any) => item?.type === "output_text")
    .map((item: any) => item.text)
    .join("");
}

function transcriptSchema() {
  const nullableString = { type: ["string", "null"] };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      is_transcript: { type: "boolean" },
      gpa: nullableString,
      gpa_scale: nullableString,
      courses: {
        type: "array",
        maxItems: 60,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            grade: nullableString,
            credits: nullableString,
            is_core: { type: "boolean" },
          },
          required: ["title", "grade", "credits", "is_core"],
        },
      },
      confidence: { type: "integer", minimum: 0, maximum: 100 },
      note: { type: "string" },
    },
    required: ["is_transcript", "gpa", "gpa_scale", "courses", "confidence", "note"],
  };
}

const PROMPT = `Read this student academic transcript and extract its courses and grades for a preliminary, pre-login transfer estimate.
Rules:
- Text may be Persian, English, Turkish, Arabic, or mixed.
- Extract every clearly readable course with its grade exactly as written. Never invent a value; use null for an unreadable grade.
- Extract each course credit/ECTS/AKTS value if present; use null when not clearly tied to that course.
- Set is_core=true for the main/specialised courses of the student's major; set is_core=false for general courses (e.g. history, physical education, general electives).
- Extract the overall GPA and its scale if present.
- If the transcript contains a grading legend, use it to understand the scale, but keep course grades exactly as printed (for example AA, BA, BB, CB, CC, DC, DD, FF).
- If the image is not a transcript, set is_transcript=false and return an empty courses array.
- This is a preliminary educational estimate, not official verification or a guaranteed result.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (!OPENAI_API_KEY) return json(req, { error: "AI service is not configured." }, 500);

  let body: { imageBase64?: string; mimeType?: string; turnstileToken?: string };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }

  // Anti-bot gate — verified BEFORE any OpenAI call so a failed/missing token
  // never spends AI tokens.
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  const security = await verifyTurnstile(req, turnstileToken, "transfer_upload");
  if (!security.ok) {
    return json(req, { error: security.message || "Security check failed. Please refresh and try again." }, security.status || 403);
  }

  const dataUrl = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
  if (!dataUrl.startsWith("data:")) return json(req, { error: "A transcript image is required." }, 400);
  // ~9 MB base64 ceiling to bound cost/abuse on this public endpoint.
  if (dataUrl.length > 12_000_000) return json(req, { error: "Image is too large (max ~8MB)." }, 413);

  const isPdf = mimeType === "application/pdf";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: "You are a careful multilingual transcript reader for international education.",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: PROMPT },
            isPdf
              ? { type: "input_file", filename: "guest-transcript.pdf", file_data: dataUrl }
              : { type: "input_image", image_url: dataUrl, detail: "high" },
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "acca_guest_transcript",
            strict: true,
            schema: transcriptSchema(),
          },
        },
        max_output_tokens: 4000,
        store: false,
      }),
    });

    if (!response.ok) {
      console.error("guest-transcript-ocr OpenAI failed", response.status, await response.text());
      return json(req, { error: "Reading the transcript is temporarily unavailable." }, 502);
    }

    const result = JSON.parse(extractResponseText(await response.json()));
    return json(req, { result });
  } catch (error) {
    console.error("guest-transcript-ocr error", error);
    return json(req, { error: "Could not read the transcript." }, 502);
  }
});
