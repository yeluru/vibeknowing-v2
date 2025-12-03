# VibeKnowing V2 - Complete Features Documentation

## 🎯 Overview

VibeKnowing V2 is a comprehensive **Knowledge & Content Creation Suite** that transforms any content (videos, articles, PDFs, audio) into intelligent learning materials and engaging content using AI.

---

## 📥 Content Ingestion Features

### 1. URL Ingestion
**Endpoints:** `POST /ingest/youtube`, `POST /ingest/web`

**Supported Sources:**
- **YouTube Videos**: Automatic transcript extraction
  - Primary: YouTube Transcript API
  - Fallback: yt-dlp with Whisper transcription
- **TED Talks**: Transcript extraction via yt-dlp
- **Web Articles**: BeautifulSoup scraping with Playwright fallback
- **LinkedIn Posts**: Meta tag extraction
- **Instagram Posts**: Meta tag extraction
- **Generic Web Pages**: Intelligent content extraction

**Features:**
- Automatic URL type detection
- Duplicate URL detection (prevents re-ingestion)
- Auto-creates project if `project_id="default"`
- Updates project title with source title
- Error handling with helpful messages

### 2. File Upload
**Endpoint:** `POST /ingest/file`

**Supported Formats:**
- **Audio/Video**: MP3, MP4, WAV, M4A, WEBM, MPEG
  - Whisper transcription (OpenAI)
  - Automatic chunking for files >25MB
  - Background processing
- **PDF Documents**:
  - Primary: PyPDF2 text extraction
  - Fallback: OCR with Tesseract (optional force_ocr flag)
  - Handles encrypted PDFs
  - Text cleanup and formatting
- **Word Documents**: DOCX text extraction
- **Text Files**: TXT, MD, CSV, JSON (direct decoding)

**Features:**
- Background processing for large files
- Real-time status updates (`meta_data.status: "processing"`)
- Force OCR option for scanned PDFs
- Automatic file type detection
- Progress tracking

### 3. Browser Extension
**Endpoint:** `POST /ingest/extension`

**Features:**
- Captures content from secure websites
- Creates default "Extension Captures" project
- Supports any content type

### 4. Content Refresh
**Endpoint:** `POST /ingest/refresh/{source_id}`

**Features:**
- Re-scrapes original URL
- Updates content and title
- Clears summary for regeneration
- Useful for updating stale content

---

## 🧠 AI-Powered Features

### 1. Summaries
**Endpoint:** `POST /ai/summarize/{source_id}`

**Styles:**
- **Article**: Comprehensive, well-structured educational article
  - Uses OpenAI o1 model
  - Markdown formatting with headings
  - LaTeX math support
  - ASCII diagrams
  - 16,000 token output
- **Concise**: Bullet-point summary (4,000 tokens)
- **ELI5**: Simple explanations with analogies (8,000 tokens)

**Features:**
- Caching (returns existing summary unless `force=true`)
- Auto-saves as artifact
- Markdown + LaTeX rendering in frontend
- Auto-generates when Summary tab is opened

### 2. Interactive Chat
**Endpoint:** `POST /ai/chat` (streaming)

**Features:**
- **RAG-based Q&A**: Uses full source content as context
- **Streaming responses**: Real-time token streaming
- **Chat history**: Persistent message storage
- **Context-aware**: Answers based on source content
- **Suggestion prompts**: Pre-filled question suggestions
- **History endpoint**: `GET /ai/chat/history/{source_id}`

**UI Features:**
- Message list with user/assistant distinction
- Streaming text display
- Loading states
- Error handling

### 3. Quiz Generation
**Endpoint:** `POST /ai/quiz/{source_id}`

**Features:**
- **5 multiple-choice questions** per quiz
- **4 options** per question
- **Correct answer** with explanation
- **JSON format** for structured data
- Uses GPT-4o model
- Saves as artifact

**UI Features:**
- Interactive quiz interface
- Question-by-question navigation
- Answer selection and feedback
- Score tracking
- Explanation display

### 4. Flashcards
**Endpoint:** `POST /ai/flashcards/{source_id}`

