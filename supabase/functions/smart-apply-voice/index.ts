import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyTurnstile } from "../_shared/security.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_REALTIME_MODEL = Deno.env.get("OPENAI_REALTIME_MODEL") ?? "gpt-realtime-2";
const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://accatransfer.com",
  "https://www.accatransfer.com",
  ...(Deno.env.get("APP_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
]);

const languageNames: Record<string, string> = {
  fa: "Persian",
  en: "English",
  tr: "Turkish",
  ar: "Arabic",
};

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

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").slice(0, maxLength).trim()
    : "";
}

async function safetyIdentifier(sessionId: string) {
  const bytes = new TextEncoder().encode(sessionId || "acca-smart-apply-guest");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const BASE_INSTRUCTIONS = `You are the ACCA Smart Apply voice admission assistant for international students.
- Speak naturally, warmly, and professionally. Sound calm, premium, and human.
- Reply in the student's selected language unless they clearly switch languages.
- Use the depth and attentive curiosity of a skilled reflective interviewer, but never claim to be a psychologist, therapist, Freud, or a clinical professional.
- This is an educational interest and academic-fit conversation, not therapy, psychoanalysis, personality diagnosis, or mental-health assessment.
- Explore the student across several turns. Ask only one thoughtful question at a time, listen to the full answer, briefly reflect what you understood, and then ask the next question.
- Prefer concrete lived examples over abstract labels. Explore moments of deep focus, energizing versus draining tasks, problems they enjoy solving, preferred learning environment, values, collaboration style, tolerance for ambiguity, and what kind of contribution feels meaningful.
- Do not ask all discovery questions in one turn. Build depth naturally over four to seven exchanges.
- After every three meaningful student answers, offer a concise recap using language such as "Based on what you have shared so far..." Then name tentative patterns and invite correction before continuing.
- When enough evidence is available, provide an academic personality and interest snapshot, possible interest areas, and preliminary major-fit directions. Explain the evidence from the student's own examples.
- Keep each spoken turn complete but focused: usually three to five short sentences ending with one clear question.
- Never infer trauma, unconscious motives, family pathology, disorders, intelligence, or fixed personality traits.
- Do not read markdown, headings, tables, symbols, or long lists aloud.
- Help with major discovery, admission planning, documents, tuition, scholarships, and next steps.
- Personality-related guidance is only an educational guidance profile or preliminary major fit based on the student's answers.
- Never diagnose personality, claim to administer an official MBTI test, or guarantee admission, scholarships, visas, fees, or deadlines.
- Clearly distinguish preliminary guidance from official university decisions.
- If audio is unclear, incomplete, silent, or mostly background noise, briefly ask the student to repeat it.
- Do not make sound effects or use exaggerated filler.
- For binding tuition, deadline, visa, or legal decisions, recommend confirmation with a human ACCA counselor.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (!OPENAI_API_KEY) return json(req, { error: "Voice service is not configured." }, 503);

  let payload: { sdp?: string; language?: string; context?: string; sessionId?: string; turnstileToken?: string };
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }

  const security = await verifyTurnstile(req, payload.turnstileToken, "smart_apply_voice");
  if (!security.ok) {
    return json(req, { error: security.message || "Security check failed." }, security.status || 403);
  }

  const sdp = cleanText(payload.sdp, 120_000);
  if (!sdp.startsWith("v=0")) return json(req, { error: "Invalid SDP offer" }, 400);

  const language = languageNames[payload.language ?? ""] ?? "English";
  const transcriptionLanguage = Object.hasOwn(languageNames, payload.language ?? "")
    ? payload.language
    : "en";
  const context = cleanText(payload.context, 6_000);
  const sessionId = cleanText(payload.sessionId, 160);
  const instructions = [
    BASE_INSTRUCTIONS,
    `The selected conversation language is ${language}.`,
    context ? `Recent Smart Apply context, which may be partial:\n${context}` : "",
  ].filter(Boolean).join("\n\n");

  const sessionConfig = {
    type: "realtime",
    model: OPENAI_REALTIME_MODEL,
    output_modalities: ["audio"],
    audio: {
      input: {
        transcription: {
          model: "gpt-4o-mini-transcribe",
          language: transcriptionLanguage,
          prompt: "ACCA Smart Apply, university admission, majors, scholarships, tuition, documents, Turkey",
        },
        turn_detection: {
          type: "semantic_vad",
          eagerness: "low",
          create_response: true,
          interrupt_response: false,
        },
        noise_reduction: {
          type: "far_field",
        },
      },
      output: {
        voice: "marin",
        speed: 0.98,
      },
    },
    reasoning: { effort: "medium" },
    max_output_tokens: 700,
    instructions,
  };

  const form = new FormData();
  form.set("sdp", `${sdp}\r\n`);
  form.set("session", JSON.stringify(sessionConfig));

  try {
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Safety-Identifier": await safetyIdentifier(sessionId),
      },
      body: form,
    });

    const answer = await response.text();
    if (!response.ok) {
      console.error("OpenAI Realtime session failed", response.status, answer);
      return json(req, { error: "Voice provider error" }, 502);
    }

    return json(req, { sdp: answer, model: OPENAI_REALTIME_MODEL });
  } catch (error) {
    console.error("smart-apply-voice failed", error);
    return json(req, { error: "Unexpected voice service error" }, 500);
  }
});
