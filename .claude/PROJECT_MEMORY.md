# VibeKnowing V2 — Project Memory
> Last updated: 2026-04-08 (Pass 2 prompt engineering complete)
> Keep this file updated after every session. Use it as the primary context source.

---

## Project Overview
- **App**: VibeKnowing / VibeLearn — AI-powered learning platform
- **Stack**: Next.js 15 App Router (frontend) + FastAPI (backend API)
- **Frontend**: `apps/web/src/` — Tailwind CSS v4, Framer Motion, React
- **Backend**: `apps/api/` — Python, SQLAlchemy, multi-provider AI (OpenAI / Anthropic / Google)
- **Dev URLs**: Frontend `http://localhost:3001`, API `http://localhost:8000`
- **User email**: rkyeluru@gmail.com

---

## Design System (DO NOT deviate from these)
- **CSS tokens**: `var(--secondary)`, `var(--secondary-light)`, `var(--surface-border)`, `var(--surface-border-strong)`, `var(--card)`, `var(--card-hover)`, `var(--muted-foreground)`, `var(--surface-input)`, `var(--background-elevated)`
- **Utility classes**: `vk-card`, `vk-btn`, `vk-btn-primary`, `vk-btn-secondary`, `vk-input` — defined in `ui.v2.css`
- **AVOID**: `glass-panel` class (causes transparency bugs, overrides background colors)
- **AVOID**: hardcoded `indigo-*` colors — use design tokens instead

---

## AI Provider Architecture
- **Multi-provider**: OpenAI, Anthropic, Google Gemini
- **Key resolution**: browser header key (`X-OpenAI-Key` etc.) → env var fallback
- **Provider selection**: `X-AI-Provider` header from frontend, falls back to `settings.DEFAULT_PROVIDER`
- **`_get_ai_params(request, task)`** in `apps/api/routers/ai.py` extracts provider/model/key from headers
- **IMPORTANT**: Do NOT add `if not api_key` guards in route handlers — `_resolve_key()` already falls back to env vars. Adding guards breaks incognito/no-localStorage usage.
- **`settings.DEFAULT_PROVIDER`** in `config.py` — background services (architect, scout, vanguard) use this

### httpx 0.28 Compatibility Fix (applied 2026-04-08)
- **Problem**: httpx 0.28 removed `proxies` arg; older OpenAI + Anthropic SDKs pass it internally → `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'`
- **Fix location**: `apps/api/main.py` (top of file, before any imports)
- **Fix**: Monkey-patch `httpx.Client.__init__` to strip `proxies` kwarg:
```python
import httpx as _httpx
_orig_client_init = _httpx.Client.__init__
def _patched_client_init(self, *args, **kwargs):
    kwargs.pop("proxies", None)
    _orig_client_init(self, *args, **kwargs)
_httpx.Client.__init__ = _patched_client_init
```
- **DO NOT** pass `http_client=httpx.Client()` to Anthropic — old SDK (0.19.x) breaks with `AttributeError: 'Anthropic' object has no attribute 'messages'`
- **DO NOT** pass `http_client=httpx.Client()` to OpenAI either — use the monkey-patch instead

---

## Key Files Map

### Frontend
| File | Purpose |
|------|---------|
| `apps/web/src/app/source/[id]/page.tsx` | Source detail page with Studio tabs |
| `apps/web/src/app/studio/page.tsx` | Content Repo page (renamed from Studio) |
| `apps/web/src/app/mastery/page.tsx` | Mastery roadmap page |
| `apps/web/src/components/layout/Sidebar.tsx` | Desktop sidebar nav |
| `apps/web/src/components/layout/MobileNav.tsx` | Mobile bottom nav |
| `apps/web/src/components/layout/AppShell.tsx` | App shell with page titles |
| `apps/web/src/components/studio/StudioInterface.tsx` | Studio tab switcher |
| `apps/web/src/components/studio/ArticleEditor.tsx` | Article generation + editor |
| `apps/web/src/components/studio/DiagramViewer.tsx` | Diagram tab |
| `apps/web/src/components/studio/SocialMediaGenerator.tsx` | Social media tab |
| `apps/web/src/components/quiz/QuizInterface.tsx` | Quiz tab |
| `apps/web/src/components/flashcards/ReviewSession.tsx` | Flashcards tab |
| `apps/web/src/components/curriculum/PathMasteryView.tsx` | Mastery roadmap component |
| `apps/web/src/components/vanguard/VanguardPanel.tsx` | Vanguard agent panel |
| `apps/web/src/lib/api.ts` | `buildAIHeaders()`, `API_BASE` |

