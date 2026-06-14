import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_OCR_MODEL")
  ?? Deno.env.get("OPENAI_MODEL")
  ?? "gpt-5.4-mini";
const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY");
const OCR_PROVIDER = Deno.env.get("OCR_PROVIDER") ?? "auto";
const CRM_SYNC_WEBHOOK_URL = Deno.env.get("CRM_SYNC_WEBHOOK_URL");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "https://accatransfer.com",
  "https://www.accatransfer.com",
  ...(Deno.env.get("APP_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]);

type DocumentRow = {
  id: string;
  user_id: string;
  product: "smart_apply" | "ai_transfer";
  document_kind: string;
  bucket_id: string;
  object_path: string;
  original_name: string;
  mime_type: string | null;
  quality_report: Record<string, unknown> | null;
};

function responseHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://accatransfer.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(req),
  });
}

function extractResponseText(data: Record<string, unknown>) {
  if (typeof data.output_text === "string") return data.output_text;
  return (Array.isArray(data.output) ? data.output : [])
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((item: any) => item?.type === "output_text")
    .map((item: any) => item.text)
    .join("");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function extractionSchema() {
  const nullableString = { type: ["string", "null"] };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      detected_document_type: {
        type: "string",
        enum: [
          "passport",
          "transcript",
          "diploma",
          "language_certificate",
          "student_certificate",
          "syllabus",
          "photo",
          "other",
          "unreadable",
        ],
      },
      matches_expected_type: { type: "boolean" },
      detected_languages: {
        type: "array",
        items: { type: "string" },
        maxItems: 6,
      },
      quality: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: { type: "string", enum: ["good", "review", "poor"] },
          score: { type: "integer", minimum: 0, maximum: 100 },
          issues: { type: "array", items: { type: "string" }, maxItems: 8 },
          student_action: { type: "string" },
          page_count: { type: ["integer", "null"] },
        },
        required: ["status", "score", "issues", "student_action", "page_count"],
      },
      fields: {
        type: "object",
        additionalProperties: false,
        properties: {
          student_name: nullableString,
          institution: nullableString,
          program: nullableString,
          document_number: nullableString,
          date_of_birth: nullableString,
          issue_date: nullableString,
          graduation_date: nullableString,
          gpa: nullableString,
          gpa_scale: nullableString,
          total_credits: nullableString,
          language_score: nullableString,
        },
        required: [
          "student_name",
          "institution",
          "program",
          "document_number",
          "date_of_birth",
          "issue_date",
          "graduation_date",
          "gpa",
          "gpa_scale",
          "total_credits",
          "language_score",
        ],
      },
      courses: {
        type: "array",
        maxItems: 80,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            code: nullableString,
            title: { type: "string" },
            credits: nullableString,
            grade: nullableString,
            semester: nullableString,
          },
          required: ["code", "title", "credits", "grade", "semester"],
        },
      },
      text_excerpt: { type: "string" },
      missing_or_unreadable_fields: {
        type: "array",
        items: { type: "string" },
        maxItems: 20,
      },
      warnings: { type: "array", items: { type: "string" }, maxItems: 12 },
      overall_confidence: { type: "integer", minimum: 0, maximum: 100 },
      requires_student_confirmation: { type: "boolean" },
      requires_human_review: { type: "boolean" },
      summary: { type: "string" },
    },
    required: [
      "detected_document_type",
      "matches_expected_type",
      "detected_languages",
      "quality",
      "fields",
      "courses",
      "text_excerpt",
      "missing_or_unreadable_fields",
      "warnings",
      "overall_confidence",
      "requires_student_confirmation",
      "requires_human_review",
      "summary",
    ],
  };
}

async function runGoogleVision(signedUrl: string) {
  if (!GOOGLE_VISION_API_KEY) return null;
  const source = await fetch(signedUrl);
  if (!source.ok) throw new Error("Could not read the private image for OCR.");
  const bytes = new Uint8Array(await source.arrayBuffer());
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(GOOGLE_VISION_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: bytesToBase64(bytes) },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["fa", "en", "tr", "ar"] },
        }],
      }),
    },
  );
  if (!response.ok) {
    console.error("Google Vision OCR failed", response.status);
    throw new Error("Google Vision OCR failed.");
  }
  const payload = await response.json();
  const result = payload.responses?.[0];
  if (result?.error) throw new Error(result.error.message || "Google Vision OCR failed.");
  return {
    text: String(result?.fullTextAnnotation?.text ?? ""),
    pageCount: Array.isArray(result?.fullTextAnnotation?.pages)
      ? result.fullTextAnnotation.pages.length
      : null,
  };
}