**Features:**
- **10 flashcards** per source
- **Front/Back format**
- Optimized for spaced repetition
- Uses GPT-4o model
- Saves as artifact

**UI Features:**
- **Review Session**: Full-screen flashcard review
- **Flip animation**: Click to reveal answer
- **Navigation**: Previous/Next cards
- **Progress tracking**: Cards reviewed counter
- **Deck selection**: Choose project to review

### 5. Social Media Posts
**Endpoint:** `POST /ai/social-media/{source_id}`

**Platforms:**
- **Twitter**: 280 chars, engaging hook, 1-2 hashtags
- **LinkedIn**: Professional, 1-3 paragraphs, insights
- **Facebook**: Conversational, 1-2 paragraphs

**Output Format:**
```json
{
  "post": "Content text",
  "hashtags": ["tag1", "tag2"],
  "hook": "Opening line"
}
```

**UI Features:**
- Platform selector
- Copy to clipboard
- Regenerate option
- Preview formatting

### 6. Diagrams
**Endpoint:** `POST /ai/diagram/{source_id}`

**Features:**
- **ASCII diagrams**: Box-drawing characters
- **Concept visualization**: Optional concept parameter
- **Educational diagrams**: Process flows, relationships
- Uses GPT-4o model

**Output Format:**
```json
{
  "diagram": "ASCII art",
  "type": "ascii",
  "title": "Diagram title",
  "description": "Explanation"
}
```

**UI Features:**
- Monospace font display
- Copy diagram text
- Concept input field

### 7. Articles
**Endpoint:** `POST /ai/article/{source_id}`

**Styles:**
- **Blog**: Conversational, 800-1200 words
- **Technical**: Detailed, 1000-1500 words, code examples
- **Tutorial**: Step-by-step, 1000-1500 words, numbered steps

**Output Format:**
```json
{
  "title": "Article title",
  "content": "Markdown content",
  "excerpt": "2-3 sentence summary",
  "readTime": 5
}
```

**UI Features:**
- **Article Editor**: Full markdown editor
- **Live preview**: Rendered markdown
- **Save/Update**: `PUT /ai/article/{source_id}`
- **Export options**: Copy, download
- **LaTeX support**: Math rendering

---

## 📚 Content Organization

### 1. Projects
**Endpoints:**
- `GET /sources/projects/` - List all projects
- `PUT /sources/projects/{id}/category` - Update category
- `DELETE /sources/projects/{id}` - Delete project

**Features:**
- Auto-created on content ingestion
- Title auto-updated from source
- Category assignment
- Source count tracking
- First source ID for navigation

### 2. Categories
**Endpoints:**
- `GET /categories/` - List categories
- `POST /categories/` - Create category
- `PUT /categories/{id}` - Update category
- `DELETE /categories/{id}` - Delete category

**Features:**
- User-specific categories
- Project organization
- Auto-unlink projects on deletion
- Name uniqueness per user

### 3. Sources
**Endpoints:**
- `GET /sources/{id}` - Get source details
- `GET /sources/` - List recent sources
- `PUT /sources/{id}/transcript` - Manual transcript upload
- `DELETE /sources/{id}` - Delete source

**Source Types:**
- `youtube`, `web`, `ted`, `instagram`, `linkedin`, `pdf`, `audio`, `file`, `text`

**Metadata:**
- `meta_data.status`: "processing", "completed", "failed"
- `meta_data.error`: Error messages
- `summary`: Cached AI summary
- `content_text`: Full extracted content

---

## 🎨 Frontend Pages & Routes

### 1. Home Page (`/`)
**Features:**
- **Hero Section**: Content ingestion interface
  - URL input with type detection
  - File upload with drag & drop
  - Tab switching (URL/File)
- **Project Search**: Real-time search by title
- **Recent Projects**: List of all projects
- **Stats Display**: Total projects, recent activity
- **Quick Actions**: Direct links to projects

### 2. Source Page (`/source/[id]`)
**Main Workspace** with 7 tabs:

