import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")
  ?? namedKey("SUPABASE_PUBLISHABLE_KEYS");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? namedKey("SUPABASE_SECRET_KEYS");

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

const REQUIRED_DOCUMENTS: Record<string, string[]> = {
  smart_apply: ["passport", "transcript", "diploma", "photo"],
  ai_transfer: ["passport", "transcript"],
};

type DocumentRow = {
  id: string;
  document_kind: string;
  object_path: string;
  original_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
  ocr_confidence: number | null;
  review_status: string | null;
  ai_extraction: Record<string, any> | null;
  confirmed_extraction: Record<string, any> | null;
  quality_report: Record<string, any> | null;
  created_at: string;
};

function namedKey(envName: string) {
  try {
    const value = JSON.parse(Deno.env.get(envName) ?? "{}");
    return value.default ?? Object.values(value)[0] ?? "";
  } catch {
    return "";
  }
}

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

function documentDecision(document?: DocumentRow | null) {
  const extraction = document?.ai_extraction;
  const confidence = Number(document?.ocr_confidence ?? extraction?.overall_confidence);
  const hasConfidence = Number.isFinite(confidence);
  const matchesExpectedType = extraction?.matches_expected_type !== false;
  const qualityStatus = extraction?.quality?.status ?? document?.quality_report?.status ?? null;
  return {
    confidence: hasConfidence ? confidence : null,
    ready: Boolean(
      extraction
      && hasConfidence
      && confidence > 50
      && matchesExpectedType
      && qualityStatus !== "poor"
    ),
    matchesExpectedType,
    qualityStatus,
  };
}

function buildReadiness(product: string, documents: DocumentRow[], hasSelection: boolean) {
  const requiredKinds = REQUIRED_DOCUMENTS[product] ?? REQUIRED_DOCUMENTS.smart_apply;
  const required = requiredKinds.map((kind) => {
    const candidates = documents.filter((document) => document.document_kind === kind);
    const document = candidates.find((candidate) => documentDecision(candidate).ready)
      ?? candidates[0]
      ?? null;
    return {
      kind,
      document_id: document?.id ?? null,
      ...documentDecision(document),
    };
  });
  return {
    has_selection: hasSelection,
    required,
    missing: required.filter((item) => !item.ready).map((item) => item.kind),
    can_submit: hasSelection && required.every((item) => item.ready),
  };
}

function localized(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.fa ?? value.en ?? "";
}

