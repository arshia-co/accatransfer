import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Server-side, authenticated re-validation of an already-uploaded student
// document (defense in depth — the browser checks can be bypassed). Re-checks
// the REAL stored bytes: magic-byte MIME, per-type size, and PDF active-content
// tokens. Optionally runs a Cloudflare-free VirusTotal lookup by file hash when
// VIRUSTOTAL_API_KEY is configured (dormant otherwise). On an unsafe verdict the
// stored object and its row are removed so nothing dangerous lingers.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const VIRUSTOTAL_API_KEY = Deno.env.get("VIRUSTOTAL_API_KEY") ?? "";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PDF_DANGER_TOKENS = ["/JavaScript", "/JS", "/Launch", "/OpenAction", "/AA", "/EmbeddedFile", "/RichMedia", "/XFA"];

const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://accatransfer.com",
  "https://www.accatransfer.com",
  "https://accatransfer.vercel.app",
  ...(Deno.env.get("APP_ORIGINS") ?? "").split(",").map((v) => v.trim()).filter(Boolean),
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

function sniff(bytes: Uint8Array): { type: string; isPdf: boolean } | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { type: "application/pdf", isPdf: true };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { type: "image/jpeg", isPdf: false };
  }
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { type: "image/png", isPdf: false };
  }
  return null;
}

function scanPdf(bytes: Uint8Array): string[] {
  const text = new TextDecoder("latin1").decode(bytes.subarray(0, 8 * 1024 * 1024));
  return PDF_DANGER_TOKENS.filter((token) => text.includes(token));
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// VirusTotal v3 lookup by hash (free, no upload). Returns null when not configured.
async function virusTotalByHash(hash: string) {
  if (!VIRUSTOTAL_API_KEY) return null;
  try {
    const res = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
      headers: { "x-apikey": VIRUSTOTAL_API_KEY },
    });
    if (res.status === 404) return { provider: "virustotal", checked: true, known: false, malicious: 0, suspicious: 0 };
    if (!res.ok) return { provider: "virustotal", checked: false, error: `http_${res.status}` };
    const data = await res.json();
    const stats = data?.data?.attributes?.last_analysis_stats ?? {};
    return {
      provider: "virustotal",
      checked: true,
      known: true,
      malicious: Number(stats.malicious ?? 0),
      suspicious: Number(stats.suspicious ?? 0),
    };
  } catch (error) {
    return { provider: "virustotal", checked: false, error: String(error).slice(0, 120) };
  }
}

type DocRow = { id: string; bucket_id: string; object_path: string; mime_type: string | null; size_bytes: number | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: responseHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);

  const authorization = req.headers.get("authorization");
  if (!authorization) return json(req, { error: "Authentication required" }, 401);

  // User-scoped client: RLS ensures the caller can only touch their OWN document.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json(req, { error: "Invalid session" }, 401);

  let payload: { documentId?: string };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }
  if (!payload.documentId) return json(req, { error: "Document is required" }, 400);

  const { data, error } = await supabase
    .from("student_documents")
    .select("id, bucket_id, object_path, mime_type, size_bytes")
    .eq("id", payload.documentId)
    .single();
  const document = data as DocRow | null;
  if (error || !document) return json(req, { error: "Document not found" }, 404);

  // Download the actual stored bytes.
  const { data: blob, error: downloadError } = await supabase.storage
    .from(document.bucket_id)
    .download(document.object_path);
  if (downloadError || !blob) return json(req, { error: "Could not read the stored document." }, 502);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  const reasons: string[] = [];
  const sniffed = sniff(bytes);
  if (!sniffed) {
    reasons.push("نوع واقعی فایل پشتیبانی نمی‌شود.");
  } else {
    const limit = sniffed.isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    if (bytes.length > limit) reasons.push(sniffed.isPdf ? "حجم PDF بیش از حد مجاز است." : "حجم عکس بیش از حد مجاز است.");
    if (sniffed.isPdf) {
      const threats = scanPdf(bytes);
      if (threats.length) reasons.push("PDF حاوی اسکریپت یا محتوای اجرایی است.");
    }
  }

  const hash = await sha256Hex(bytes);
  const av = await virusTotalByHash(hash);
  if (av && av.checked && (av as { malicious?: number }).malicious && (av as { malicious: number }).malicious > 0) {
    reasons.push("اسکن آنتی‌ویروس این فایل را مخرب تشخیص داد.");
  }

  const verdict = {
    version: 1,
    scanned_at: new Date().toISOString(),
    sniffed_type: sniffed?.type ?? null,
    size_bytes: bytes.length,
    sha256: hash,
    pdf_threats: sniffed?.isPdf ? scanPdf(bytes) : [],
    antivirus: av,
    safe: reasons.length === 0,
    reasons,
  };

  if (!verdict.safe) {
    // Purge the dangerous/invalid file entirely.
    await supabase.storage.from(document.bucket_id).remove([document.object_path]).catch(() => null);
    await supabase.from("student_documents").delete().eq("id", document.id).catch(() => null);
    return json(req, { safe: false, reason: reasons[0] || "فایل در بررسی امنیتی سرور رد شد.", verdict });
  }

  await supabase
    .from("student_documents")
    .update({ security_scan: verdict })
    .eq("id", document.id);

  return json(req, { safe: true, verdict });
});