### Backend
| File | Purpose |
|------|---------|
| `apps/api/main.py` | FastAPI app entry — httpx patch lives here |
| `apps/api/config.py` | Settings — `DEFAULT_PROVIDER`, API keys |
| `apps/api/services/ai.py` | All AI generation methods (multi-provider) |
| `apps/api/services/architect.py` | Curriculum/syllabus generation |
| `apps/api/services/scout.py` | Web search + resource synthesis |
| `apps/api/services/vanguard.py` | Vanguard agent — knowledge gap + recommendations |
| `apps/api/routers/ai.py` | API routes for all AI features |
| `apps/api/routers/ingest.py` | Source ingestion + transcription |
| `apps/api/services/social.py` | Legacy social media service |
| `apps/api/services/ytdlp.py` | YouTube download + transcription |

---

## Completed Work (Chronological)

### UI/UX Fixes — Source Page (`/source/<id>`)
- Fixed non-standard border: `border border-[var(--surface-border-strong)]`
- Fixed width misalignment: removed `p-5` from the flex wrapper div
- Fixed content cards to use `vk-card p-6`
- Fixed tab bar: active `border-[var(--secondary)] text-[var(--secondary)] bg-[var(--secondary-light)]/30`
- Added `'social'` to tools array (was a dead button with no onClick)

### Mastery Page Redesign (`/mastery`)
- File: `apps/web/src/components/curriculum/PathMasteryView.tsx`
- Changed from 2-column grid to vertical roadmap (`flex flex-col items-center`)
- Cards: `w-full rounded-2xl border-2 p-7`, left accent stripe `w-1.5 bg-[var(--secondary)]`
- Step number turns to `CheckCircle2` when mastered
- Arrow connectors between nodes: vertical line → circle with `ArrowDown` → vertical line

### Content Repo Page (`/studio`)
- File: `apps/web/src/app/studio/page.tsx` (full rewrite)
- Renamed from "Content Studio" to "Content Repo" everywhere (Sidebar, MobileNav, AppShell)
- Full-width layout with collection dropdown (AnimatePresence, click-outside detection)
- Removed sidebar, replaced with top toolbar

### Studio Tab Fixes
- Removed duplicate titles in DiagramViewer, ReviewSession, QuizInterface
- Fixed Social submenu click handling
- Added platform picker (Twitter / LinkedIn / Instagram) to SocialMediaGenerator
- Replaced all hardcoded `indigo-*` in SocialMediaGenerator with design tokens

### Vanguard Panel Fixes
- Fixed invisible text (was caused by `glass-panel` class on the init card)
- Fixed wrong API endpoint: `/sources/projects/${projectId}/title` → `/sources/projects/${projectId}`
- Removed confusing "Name this project" card
- Added `isScanning` state for persistent processing UI:
  - State 1: `loading && !data` → simple spinner
  - State 2: `isScanning || status === 'processing'` → full processing UI
  - State 3: empty/ready → "Find Resources" button (spins while loading)
- "Find Resources" button keeps spinning until results actually arrive

### Article Editor Fix
- File: `apps/web/src/components/studio/ArticleEditor.tsx`
- Fixed confirm dialog firing on first draft (now only shows when content exists)
- Added visible error banner (red `AlertCircle` box) for API failures
- Button shows "Drafting..." while generating

### AI Prompt Engineering (all backend)
- **`apps/api/services/architect.py`**: All 3 prompts rewritten with explicit JSON schemas, specific node titles, progressive sequencing rules
- **`apps/api/services/vanguard.py`**: Both prompts rewritten with concrete good/bad examples, explicit JSON array output, selection criteria priority order
- **`apps/api/services/scout.py`**: Synthesis prompt rewritten with phase-level context, URL integrity rules, 10-15 word description guidance
- **`apps/api/services/ai.py`** (prompt pass 1 — 2026-04-08):
  - **Prompt writing standards applied across all methods**: no em-dashes, humanized voice, LaTeX for math, ASCII diagrams where visual, concrete examples
  - `generate_summary` (article style): rewritten as "sharp friend explaining over coffee", added LaTeX math + ASCII diagram instructions
  - `generate_summary` (concise): tightened, "60-second briefing" framing
  - `generate_summary` (eli5): added math-with-words-first rule, no em-dashes
  - `generate_quiz`: added math question requirement, better explanation rules with good/bad example
  - `generate_flashcards`: added LaTeX for math cards, better card type variety guidance
  - `generate_social_media`: no em-dashes rule explicit, replaced facebook with instagram
  - `generate_diagram`: added edge label requirements, depth-over-breadth rule
  - `generate_article`: full style guides rewritten, LaTeX math instruction, no em-dashes, active voice rules
  - `chat_with_context`: LaTeX formula instruction added, no em-dashes
  - `generate_podcast_script`: humanized, no em-dashes, banned filler phrases list
  - `generate_node_lesson`: LaTeX + ASCII diagram explicit, specific youtube_search examples, "senior engineer to junior" framing
