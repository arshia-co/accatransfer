import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyTurnstile } from "../_shared/security.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://accatransfer.com",
  "https://www.accatransfer.com",
  ...(Deno.env.get("APP_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean),
]);

const DECISION_ACTIONS = [
  "select_option",
  "confirm_option",
  "explain_option",
  "repeat_options",
  "out_of_scope_redirect",
  "human_handoff",
] as const;

type DecisionAction = typeof DECISION_ACTIONS[number];
type AllowedOption = { id: string; label: string };
type Decision = {
  action: DecisionAction;
  selectedOptionId: string | null;
  suggestedOptionId: string | null;
  message: string;
  showOptions: boolean;
  moveNext: boolean;
};

type Payload = {
  language?: string;
  profileSummary?: string;
  currentQuestion?: string;
  allowedOptions?: AllowedOption[];
  currentIntent?: string;
  currentStep?: string;
  mode?: "guided_selection" | "scoped_faq";
  studentMessage?: string;
  turnstileToken?: string;
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

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return normalize(value).split(" ").filter((token) => token.length > 1);
}

function ngrams(items: string[], size: number) {
  const result = new Set<string>();
  for (let index = 0; index <= items.length - size; index += 1) {
    result.add(items.slice(index, index + size).join(" "));
  }
  return result;
}

function optionScore(message: string, label: string) {
  const normalizedMessage = normalize(message);
  const normalizedLabel = normalize(label);
  if (!normalizedMessage || !normalizedLabel) return 0;
  if (normalizedMessage === normalizedLabel) return 1;

  const messageTokens = tokens(message);
  const labelTokens = tokens(label);
  const messageSet = new Set(messageTokens);
  const labelSet = new Set(labelTokens);
  const shared = [...messageSet].filter((token) => labelSet.has(token)).length;
  const coverage = shared / Math.max(1, Math.min(messageSet.size, labelSet.size));
  const union = new Set([...messageSet, ...labelSet]).size;
  const jaccard = shared / Math.max(1, union);
  const messageBigrams = ngrams(messageTokens, 2);
  const labelBigrams = ngrams(labelTokens, 2);
  const sharesBigram = [...messageBigrams].some((gram) => labelBigrams.has(gram));

  if (normalizedMessage.includes(normalizedLabel) || normalizedLabel.includes(normalizedMessage)) {
    return Math.max(0.88, coverage);
  }
  if (sharesBigram) return Math.max(0.88, coverage);
  return Math.min(0.87, coverage * 0.72 + jaccard * 0.28);
}

function confirmationMessage(language: string, label: string) {
  const copy: Record<string, (optionLabel: string) => string> = {
    fa: (optionLabel) => `فکر می‌کنم منظورتان «${optionLabel}» است. همین گزینه را انتخاب کنم؟`,
    en: (optionLabel) => `I think you mean “${optionLabel}”. Should I choose this option?`,
    tr: (optionLabel) => `Sanırım “${optionLabel}” demek istiyorsunuz. Bu seçeneği seçeyim mi?`,
    ar: (optionLabel) => `أعتقد أنك تقصد «${optionLabel}». هل أختار هذا الخيار؟`,
  };
  return (copy[language] || copy.en)(label);
}

function fallbackMessage(language: string, action: DecisionAction) {
  const copy: Record<string, Record<DecisionAction, string>> = {
    fa: {
      select_option: "متوجه شدم. ادامه می‌دهیم.",
      confirm_option: "فکر می‌کنم منظورتان همین گزینه است. تأیید می‌کنید؟",
      explain_option: "این مرحله برای مشخص‌کردن نزدیک‌ترین مسیر است. لطفاً یکی از گزینه‌های فعلی را انتخاب کنید.",
      repeat_options: "لطفاً نزدیک‌ترین گزینه به هدفتان را انتخاب کنید.",
      out_of_scope_redirect: "این موضوع مهم است، اما ابتدا همین مرحله را کامل کنیم. کدام گزینه به هدفتان نزدیک‌تر است؟",
      human_handoff: "در صورت تمایل می‌توانید با مشاور انسانی آکا گفت‌وگو کنید.",
    },
    en: {
      select_option: "Got it. We can continue.",
      confirm_option: "I think you mean this option. Should I choose it?",
      explain_option: "This step identifies the closest path for you. Please choose one of the current options.",
      repeat_options: "Please choose the option closest to your goal.",
      out_of_scope_redirect: "That is important, but let’s complete this step first. Which current option is closest?",
      human_handoff: "You can speak with a human ACCA counselor if you prefer.",
    },
  };
  return (copy[language] || copy.en)[action];
}