#### Tab 1: Transcript
- Full content text display
- Copy to clipboard
- Processing status indicator
- Manual transcript upload (if extraction failed)
- Auto-refresh during processing

#### Tab 2: Summary
- AI-generated summary display
- Markdown + LaTeX rendering
- Auto-generate on tab open
- Regenerate option
- Copy summary
- Style selector (article/concise/ELI5)

#### Tab 3: Chat
- Interactive Q&A interface
- Streaming responses
- Chat history
- Suggestion prompts
- Message list with timestamps

#### Tab 4: Quiz
- Question-by-question interface
- Answer selection
- Immediate feedback
- Score tracking
- Explanation display
- Generate new quiz

#### Tab 5: Flashcards
- Full-screen review session
- Card flip animation
- Navigation controls
- Progress tracking
- Deck selection

#### Tab 6: Studio
- **Social Media Tool**: Generate posts for Twitter/LinkedIn/Instagram
- **Diagram Tool**: Generate and view ASCII diagrams
- **Article Tool**: Generate and edit articles
- Tool switching with URL persistence
- Copy/export options

#### Tab 7: View
- Embedded content viewer
- Original URL display
- Iframe rendering

**Additional Features:**
- Project navigation (Previous/Next)
- Delete project button
- Tab persistence (localStorage + URL)
- Refresh content button

### 3. Studio Page (`/studio`)
**Features:**
- **Category View**: Browse projects by category
- **Project Grid**: Visual project cards
- **Quick Actions**: Direct links to:
  - Flashcards
  - Social Media posts
  - Diagrams
  - Articles
- **Search**: Filter projects in category
- **Delete**: Project deletion with confirmation
- **Category Navigation**: Back to category list

### 4. Flashcards Page (`/flashcards`)
**Features:**
- Project list for flashcard selection
- Direct link to review session
- Project filtering
- Empty state handling

---

## 🧩 Components Architecture

### Layout Components
- **AppShell**: Main layout wrapper with sidebar
- **Header**: Top navigation (currently commented out)
- **Sidebar**: 
  - Category tree view
  - Project listing
  - Create category
  - Project actions (delete, move)
  - Search functionality

### Ingest Components
- **UrlInput**: URL and file input with validation
- **FileUpload**: Drag & drop file upload

### Content Components
- **ContentViewer**: Embedded content display
- **ChatInterface**: Full chat UI with streaming
- **ChatInput**: Message input with suggestions
- **MessageList**: Chat message display

### Learning Components
- **QuizInterface**: Interactive quiz taking
- **QuestionCard**: Individual question display
- **ReviewSession**: Flashcard review interface
- **FlashcardDeck**: Deck selection and management

### Studio Components
- **StudioInterface**: Tool selector and container
- **SocialMediaGenerator**: Social post creation
- **DiagramViewer**: Diagram display and generation
- **ArticleEditor**: Markdown article editor

### Navigation Components
- **Breadcrumbs**: Path navigation
- **ProjectNav**: Project navigation controls

---

## 🔧 Backend Services

### 1. AIService (`services/ai.py`)
- **Models Used**:
  - `o1`: Summaries (reasoning model)
  - `gpt-4o`: Quizzes, flashcards, social, diagrams, articles
  - `whisper-1`: Audio transcription
- **Function Calling**: Not yet implemented
- **Streaming**: Chat responses
- **JSON Mode**: Structured outputs for quizzes/flashcards

### 2. WebScraperService (`services/scraper.py`)
- URL type detection
- Platform-specific scrapers
- BeautifulSoup parsing
- Playwright fallback for JS-rendered pages
- PDF handling
- Retry logic

### 3. TranscriptService (`services/transcript.py`)
- YouTube video ID extraction
- YouTube Transcript API integration
- Error handling

### 4. YtDlpService (`services/ytdlp.py`)
- Video processing with yt-dlp
- Subtitle extraction (VTT)
- Audio download and transcription
- File chunking for large videos
- Retry logic for transcription

### 5. SocialMediaService (`services/social.py`)
- LinkedIn post generation
- Instagram caption generation
- Style customization