- **All background services** now use `settings.DEFAULT_PROVIDER` instead of hardcoded `"openai"`

### AI Prompt Engineering — Pass 2 (`apps/api/services/ai.py`, 2026-04-08)
Core philosophy applied: **intuition before definition** — every concept opens with the problem it solves before introducing the term.

- **`generate_summary` (article style)**:
  - Added "build intuition first" as step 1 of the 4-step concept treatment (problem → term → reasoning → analogy → misconception)
  - Diagrams now proactive: "whenever a relationship, process, or architecture is described, draw it. Do not wait for a diagram to appear in the source."
  - Code rule tightened: "grounded in the source material" (not "never invent")
- **`generate_flashcards`**: Added memory hook instruction on card backs — one-sentence analogy or contrast that makes the concept stick
- **`generate_social_media` (platform_guides)**: Fixed all remaining em-dashes
  - twitter: "One punchy sentence. Pick the most surprising..." (was "sentence — the most")
  - linkedin: "Not a question, not a greeting." (was "fact — not a question")
  - instagram: "Hook in the first line. Make someone stop scrolling." (was "first line — make someone")
- **`generate_article` (technical style)**: Added "build intuition before showing the formula" + Markdown comparison tables rule
- **`chat_with_context`**: Added "chain of cause and effect" rule — when asked WHY, walk through X → Y → Z, not just the conclusion
- **`generate_node_lesson`**: Added "build intuition before formal definition" as explicit step 1; diagrams required for every section that describes a flow/pipeline/structure

### Error Handling in AI Routes (`apps/api/routers/ai.py`)
- All studio endpoints (article, quiz, flashcards, social, diagram) now:
  - Catch AI exceptions and surface real error message to frontend
  - Check for empty/malformed AI response
  - Return meaningful HTTP error details
- **REMOVED** the `if not api_key` guard — breaks env var fallback for incognito users

---

## Known Patterns & Gotchas

### `glass-panel` CSS class
Causes semi-transparent white overlay that makes text invisible and overrides background colors. Never use it for colored panels.

### `isScanning` pattern (Vanguard)
Independent of `loading` flag. Set `true` on scan start, set `false` only when `recommendations.length > 0`. Prevents the wizard from reappearing during the 10-30s background processing window.

### Studio tool switching
Source page dispatches `studio-tool-change` custom event to switch active tool from external components.

### `buildAIHeaders()` (frontend)
Reads from `localStorage`:
- `vk_provider_keys` → `{openai, anthropic, google}`
- `vk_ai_prefs` → `{defaultProvider, taskModels}`
In incognito, localStorage is empty → headers have no keys → server falls back to env vars. This is correct behavior.

### Anthropic SDK version
Installed: `anthropic>=0.19.0`. Does NOT support `http_client=` parameter properly. Use the httpx monkey-patch in main.py instead.

---

## Requirements Versions (apps/api/requirements.txt)
- `openai>=1.54.0`
- `httpx>=0.27.0,<0.29.0`
- `anthropic>=0.19.0` (old — httpx patch in main.py compensates)

---

## Things NOT to Do
1. **Don't add `if not api_key` guards** in route handlers — breaks env var fallback
2. **Don't use `glass-panel`** CSS class on any colored element
3. **Don't hardcode `provider="openai"`** in background services — use `settings.DEFAULT_PROVIDER`
4. **Don't pass `http_client=httpx.Client()`** to Anthropic client — old SDK breaks
5. **Don't add title props** to StudioInterface sub-components — causes duplicate headers
6. **Don't use `confirm(...)` dialog** as a gate for first-time generation — it blocks users