function safeOptions(value: unknown): AllowedOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 14)
    .map((option) => ({
      id: String(option?.id ?? "").slice(0, 160),
      label: String(option?.label ?? "").replace(/\s+/g, " ").trim().slice(0, 320),
    }))
    .filter((option) => option.id && option.label);
}

function sanitizeDecision(
  raw: Partial<Decision>,
  options: AllowedOption[],
  studentMessage: string,
  language: string,
): Decision {
  const optionIds = new Set(options.map((option) => option.id));
  const action = DECISION_ACTIONS.includes(raw.action as DecisionAction)
    ? raw.action as DecisionAction
    : "repeat_options";
  const selectedOptionId = raw.selectedOptionId && optionIds.has(String(raw.selectedOptionId))
    ? String(raw.selectedOptionId)
    : null;
  const suggestedOptionId = raw.suggestedOptionId && optionIds.has(String(raw.suggestedOptionId))
    ? String(raw.suggestedOptionId)
    : null;

  if (action === "select_option") {
    const selected = options.find((option) => option.id === selectedOptionId);
    const exact = selected && normalize(selected.label) === normalize(studentMessage);
    if (!selected || !exact) {
      const suggestion = selected || options.find((option) => option.id === suggestedOptionId);
      if (suggestion) {
        return {
          action: "confirm_option",
          selectedOptionId: null,
          suggestedOptionId: suggestion.id,
          message: String(raw.message || fallbackMessage(language, "confirm_option")).replace(/\s+/g, " ").trim().slice(0, 700),
          showOptions: false,
          moveNext: false,
        };
      }
      return {
        action: "repeat_options",
        selectedOptionId: null,
        suggestedOptionId: null,
        message: fallbackMessage(language, "repeat_options"),
        showOptions: true,
        moveNext: false,
      };
    }
  }

  if (action === "confirm_option" && !suggestedOptionId) {
    return {
      action: "repeat_options",
      selectedOptionId: null,
      suggestedOptionId: null,
      message: fallbackMessage(language, "repeat_options"),
      showOptions: true,
      moveNext: false,
    };
  }

  return {
    action,
    selectedOptionId: action === "select_option" ? selectedOptionId : null,
    suggestedOptionId: action === "confirm_option" ? suggestedOptionId : null,
    message: String(raw.message || fallbackMessage(language, action)).replace(/\s+/g, " ").trim().slice(0, 700),
    showOptions: action !== "confirm_option",
    moveNext: action === "select_option",
  };
}