---

## 💾 Database Schema

### Models
1. **User**: Email, name, avatar
2. **Category**: Name, owner
3. **Project**: Title, description, category, owner
4. **Source**: Type, URL, title, content_text, summary, metadata
5. **Artifact**: Type, title, content (JSON), linked to source/project
6. **ChatMessage**: Role, content, linked to source

### Relationships
- User → Projects (one-to-many)
- User → Categories (one-to-many)
- Project → Sources (one-to-many, cascade delete)
- Project → Artifacts (one-to-many, cascade delete)
- Source → Artifacts (one-to-many)
- Source → ChatMessages (one-to-many)

---

## 🎯 Key Features Summary

### ✅ Implemented
1. Multi-source content ingestion (URL, file, extension)
2. AI-powered summaries (3 styles)
3. Interactive chat with streaming
4. Quiz generation and taking
5. Flashcard creation and review
6. Social media post generation
7. Diagram generation (ASCII)
8. Article generation and editing
9. Project and category organization
10. Content refresh
11. Manual transcript upload
12. Background file processing
13. Real-time status updates
14. Tab persistence
15. Search functionality

### 🔄 Partially Implemented
1. Vector search (commented as "for production")
2. Multi-modal support (images/video analysis)
3. Code execution
4. Advanced error recovery

### ❌ Not Yet Implemented (Agentic Features)
1. Agent framework
2. Content Discovery Agent
3. Auto-generation on ingestion
4. Multi-agent collaboration
5. Workflow automation
6. Learning and adaptation
7. Quality Assurance Agent
8. Distribution Agent

---

## 🚀 API Endpoints Summary

### Ingestion
- `POST /ingest/youtube` - Ingest YouTube video
- `POST /ingest/web` - Ingest web URL
- `POST /ingest/file` - Upload file
- `POST /ingest/extension` - Browser extension capture
- `POST /ingest/refresh/{source_id}` - Refresh source content

### AI Features
- `POST /ai/chat` - Chat with source (streaming)
- `GET /ai/chat/history/{source_id}` - Get chat history
- `POST /ai/summarize/{source_id}` - Generate summary
- `POST /ai/quiz/{source_id}` - Generate quiz
- `GET /ai/quiz/{source_id}` - Get quiz
- `POST /ai/flashcards/{source_id}` - Generate flashcards
- `GET /ai/flashcards/{source_id}` - Get flashcards
- `POST /ai/social-media/{source_id}` - Generate social post
- `GET /ai/social-media/{source_id}` - Get social post
- `POST /ai/diagram/{source_id}` - Generate diagram
- `GET /ai/diagram/{source_id}` - Get diagram
- `POST /ai/article/{source_id}` - Generate article
- `GET /ai/article/{source_id}` - Get article
- `PUT /ai/article/{source_id}` - Update article

### Sources & Projects
- `GET /sources/{source_id}` - Get source
- `GET /sources/` - List sources
- `PUT /sources/{source_id}/transcript` - Update transcript
- `DELETE /sources/{source_id}` - Delete source
- `GET /sources/projects/` - List projects
- `PUT /sources/projects/{id}/category` - Update project category
- `DELETE /sources/projects/{id}` - Delete project

### Categories
- `GET /categories/` - List categories
- `POST /categories/` - Create category
- `PUT /categories/{id}` - Update category
- `DELETE /categories/{id}` - Delete category

### Content Creation (Legacy)
- `POST /create/social` - Create social post
- `POST /create/diagram` - Create diagram

---

## 📊 Statistics

- **Total API Endpoints**: 30+
- **Frontend Pages**: 4 main pages
- **React Components**: 20+ components
- **Backend Services**: 5 services
- **Supported File Types**: 10+ formats
- **AI Models Used**: 3 (o1, gpt-4o, whisper-1)
- **Content Sources**: 6 types (YouTube, Web, TED, LinkedIn, Instagram, Files)

---

This documentation represents the current state of VibeKnowing V2 as a comprehensive content ingestion and AI-powered learning platform.

