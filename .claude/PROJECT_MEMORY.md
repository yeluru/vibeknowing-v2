# VibeKnowing V2 — Project Memory
> Last updated: 2026-04-14 (Tutorial redesign, sidebar nav, Vanguard/Scout fixes, AI prompt overhaul)
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
- **Max-width pattern**: `max-w-7xl mx-auto` at layout level (AppShell `<main>`). Pages use `w-full` or repeat `max-w-7xl mx-auto px-6`. Do NOT add inner `max-w-3xl` constraints inside components.
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
| `apps/web/src/app/paths/[id]/page.tsx` | Project/path tutorial page (no Back button, capitalize title) |
| `apps/web/src/app/category/[id]/page.tsx` | **NEW** Category-level tutorial page |
| `apps/web/src/components/layout/Sidebar.tsx` | Desktop sidebar nav — heavily reworked (see below) |
| `apps/web/src/components/layout/MobileNav.tsx` | Mobile bottom nav |
| `apps/web/src/components/layout/AppShell.tsx` | App shell — main scroll container is `<main className="flex-1 overflow-y-auto ...">` |
| `apps/web/src/components/tutorial/PathTutorialInterface.tsx` | **Major rewrite** — see below |
| `apps/web/src/components/vanguard/VanguardPanel.tsx` | Vanguard agent panel — error state + timeout added |
| `apps/web/src/lib/api.ts` | `buildAIHeaders()`, `API_BASE` |

### Backend
| File | Purpose |
|------|---------|
| `apps/api/main.py` | FastAPI app entry — httpx patch lives here |
| `apps/api/config.py` | Settings — `DEFAULT_PROVIDER`, API keys |
| `apps/api/services/ai.py` | All AI generation methods (multi-provider) |
| `apps/api/services/scout.py` | Web search — raises `ValueError` if TAVILY_API_KEY missing (was silent return) |
| `apps/api/services/vanguard.py` | Vanguard agent — all silent failures now save error artifacts |
| `apps/api/routers/ai.py` | API routes — tutorial endpoints heavily updated |

---

## Completed Work (Chronological)

### Earlier Sessions (pre 2026-04-14)
*(See earlier entries in Completed Work section below — UI/UX fixes, prompt engineering, etc.)*

---

### Sidebar Navigation Rework (`apps/web/src/components/layout/Sidebar.tsx`)
- **Category click**: navigates to `/category/${cat.id}` AND toggles expand to show source sub-items
- **Source sub-items**: flat list under each category (no intermediate project row)
- **Global Inbox**: flattened — sources shown directly, no expand submenu
- **Three-dot menu** on every source item: dropdown to move source to any mastery path or back to inbox
- `handleMoveSourceToPath()`: moves whole project (`updateCategory`) if only 1 source, otherwise moves source to new project
- Fixed-position dropdowns to escape `overflow:hidden` on sidebar
- `PathRow` now navigates to `/source/${first_source_id}` (not tutorial page)

### Category Tutorial Page (`apps/web/src/app/category/[id]/page.tsx`) — NEW FILE
- Loads category name + all projects, aggregates ALL sources across all projects
- No Back button; title uses `capitalize` CSS
- Passes `categoryId` to `PathTutorialInterface` (not `projectId`)

### PathTutorialInterface — Major Redesign (`apps/web/src/components/tutorial/PathTutorialInterface.tsx`)

#### Reading View (chapter view)
- **Removed** the 256px sidebar entirely (`SidebarContent`, `<aside>`, mobile overlay)
- **Removed** `sidebarOpen`, `sidebarSearch`, `expandedModules` state
- **Added** sticky breadcrumb bar at top: `← Home › Module Name › Ch X/Y | duration | Mark done`
- **Full-width** content area — no `max-w-3xl` constraint; uses `w-full`
- **Prev/Next** buttons: card-style with module-crossing indicators ("Next · ⚡ Module 2")
- **Scroll to top** on every chapter/home navigation via `useEffect` on `activeChapter` — walks up DOM to find `overflow-y: auto` ancestor (the AppShell `<main>`)

#### Tutorial Homepage (ready + no activeChapter)
- **Regenerate button** moved to top-right of hero card (was buried in "All Modules" row)
- Rendered as pill button alongside topic/theme/source badges

#### Tab Labels
- All topic types: "Tutorial Steps" → **"Hands-On"**

#### Dual-mode (project vs category)
- `categoryId?: string` prop added
- `entityId = categoryId ?? projectId` — all localStorage/sessionStorage keys use this
- `tutorialApiUrl` switches between `/ai/tutorial/project/${projectId}` and `/ai/tutorial/category/${categoryId}`

#### WorkedExamplePanel crash fix
- `workedExample` prop made optional; null guard added with "No worked example" empty state
- `proTip` also made optional; falls back to `(chapter as any).proTips?.[0]`
- All array fields use `?? []` null coalescing

### Vanguard & Scout Error Handling

#### `apps/api/services/vanguard.py`
- Added `_save_artifact()` helper (upserts artifact)
- Added `_save_error()` helper — saves `{status:"error", error:"message", recommendations:[], agent_commentary:""}` artifact
- Every silent `return` path now calls `_save_error()` so frontend never gets stuck in infinite spinner
- Failure paths covered: no Tavily key, no project_id, no queries, no search results, no synthesis, global exception

#### `apps/api/services/scout.py`
- Missing `TAVILY_API_KEY` now raises `ValueError` instead of returning `[]`

