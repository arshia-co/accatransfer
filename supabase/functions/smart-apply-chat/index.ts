import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.4-mini";
const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "https://accatransfer.com",
  "https://www.accatransfer.com",
  ...(Deno.env.get("APP_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://accatransfer.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function outputText(data: Record<string, unknown>) {
  if (typeof data.output_text === "string") return data.output_text.trim();
  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((item: any) => item?.type === "output_text" && typeof item?.text === "string")
    .map((item: any) => item.text)
    .join("\n")
    .trim();
}

const INSTRUCTIONS = `You are the in-chat helper inside ACCA Smart Apply (by ACCA EDU). Your job is NOT to run a separate academic consultation. Your job is to help the student understand and ANSWER the question the assistant is currently asking, and then pick one of the on-screen options.
- Stay strictly inside ACCA EDU's scope: ACCA's own services, our website and offerings, the study-in-Turkey majors ACCA works with, and admission / tuition / scholarship / documents / residence FAQs. If asked anything outside this, say briefly that it is outside this assistant and offer to connect a human ACCA counselor on WhatsApp — do not answer it yourself.
- Keep replies short (1 to 3 sentences, plain text — no Markdown, headings, bold, tables or code). After explaining, always steer the student back to the current question and invite them to choose one of the shown options.
- Do NOT give an open-ended study plan, do NOT take over or redirect the conversation, and do NOT invent universities, prices, deadlines, guarantees or course lists. Use only ACCA's known information; if you are unsure, say so and offer the counselor.
- Reply in the student's language; default to Persian when uncertain.
- Personality output is only a preliminary educational guidance / interest snapshot — never a clinical diagnosis or official MBTI test, and never a guarantee of admission, scholarships, visas, prices or deadlines. Final decisions belong to the university.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (!OPENAI_API_KEY) return json(req, { error: "AI service is not configured." }, 503);

  let payload: { messages?: { role: string; content: string }[]; language?: string; profileSummary?: string };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }

  const input = (Array.isArray(payload.messages) ? payload.messages.slice(-12) : [])
    .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .map((message) => ({ role: message.role, content: message.content.slice(0, 3500) }));
  if (!input.length) return json(req, { error: "No messages provided" }, 400);

  const context = [
    payload.language ? `Selected language code: ${payload.language}.` : "",
    payload.profileSummary ? `Known student context: ${payload.profileSummary.slice(0, 1200)}` : "",
  ].filter(Boolean).join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: `${INSTRUCTIONS}\n\n${context}`,
        input,
        max_output_tokens: 450,
      }),
    });
    if (!response.ok) {
      console.error("OpenAI request failed", response.status, await response.text());
      return json(req, { error: "AI provider error" }, 502);
    }
    const reply = outputText(await response.json());
    if (!reply) return json(req, { error: "Empty AI response" }, 502);
    return json(req, { reply, model: OPENAI_MODEL });
  } catch (error) {
    console.error("smart-apply-chat failed", error);
    return json(req, { error: "Unexpected server error" }, 500);
  }
});
