# VibeKnowing V2 Test Plan & Regression Suite

> [!IMPORTANT]
> This plan is designed to verify 100% of core functionality and catch regressions in critical flows (Authentication, Ingestion, Generation).

## 1. Authentication & Onboarding
| ID | Test Case | Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | **Sign Up (New User)** | 1. Go to `/login` <br> 2. Click "Sign up" <br> 3. Enter valid email/password <br> 4. Submit | User is redirected to Dashboard. "Welcome" toast appears. | P0 |
| **AUTH-02** | **Login (Existing User)** | 1. Go to `/login` <br> 2. Enter existing credentials <br> 3. Submit | User is redirected to Dashboard. Projects load. | P0 |
| **AUTH-03** | **Guest Mode** | 1. Clear LocalStorage/Incognito <br> 2. Visit Home `/` | Dashboard loads in Guest Mode. "Sign in" button visible. | P0 |
| **AUTH-04** | **Logout** | 1. Click Profile -> Logout | Redirected to Login page. Token removed. | P1 |

## 2. Project Management (Dashboard)
| ID | Test Case | Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **PROJ-01** | **View Projects** | 1. Login <br> 2. View Dashboard | List of projects appears. **Verify:** New UI shows URL & Transcript Preview on cards. | P0 |
| **PROJ-02** | **Category Grouping** | 1. Create projects in different categories <br> 2. View Dashboard | Projects are grouped by category headers (e.g., "Computer Science", "Uncategorized"). | P1 |
| **PROJ-03** | **Move Project** | 1. Click "..." on Project Card <br> 2. Select "Move to..." -> [New Category] | Project disappears from old group and appears in new group. Toast confirmation. | P1 |
| **PROJ-04** | **Delete Project** | 1. Click "..." on Project Card <br> 2. Select "Delete" | **Verify:** Sonner Toast appears asking for confirmation (No browser alert). <br> 3. Confirm | Project is removed from list. | P1 |
| **PROJ-05** | **Create Category** | 1. Sidebar -> "New Category" <br> 2. Enter name -> Save | New Category appears in sidebar and dropdowns. | P2 |

## 3. Ingestion & Sources (Core Magic)
> [!WARNING]
> These tests verify the complex backend pipelines (Worker, Scraper, LLM Cleanup).

| ID | Test Case | Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **ING-01** | **YouTube Ingestion (Worker)** | 1. Paste YouTube URL (e.g., `youtube.com/watch?v=...`) <br> 2. Click "Analyze" | **Verify:** <br> 1. Status starts as "Processing". <br> 2. Worker handles job. <br> 3. Dashboard updates to "Ready". <br> 4. Card shows URL + Transcript Preview. | P0 |
| **ING-02** | **Webpage Ingestion (Playwright)** | 1. Paste Article URL (e.g., `techcrunch.com/...`) <br> 2. Click "Analyze" | **Verify:** <br> 1. Playwright scrapes content. <br> 2. **LLM Cleanup** runs (removes ads/nav). <br> 3. Clean transcript saved. | P0 |
| **ING-03** | **Invalid URL Handling** | 1. Enter `not-a-url` <br> 2. Click "Analyze" | Error toast: "Invalid URL format". | P2 |
| **ING-04** | **Scheme-less URL** | 1. Enter `youtube.com/...` (no `https://`) | **Verify:** System auto-prepends `https://` and routes to YouTube worker correctly. | P1 |

## 4. Source Detail & Generation
| ID | Test Case | Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **GEN-01** | **View Source** | 1. Click Project Card | Source Detail page loads. Transcript is visible. | P0 |
| **GEN-02** | **Generate Summary** | 1. Click "Summary" tab <br> 2. Click "Generate" | Streaming summary appears. Markdown formatting renders correctly. | P0 |
| **GEN-03** | **Generate Flashcards** | 1. Click "Flashcards" tab <br> 2. Click "Generate" | Flashcards generated. <br> **Verify:** Flip animation works. "Start Review" session works. | P0 |
| **GEN-04** | **Generate Quiz** | 1. Click "Quiz" tab <br> 2. Click "Generate" | Multiple choice questions generate. <br> **Verify:** Selection highlights correct/incorrect answers. | P1 |
| **GEN-05** | **Notes Editor (Studio)** | 1. Click "Notes" tab or Sidebar "Studio" | Editor loads. <br> **Verify:** "Regenerate" button is available. Typing works. | P2 |

## 5. UI Facelift & Responsiveness (Regression)
| ID | Test Case | Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **UI-01** | **Mobile Layout** | 1. Resize browser to Mobile width <br> 2. Check Header/Sidebar | **Verify:** <br> 1. Hamburger menu visible. <br> 2. Sidebar slides in/out. <br> 3. Textbox and Button are full width/aligned. | P1 |
| **UI-02** | **Dark Mode** | 1. Click Theme Toggle | UI switches to Dark Mode. Colors are accessible. No white-on-white text. | P2 |
| **UI-03** | **Visual Polish** | 1. Observe Dashboard | **Verify:** <br> 1. V2 styles (`ui.v2.css`) applied. <br> 2. Gradients and shadows match "Premium" aesthetic. <br> 3. Font is Inter/Plus Jakarta. | P1 |

## 6. Worker & Deployment specific
| ID | Test Case | Steps | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **DEP-01** | **Worker Connection** | 1. (On Render/Prod) Ingest YouTube Video | **Verify:** Tasks are offloaded to local worker via ngrok (headers verify this). No "Browser Warning" errors. | P0 |
| **DEP-02** | **Database Persistence** | 1. Create Project <br> 2. Refresh Page | Project remains. | P0 |

## Execution Log
| Date | Tester | Version | Pass Rate | Notes |
| :--- | :--- | :--- | :--- | :--- |
| | | | | |
