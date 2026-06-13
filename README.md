# ACCA AI Services

One production frontend for `accatransfer.com`, with:

- ACCA Smart Apply
- ACCA AI Transfer
- One shared passwordless student account at `/account`
- Private Supabase document storage and owner-scoped data
- Server-side OpenAI Edge Functions

Frontend-only demo of the **ACCA Smart Apply** experience for [ACCA EDU](https://www.accaco.com):
an AI-guided admission journey, not a form. One central assistant greets the student,
asks one question at a time, reveals features progressively, and only shows the login
gate **after** delivering value (a preliminary major-discovery result or an admission direction).

> **Demo scope** — no real backend, auth, AI API, OCR, CRM or file upload.
> Everything stateful is mocked behind clean seams so the backend team can plug in later.

## Run

```bash
npm install
npm run dev        # → http://localhost:5173/smart-apply
npm run build      # production build (dist/)
npm run lint
```

A VS Code profile ships with the repo: open `acca-smart-apply.code-workspace`
(brand-tinted window, recommended extensions, Chrome launch config on `/smart-apply`).

## Experience map

1. `/smart-apply` → assistant greets, asks for a language (فارسی / English / Türkçe / العربية / Other) — conversation continues in that language (RTL/LTR aware).
2. The assistant detects the student's goal and reveals one guided path at a time:
   - **Help me choose a major** → deep Major Discovery: 25 questions in 5 layers (MBTI-inspired ×12, RIASEC ×5, Big-Five/HEXACO-inspired ×4, motivations ×2, academic reality ×2), one at a time with smart recaps every 5 answers → full tabbed profile: headline + archetype (primary/secondary), MBTI-inspired pattern with per-axis confidence (close axes shown as *balanced*), RIASEC code, trait snapshot, hidden strengths, blind spots, best learning environment, 6 major matches (personality fit · academic fit · admission note), caution paths and an admission-reality note.
   - **I know my major** → category → major → degree → country → GPA → budget → matching universities + admission timeline → login gate.
   - **I want to apply** → same funnel without a fixed major (suggests discovery).
   - **I just have questions** → FAQ over a mini knowledge base (scholarships, residence permit, costs, language, insurance, housing, documents, intakes).
3. Voice button → listening animation + an honest demo limitation note.
4. Login appears only after value is delivered and only when the student chooses the save/continue action.
5. Dashboard preview → profile, recommended majors, document placeholders, applications, admission timeline, messages.

The result is explicitly framed as a preliminary educational guidance profile, not an official assessment or admission guarantee.

## Architecture

```
src/
├── ai/                          # "The AI" — fully mock, backend-replaceable
│   ├── mockAIProvider.js        # latency + typing simulation; THE seam for a real LLM
│   ├── conversationEngine.mock.js  # intent router + naive free-text NLU
│   ├── intents.js               # intent catalog (buttons carry nextIntent)
│   ├── scoring.js               # major-discovery scoring engine
│   ├── messageKit.js            # aiMsg()/action() builders
│   └── flows/                   # languageFlow · goalFlow · majorDiscoveryFlow
│                                # · admissionFlow · documentFlow · faqFlow
├── api/placeholderApi.js        # replaceable future endpoints (AI/auth/docs/OCR/CRM/voice/matching)
├── data/                        # sample data: majorQuestions, mockPrograms,
│                                # mockUniversities, knowledgeBase, mockAdmissionRules
├── store/smartApplyStore.js     # Zustand session store + exchange sequencer
├── i18n/ui.js                   # UI chrome strings (fa/en/tr/ar)
├── lib/                         # lang utils, icon registry, profile display mapping
└── components/smart-apply/      # SmartApplyShell, AIAssistantOrb, ConversationPanel,
                                 # MessageBubble, DynamicActionButtons, VoiceInputButton,
                                 # SessionInsightPanel, ProgressMemoryCard, LoginGateModal,
                                 # MajorResultPreview, RecommendedMajorCard,
                                 # SmartApplyProfilePreview, DocumentUploadPlaceholder,
                                 # AdmissionTimelinePreview, UniversityMatchCards
```

### Message contract

Every assistant message supports:

```js
{
  id: 'msg_001', role: 'assistant', content: '…', lang: 'fa',
  actions: [{ id, label, value, nextIntent, variant?, icon? }],
  component: 'major_result' | 'university_list' | 'timeline' | 'document_grid',
  payload: { … }, meta: { progress, total, tone }
}
```

### Backend integration plan

| Replace | With | Contract |
|---|---|---|
| `ai/mockAIProvider.js` | real AI provider | `{ messages, patch, effect? }` per turn (see `api/placeholderApi.js → aiApi.converse`) |
| `goalFlow LOGIN_MOCK` | real auth (OTP/OAuth) | `authApi.requestOtp / verifyOtp` |
| `DocumentUploadPlaceholder` | secure upload + OCR | `documentsApi.upload / getExtraction` |
| guest profile | CRM lead sync | `crmApi.syncLead / createApplication` |
| `VoiceInputButton` placeholder | STT/TTS streaming | `voiceApi.startListening / speak` |
| `data/mockPrograms.js` sample rows | university matching API | `universitiesApi.match` |
| remaining `data/*` sample rows | CMS / DB | same shapes |

Design DNA matches the main ACCA EDU site: cream `#F7F1E8`, navy `#071A3D`,
gold `#C6A768`, emerald CTAs, Vazirmatn (self-hosted), RTL-first, glass cards
(`rounded-[28px]` + `backdrop-blur`), Framer Motion micro-interactions.