#### `apps/web/src/components/vanguard/VanguardPanel.tsx`
- Added `error?` field to `VanguardData` interface
- Added `scanStartRef` + `SCAN_TIMEOUT_MS = 120_000` (2-minute scan cap)
- Polling stops on terminal states (`ready`, `error`, timeout)
- Red error state rendered with message + "Try Again" button

### Tutorial Backend Endpoints (`apps/api/routers/ai.py`)

#### New Category Endpoint
- `GET /ai/tutorial/category/{category_id}` — returns cached tutorial (by `title="cat:{category_id}"`)
- `POST /ai/tutorial/category/{category_id}` — generates category-level tutorial across all sources in all projects
- Stored as `Artifact(project_id=None, source_id=None, type="tutorial", title="cat:{category_id}")`

#### Schema Fix (category endpoint)
- Was using `stepNumber`/`instruction` — fixed to `step`/`body` matching frontend `TutorialStep` interface
- Added `workedExample` field (was missing entirely)
- Fixed `pitfalls` schema: `title`/`description` → `name`/`description`/`fix`
- Fixed `proTips[]` → `proTip{}` with `title`/`insight`

#### Dynamic Module/Chapter Count — `_tutorial_scope(content_len, source_count)`
```python
def _tutorial_scope(content_len: int, source_count: int = 1) -> tuple[int, int]:
    depth = max(content_len, source_count * 2000)
    if depth < 3000:   return 2, 2   # 4 chapters
    elif depth < 6000: return 2, 3   # 6 chapters
    elif depth < 10000: return 3, 2  # 6 chapters
    elif depth < 18000: return 3, 3  # 9 chapters
    elif depth < 30000: return 4, 3  # 12 chapters
    else:               return 5, 3  # 15 chapters
```
- All three outline prompts (single-source, project, category) now call `_tutorial_scope()` and inject counts
- No longer hardcoded to 4 modules × 2 chapters

#### AI Prompt Improvements (all 3 tutorial endpoints)
- **Outline prompts**: source content budget raised (3000→8000 single, 4000→12000 multi); outline now extracts `keyTerms` (3 exact terms from source per module)
- **Chapter prompts**: `keyTerms` injected as hint; strong `system_prompt` added ("O'Reilly book chapter density, not blog summary"); `max_tokens` raised 4000→5000; word count minimums enforced with explicit failure condition
- **outline `max_tokens`**: raised 2000→3500

---

## Tutorial Data Schema (frontend TypeScript)
```typescript
interface TutorialStep { step: number; title: string; body: string; code?: string }
interface WorkedExample { title: string; problem: string; solution: string; verify: string }
interface Pitfall { name: string; description: string; fix: string }
interface ProTip { title: string; insight: string }
interface Chapter {
  id: string; title: string; duration: string;
  concepts: Concept[]; tutorialSteps: TutorialStep[];
  workedExample?: WorkedExample; pitfalls: Pitfall[]; proTip?: ProTip;
}
```
**CRITICAL**: Backend must use `step`/`body` (NOT `stepNumber`/`instruction`). `workedExample` and `proTip` are optional on frontend.

---

## UI/UX Fixes — Source Page (`/source/<id>`)
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

### Content Repo Page (`/studio`)
- Renamed from "Content Studio" to "Content Repo" everywhere (Sidebar, MobileNav, AppShell)
- Full-width layout with collection dropdown

### AI Prompt Engineering (all backend, 2026-04-08)
- **`apps/api/services/architect.py`**: explicit JSON schemas, progressive sequencing rules
- **`apps/api/services/vanguard.py`**: concrete examples, explicit JSON output
- **`apps/api/services/scout.py`**: phase-level context, URL integrity rules
- **`apps/api/services/ai.py`**: no em-dashes, humanized voice, LaTeX for math, "intuition before definition" philosophy applied across all methods

---

## Known Patterns & Gotchas

### `glass-panel` CSS class
Causes semi-transparent white overlay that makes text invisible. Never use for colored panels.

### Tutorial localStorage keys
Pattern: `path-tutorial-${entityId}` where `entityId = categoryId ?? projectId`. Keys:
- `path-tutorial-${entityId}` — cached TutorialData JSON
- `path-tutorial-${entityId}-tab` — active tab
- `path-tutorial-${entityId}-chapter` — active chapter id
- `path-tutorial-${entityId}-completed` — JSON array of completed chapter ids

### Tutorial scroll-to-top
`useEffect` on `activeChapter` walks up DOM from `mainRef` to find `overflow-y: auto` ancestor (AppShell `<main>`) and calls `scrollTo({ top: 0, behavior: "instant" })`.

### Tutorial API caching
Category tutorials cached as `Artifact(project_id=None, source_id=None, type="tutorial", title="cat:{category_id}")`. Project tutorials cached as `Artifact(project_id=pid, source_id=None, type="tutorial")`.

### `isScanning` pattern (Vanguard)
Independent of `loading` flag. Set `true` on scan start, set `false` only when terminal state reached. Prevents wizard reappearing during 10-30s background processing.

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
7. **Don't add `max-w-3xl` or similar inner constraints** inside tutorial/page components — breaks full-width layout
8. **Don't hardcode 4 modules × 2 chapters** in tutorial outline prompts — use `_tutorial_scope()` helper
9. **Don't use `stepNumber`/`instruction`** in tutorial step JSON — frontend expects `step`/`body`