function telegramSummary({
  submissionId,
  intent,
  product,
  email,
  profile,
  selection,
  smartSession,
  deepFit,
  transfer,
  documents,
}: Record<string, any>) {
  const signature = localized(deepFit?.result?.signature?.label);
  const topMajors = (deepFit?.result?.recommendedMajors ?? [])
    .slice(0, 5)
    .map((major: any) => localized(major.name))
    .filter(Boolean)
    .join("، ");
  const title = intent === "consultation"
    ? "درخواست مشاوره با پرونده کامل"
    : "درخواست جدید اپلای";

  return [
    `ACCA | ${title}`,
    `کد پرونده: ${submissionId}`,
    `سرویس: ${product === "ai_transfer" ? "AI Transfer" : "Smart Apply"}`,
    `نام: ${profile?.full_name || "-"}`,
    `ایمیل: ${email || "-"}`,
    "",
    `رشته مقصد: ${selection?.program_name || "-"}`,
    `دانشگاه: ${selection?.university_name || "-"}`,
    `کشور: ${selection?.country || "-"}`,
    `زبان / مقطع: ${selection?.language || "-"} / ${selection?.degree || "-"}`,
    `شهریه ثبت‌شده: ${selection?.tuition_fee || "-"}`,
    "",
    `هدف Smart Apply: ${smartSession?.goal || "-"}`,
    `پروفایل Deep Fit: ${signature || "تکمیل نشده"}`,
    `رشته‌های پیشنهادی AI: ${topMajors || "-"}`,
    `وضعیت انتقالی: ${transfer?.ai_result?.preliminary_transfer_fit || "-"}`,
    "",
    `مدارک پیوست‌شده: ${documents.length}`,
    "فایل کامل داده‌ها و گفت‌وگوها با عنوان ACCA dossier ارسال می‌شود.",
  ].join("\n").slice(0, 3900);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(req, { error: "Server credentials are not configured." }, 500);
  }

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);

  const authorization = req.headers.get("authorization");
  if (!authorization) return json(req, { error: "Authentication required" }, 401);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json(req, { error: "Invalid session" }, 401);

  let payload: {
    product?: "smart_apply" | "ai_transfer";
    intent?: "apply" | "consultation";
    consent?: boolean;
    dryRun?: boolean;
  };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid request body" }, 400);
  }

  const product = payload.product ?? "smart_apply";
  const intent = payload.intent ?? "apply";
  if (!REQUIRED_DOCUMENTS[product]) return json(req, { error: "Invalid product" }, 400);
  if (!["apply", "consultation"].includes(intent)) return json(req, { error: "Invalid intent" }, 400);
  if (!payload.dryRun && payload.consent !== true) {
    return json(req, { error: "Explicit document sharing consent is required." }, 400);
  }

  const userId = authData.user.id;
  const [
    profileResult,
    documentsResult,
    selectionResult,
    smartResult,
    deepFitResult,
    transferResult,
  ] = await Promise.all([
    userClient.from("profiles").select("*").eq("id", userId).maybeSingle(),
    userClient.from("student_documents").select("*").eq("user_id", userId)
      .eq("product", product).order("created_at", { ascending: false }),
    userClient.from("student_program_selections").select("*").eq("user_id", userId)
      .eq("product", product).maybeSingle(),
    userClient.from("smart_apply_sessions").select("*").eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    userClient.from("smart_apply_deep_profiles").select("*").eq("user_id", userId).maybeSingle(),
    userClient.from("transfer_assessments").select("*").eq("user_id", userId)
      .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const queryError = [
    profileResult,
    documentsResult,
    selectionResult,
    smartResult,
    deepFitResult,
    transferResult,
  ].find((result) => result.error)?.error;
  if (queryError) return json(req, { error: "Could not prepare the application dossier." }, 500);

  const documents = (documentsResult.data ?? []) as DocumentRow[];
  const selection = selectionResult.data;
  const readiness = buildReadiness(product, documents, Boolean(selection));
  if (payload.dryRun) return json(req, { readiness });
  if (!readiness.can_submit) {
    return json(req, {
      error: readiness.has_selection
        ? `Required documents are not ready: ${readiness.missing.join(", ")}`
        : "Select a university and program before submitting.",
      readiness,
    }, 409);
  }

  const snapshot = {
    version: 1,
    generated_at: new Date().toISOString(),
    consent: {
      accepted: true,
      accepted_at: new Date().toISOString(),
      destination: "ACCA admissions Telegram bot",
    },
    user: {
      id: userId,
      email: authData.user.email ?? null,
      profile: profileResult.data ?? null,
    },
    product,
    intent,
    selected_program: selection,
    smart_apply: smartResult.data ?? null,
    deep_fit: deepFitResult.data ?? null,
    ai_transfer: transferResult.data ?? null,
    readiness,
    documents: documents.map((document) => ({
      id: document.id,
      kind: document.document_kind,
      original_name: document.original_name,
      mime_type: document.mime_type,
      size_bytes: document.size_bytes,
      status: document.status,
      review_status: document.review_status,
      ocr_confidence: document.ocr_confidence,
      extraction: document.confirmed_extraction ?? document.ai_extraction,
      created_at: document.created_at,
    })),
  };

  const consentAt = new Date().toISOString();
  const { data: submission, error: submissionError } = await admin
    .from("application_submissions")
    .insert({
      user_id: userId,
      product,
      intent,
      status: "submitted",
      program_selection_id: selection.id,
      consent_at: consentAt,
      readiness_snapshot: readiness,
      payload_snapshot: snapshot,
    })
    .select()
    .single();
  if (submissionError || !submission) {
    return json(req, { error: "Could not create the application submission." }, 500);
  }

  try {
    const dossierPath = `${userId}/${submission.id}/acca-dossier.json`;
    const dossierBlob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const { error: dossierUploadError } = await admin.storage
      .from("application-dossiers")
      .upload(dossierPath, dossierBlob, {
        contentType: "application/json",
        cacheControl: "60",
        upsert: true,
      });
    if (dossierUploadError) throw dossierUploadError;

    const { data: dossierUrl, error: dossierUrlError } = await admin.storage
      .from("application-dossiers")
      .createSignedUrl(dossierPath, 3600);
    if (dossierUrlError || !dossierUrl?.signedUrl) throw dossierUrlError;

    const queueItems: Record<string, any>[] = [{
      submission_id: submission.id,
      item_type: "summary",
      payload: {
        text: telegramSummary({
          submissionId: submission.id,
          intent,
          product,
          email: authData.user.email,
          profile: profileResult.data,
          selection,
          smartSession: smartResult.data,
          deepFit: deepFitResult.data,
          transfer: transferResult.data,
          documents,
        }),
      },
    }, {
      submission_id: submission.id,
      item_type: "dossier",
      payload: {
        url: dossierUrl.signedUrl,
        caption: `ACCA dossier | ${submission.id} | اطلاعات کامل، نتایج AI و گفت‌وگوها`,
      },
    }];

    for (const document of documents) {
      const { data: signed, error: signedError } = await admin.storage
        .from("student-documents")
        .createSignedUrl(document.object_path, 3600);
      if (signedError || !signed?.signedUrl) continue;
      queueItems.push({
        submission_id: submission.id,
        item_type: "document",
        document_id: document.id,
        payload: {
          url: signed.signedUrl,
          caption: [
            `مدرک: ${document.document_kind}`,
            `فایل: ${document.original_name}`,
            `OCR: ${document.ocr_confidence ?? "-"}٪`,
            `کد پرونده: ${submission.id}`,
          ].join("\n"),
        },
      });
    }

    const { error: queueError } = await admin
      .from("application_delivery_queue")
      .insert(queueItems);
    if (queueError) throw queueError;

    await Promise.all([
      admin.from("application_submissions").update({
        status: "queued",
        dossier_bucket: "application-dossiers",
        dossier_path: dossierPath,
        queued_items: queueItems.length,
      }).eq("id", submission.id),
      product === "smart_apply"
        ? admin.from("smart_apply_sessions").update({ status: "application_started" })
          .eq("id", smartResult.data?.id ?? "00000000-0000-0000-0000-000000000000")
        : admin.from("transfer_assessments").update({ status: "human_review" })
          .eq("id", transferResult.data?.id ?? "00000000-0000-0000-0000-000000000000"),
    ]);

    return json(req, {
      submission: {
        id: submission.id,
        status: "queued",
        product,
        intent,
        submitted_at: submission.submitted_at,
      },
      readiness,
      queued_items: queueItems.length,
    });
  } catch (deliveryError) {
    console.error("submit-application delivery failed", deliveryError);
    await admin.from("application_submissions").update({
      status: "failed",
      delivery_error: String(deliveryError).slice(0, 500),
    }).eq("id", submission.id);
    return json(req, {
      error: "The application was saved, but Telegram delivery could not be queued.",
      submission_id: submission.id,
    }, 502);
  }
});