async function structureWithOpenAI({
  document,
  signedUrl,
  googleText,
}: {
  document: DocumentRow;
  signedUrl: string;
  googleText: { text: string; pageCount: number | null } | null;
}) {
  if (!OPENAI_API_KEY) throw new Error("AI service is not configured.");

  const prompt = `Extract this student document conservatively for ACCA educational workflows.
Product: ${document.product}
Expected document kind: ${document.document_kind}
Original filename: ${document.original_name}
Client quality preflight: ${JSON.stringify(document.quality_report ?? {})}

Rules:
- The document may contain Persian, English, Turkish, Arabic, or mixed text.
- Never invent an unreadable value. Use null and list it as missing or unreadable.
- Preserve names, dates, document numbers, GPA, grades, credits, and course titles exactly.
- For a transcript, extract every clearly readable course row, up to 80.
- Check whether the actual document matches the expected kind.
- Treat all identity, academic, and score fields as requiring student confirmation.
- Set human review when confidence is below 70, the type is wrong, pages are incomplete, or important text is unclear.
- This is preliminary educational document guidance, not official verification, admission, equivalency, or a guaranteed result.`;

  const content: Array<Record<string, unknown>> = [{
    type: "input_text",
    text: googleText
      ? `${prompt}\n\nGoogle Vision OCR text follows:\n${googleText.text.slice(0, 120_000)}`
      : prompt,
  }];

  if (!googleText) {
    content.push(
      document.mime_type === "application/pdf"
        ? { type: "input_file", file_url: signedUrl }
        : { type: "input_image", image_url: signedUrl, detail: "high" },
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: "You are a careful multilingual document extraction system for international education.",
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "acca_document_extraction",
          strict: true,
          schema: extractionSchema(),
        },
      },
      max_output_tokens: 6500,
      store: false,
    }),
  });

  if (!response.ok) {
    console.error("OpenAI OCR structuring failed", response.status, await response.text());
    throw new Error("Document extraction is temporarily unavailable.");
  }

  const result = JSON.parse(extractResponseText(await response.json()));
  if (googleText?.pageCount && result.quality.page_count === null) {
    result.quality.page_count = googleText.pageCount;
  }
  return result;
}

async function notifyCrm(document: DocumentRow, reviewStatus: string, confidence: number) {
  if (!CRM_SYNC_WEBHOOK_URL) return;
  // TODO(real CRM sync): replace the generic webhook with the selected CRM's
  // signed integration and map only reviewed, minimum-necessary fields.
  await fetch(CRM_SYNC_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "document.ocr.completed",
      document_id: document.id,
      user_id: document.user_id,
      product: document.product,
      document_kind: document.document_kind,
      review_status: reviewStatus,
      confidence,
    }),
  }).catch((error) => console.error("CRM notification failed", error));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) {
    return json(req, { error: "Origin not allowed" }, 403);
  }

  const authorization = req.headers.get("authorization");
  if (!authorization) return json(req, { error: "Authentication required" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json(req, { error: "Invalid session" }, 401);

  let payload: { documentId?: string; force?: boolean };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }
  if (!payload.documentId) return json(req, { error: "Document is required" }, 400);

  const { data, error } = await supabase
    .from("student_documents")
    .select("*")
    .eq("id", payload.documentId)
    .single();
  const document = data as DocumentRow | null;
  if (error || !document) return json(req, { error: "Private document not found" }, 404);

  await supabase
    .from("student_documents")
    .update({
      status: "processing",
      review_status: "pending",
      review_notes: null,
    })
    .eq("id", document.id);

  try {
    const { data: signed, error: signedError } = await supabase.storage
      .from(document.bucket_id)
      .createSignedUrl(document.object_path, 300);
    if (signedError || !signed?.signedUrl) throw new Error("Could not prepare the private document.");

    const googleEligible = document.mime_type !== "application/pdf"
      && GOOGLE_VISION_API_KEY
      && OCR_PROVIDER !== "openai";
    let googleText = null;
    if (googleEligible) {
      try {
        googleText = await runGoogleVision(signed.signedUrl);
      } catch (googleError) {
        if (OCR_PROVIDER === "google") throw googleError;
        console.error("Falling back to OpenAI vision after Google OCR failure");
      }
    }

    const result = await structureWithOpenAI({
      document,
      signedUrl: signed.signedUrl,
      googleText,
    });
    const clientScore = Number(document.quality_report?.score);
    if (Number.isFinite(clientScore)) {
      result.quality.client_preflight_score = clientScore;
      result.quality.score = Math.min(result.quality.score, clientScore);
    }

    const confidence = Math.max(0, Math.min(100, Number(result.overall_confidence) || 0));
    const needsHumanReview = Boolean(
      result.requires_human_review
      || !result.matches_expected_type
      || result.quality.status === "poor"
      || confidence < 70,
    );
    const reviewStatus = needsHumanReview ? "admin_review" : "student_confirmation";
    const provider = googleText ? "google_vision+openai" : "openai_vision";

    const { data: updated, error: updateError } = await supabase
      .from("student_documents")
      .update({
        status: "review_ready",
        ai_extraction: result,
        ocr_provider: provider,
        ocr_model: OPENAI_MODEL,
        ocr_confidence: confidence,
        review_status: reviewStatus,
        processed_at: new Date().toISOString(),
      })
      .eq("id", document.id)
      .select()
      .single();
    if (updateError) throw updateError;

    await notifyCrm(document, reviewStatus, confidence);
    return json(req, { document: updated, result, provider, model: OPENAI_MODEL });
  } catch (processingError) {
    console.error("document-ocr failed", processingError);
    await supabase
      .from("student_documents")
      .update({
        status: "uploaded",
        review_status: "admin_review",
        review_notes: "Automated extraction could not be completed.",
      })
      .eq("id", document.id);
    return json(req, { error: "The document was saved, but OCR could not be completed." }, 502);
  }
});

// TODO(real Azure comparison): add an optional Azure Document Intelligence
// adapter behind OCR_PROVIDER after provider credentials and cost limits exist.