function enforceConfidence(
  decision: Decision,
  options: AllowedOption[],
  studentMessage: string,
  language: string,
): Decision {
  const ranked = options
    .map((option) => ({ option, score: optionScore(studentMessage, option.label) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];

  if (best?.score === 1) {
    return {
      action: "select_option",
      selectedOptionId: best.option.id,
      suggestedOptionId: null,
      message: fallbackMessage(language, "select_option"),
      showOptions: true,
      moveNext: true,
    };
  }

  if (
    best?.score > 0.85
    && (decision.action === "repeat_options" || decision.action === "out_of_scope_redirect")
  ) {
    return {
      action: "confirm_option",
      selectedOptionId: null,
      suggestedOptionId: best.option.id,
      message: confirmationMessage(language, best.option.label),
      showOptions: false,
      moveNext: false,
    };
  }

  if (
    best?.score >= 0.55
    && decision.action === "out_of_scope_redirect"
  ) {
    return {
      action: "confirm_option",
      selectedOptionId: null,
      suggestedOptionId: best.option.id,
      message: confirmationMessage(language, best.option.label),
      showOptions: false,
      moveNext: false,
    };
  }

  return decision;
}

const INSTRUCTIONS = `You are the constrained option-selection helper inside ACCA Smart Apply.
You are NOT an open-ended counselor and you never control the conversation state.

You receive the currentQuestion, allowedOptions, currentIntent, currentStep, mode, and studentMessage.
Return only the requested JSON decision.

Allowed behavior:
- select_option: only when studentMessage exactly matches one allowed option label.
- confirm_option: when free text strongly or moderately matches one allowed option. Ask one short confirmation.
- explain_option: when the student asks what the question or an option means. Explain in one short paragraph, then return them to the current options.
- repeat_options: when the student is confused or the match is uncertain.
- out_of_scope_redirect: briefly acknowledge an unrelated request and return to the current options.
- human_handoff: only for an explicit human request, a sensitive issue, or repeated confusion.

Hard restrictions:
- Never create questions or options.
- Never recommend majors before Major Discovery is complete.
- Never skip or change steps.
- Never claim admission, scholarship, visa, price, or deadline certainty.
- Never provide broad academic counseling during guided_selection mode.
- Keep the message to one short paragraph and reply in the selected language.
- selectedOptionId and suggestedOptionId must come from allowedOptions.
- moveNext may be true only for select_option.
- explain_option, repeat_options, out_of_scope_redirect, and human_handoff must keep showOptions true and moveNext false.
- confirm_option must set showOptions false and moveNext false.

When mode is scoped_faq, you may give one short answer within ACCA admission scope, but do not invent facts. Use explain_option so the predefined FAQ options remain visible.`;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: { type: "string", enum: DECISION_ACTIONS },
    selectedOptionId: { type: ["string", "null"] },
    suggestedOptionId: { type: ["string", "null"] },
    message: { type: "string" },
    showOptions: { type: "boolean" },
    moveNext: { type: "boolean" },
  },
  required: [
    "action",
    "selectedOptionId",
    "suggestedOptionId",
    "message",
    "showOptions",
    "moveNext",
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (!OPENAI_API_KEY) return json(req, { error: "AI service is not configured." }, 503);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json(req, { error: "Invalid JSON body" }, 400);
  }

  const security = await verifyTurnstile(req, payload.turnstileToken, "smart_apply_chat");
  if (!security.ok) {
    return json(req, { error: security.message || "Security check failed." }, security.status || 403);
  }

  const studentMessage = String(payload.studentMessage || "").trim().slice(0, 2000);
  const allowedOptions = safeOptions(payload.allowedOptions);
  if (!studentMessage) return json(req, { error: "No student message provided" }, 400);
  if (!allowedOptions.length) return json(req, { error: "No allowed options provided" }, 400);

  const language = String(payload.language || "fa").slice(0, 8);
  const context = {
    language,
    mode: payload.mode === "scoped_faq" ? "scoped_faq" : "guided_selection",
    currentQuestion: String(payload.currentQuestion || "").slice(0, 3500),
    allowedOptions,
    currentIntent: String(payload.currentIntent || "").slice(0, 160),
    currentStep: String(payload.currentStep || "").slice(0, 160),
    studentMessage,
    profileSummary: String(payload.profileSummary || "").slice(0, 1200),
  };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: INSTRUCTIONS,
        input: [{ role: "user", content: JSON.stringify(context) }],
        text: {
          format: {
            type: "json_schema",
            name: "guided_option_decision",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
        max_output_tokens: 260,
        store: false,
      }),
    });
    if (!response.ok) {
      console.error("OpenAI request failed", response.status, await response.text());
      return json(req, { error: "AI provider error" }, 502);
    }

    const text = outputText(await response.json());
    if (!text) return json(req, { error: "Empty AI response" }, 502);
    const decision = enforceConfidence(
      sanitizeDecision(JSON.parse(text), allowedOptions, studentMessage, language),
      allowedOptions,
      studentMessage,
      language,
    );
    return json(req, { decision, model: OPENAI_MODEL });
  } catch (error) {
    console.error("smart-apply-chat failed", error);
    return json(req, { error: "Unexpected server error" }, 500);
  }
});
