# VibeKnowing V2 - Agentic AI Content Platform

<div align="center">

![VibeKnowing](https://img.shields.io/badge/VibeKnowing-Agentic%20AI-blue)
![Version](https://img.shields.io/badge/version-2.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

**Transform any content into intelligent learning materials and engaging content with autonomous AI agents**

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation)

</div>

---

## 🚀 Overview

VibeKnowing V2 is an **agentic AI content platform** that autonomously ingests, processes, and transforms content into learning materials, articles, social media posts, and more. Unlike traditional content tools, VibeKnowing uses specialized AI agents that work independently and collaboratively to create high-quality content at scale.

### What Makes It Agentic?

- 🤖 **Autonomous Agents**: Specialized AI agents handle content discovery, processing, creation, and distribution
- 🧠 **Intelligent Planning**: Agents break down complex goals into actionable steps
- 🔄 **Self-Improving**: Agents learn from feedback and optimize their strategies
- 🤝 **Multi-Agent Collaboration**: Agents work together to create better content
- 📊 **Context-Aware**: Agents maintain memory and learn from past interactions

---

## ✨ Features

### Core Capabilities

- **📥 Multi-Source Ingestion**
  - YouTube videos (transcript extraction)
  - Web articles and blog posts
  - PDF documents (with OCR fallback)
  - Audio/Video files (Whisper transcription)
  - Browser extension for secure sites
  - TED talks, LinkedIn posts, Instagram content

- **🧠 AI-Powered Processing**
  - Intelligent summaries (article, concise, ELI5 styles)
  - Auto-generated quizzes with explanations
  - Spaced repetition flashcards
  - Interactive Q&A chat with source content
  - Content analysis and insights

- **✍️ Content Creation Studio**
  - Blog articles (technical, tutorial, conversational)
  - Social media posts (Twitter, LinkedIn, Instagram)
  - ASCII diagrams and visualizations
  - Multi-format content generation

- **📚 Learning Tools**
  - Interactive quizzes
  - Flashcard review sessions
  - Content organization (projects & categories)
  - Drag-and-drop project organization
  - Search and discovery

- **🎨 Modern UI/UX**
  - Resizable sidebar (200-480px adjustable width)
  - Drag-and-drop project management
  - Dark mode support with system preference detection
  - Responsive design for all screen sizes
  - Automatic title truncation (30 characters) for clean UI
  - Real-time content preview
  - Smooth animations and transitions

### Agentic Features (Coming Soon)

- 🔍 **Content Discovery Agent**: Automatically finds and ingests relevant content
- ⚙️ **Processing Agent**: Auto-generates summaries, quizzes, and flashcards on ingestion
- ✍️ **Creation Agent**: Multi-step content generation with research and refinement
- ✅ **Quality Assurance Agent**: Reviews and improves generated content
- 📤 **Distribution Agent**: Auto-posts and schedules content across platforms
- 🎯 **Workflow Automation**: Define custom workflows for content pipelines

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Ingest  │  │  Source  │  │  Studio  │  │  Chat    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (FastAPI)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Routers    │  │   Services   │  │    Agents    │     │
│  │  - Ingest    │  │  - AI        │  │  - Discovery │     │
│  │  - AI        │  │  - Scraper   │  │  - Processing│     │
│  │  - Sources   │  │  - Transcript│  │  - Creation  │     │
│  │  - Create    │  │  - Social    │  │  - QA        │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ SQLite   │  │  Vector  │  │  Redis   │  │  OpenAI  │  │
│  │ Database │  │   DB     │  │  (Queue) │  │   API    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- React Markdown (with LaTeX support)
- Zustand (state management)
- React Query (data fetching)

**Backend:**
- FastAPI
- SQLAlchemy (ORM)
- SQLite (development) / PostgreSQL (production)
- OpenAI API (GPT-4o, o1, Whisper)
- Celery + Redis (background jobs)
- Vector Database (for semantic search)

**Services:**
- yt-dlp (video processing)
- BeautifulSoup (web scraping)
- PyPDF2 + Tesseract (PDF processing)
- Whisper (audio transcription)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **OpenAI API Key** (required for AI features)
- **Redis** (optional, for background jobs)
- **PostgreSQL** (optional, for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/vibeknowing-v2.git
   cd vibeknowing-v2
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

3. **Backend Setup**
   ```bash
   cd apps/api
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Frontend Setup**
   ```bash
   cd apps/web
   npm install
   ```

5. **Initialize Database**
   ```bash
   cd apps/api
   python -m migrations.init_db
   ```

### Running the Application

**Terminal 1 - Backend:**
```bash
cd apps/api
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```

**Terminal 3 - Redis (Optional, for background jobs):**
```bash
redis-server
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 📖 Usage Examples

### 1. Ingest Content

**Via URL:**
- Paste a YouTube, TED, or web article URL
- System automatically extracts content and creates a project

**Via File Upload:**
- Upload PDF, DOCX, audio, or video files
- Content is processed in the background

**Via Browser Extension:**
- Install the extension
- Capture content from any website

### 2. Generate Learning Materials

- **Summary**: Auto-generate article-style summaries with Markdown formatting
- **Quiz**: Create multiple-choice questions with explanations
- **Flashcards**: Generate spaced repetition cards
- **Chat**: Ask questions about the content

### 3. Create Content

- **Articles**: Generate blog posts, tutorials, or technical articles
- **Social Posts**: Create Twitter, LinkedIn, or Instagram content
- **Diagrams**: Visualize concepts with ASCII diagrams

### 4. Organize & Learn

- Organize content into projects and categories
- Search across all your content
- Review flashcards and take quizzes
- Track your learning progress

---

## 🧪 Development

### Project Structure

```
vibeknowing-v2/
├── apps/
│   ├── api/                 # FastAPI backend
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── agents/          # AI agents (coming soon)
│   │   ├── models.py        # Database models
│   │   └── main.py          # FastAPI app
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # Next.js app router
│   │   │   ├── components/  # React components
│   │   │   └── lib/         # Utilities
│   └── extension/           # Browser extension
├── docker-compose.yml       # Docker setup
└── README.md
```

### Running Tests

```bash
# Backend tests
cd apps/api
pytest

# Frontend tests
cd apps/web
npm test
```

### Code Style

- **Python**: Black, flake8
- **TypeScript**: ESLint, Prettier

---

## 🆕 Recent Updates (December 2024)

### UI/UX Improvements
- ✅ **Resizable Sidebar**: Drag the sidebar edge to adjust width (200-480px)
- ✅ **Drag-and-Drop Organization**: Drag projects between categories for easy organization
- ✅ **Title Truncation**: Automatic 30-character limit for cleaner UI
- ✅ **Redesigned Home Page**: Streamlined layout with integrated feature blocks
- ✅ **Optimized Transitions**: Smooth animations without lag during interactions

### Bug Fixes & Enhancements
- ✅ **Instagram Embed Support**: Fixed Instagram Reels embedding
- ✅ **YouTube Shorts**: Added support for YouTube Shorts URLs
- ✅ **API Port Standardization**: Unified backend port to 8000
- ✅ **Database Migrations**: Added migration scripts for data updates
- ✅ **Frontend Performance**: Optimized component rendering and state management

---

## 🗺️ Roadmap

### Phase 1: Foundation (Completed ✅)
- ✅ Multi-source content ingestion
- ✅ AI-powered content generation
- ✅ Learning tools (quizzes, flashcards)
- ✅ Content organization with drag-and-drop
- ✅ Modern, responsive UI with dark mode

### Phase 2: Agentic Core (Q1 2024)
- 🔄 Agent framework and orchestration
- 🔄 Content Processing Agent (auto-generation)
- 🔄 Vector database for semantic search
- 🔄 Workflow engine

### Phase 3: Autonomous Agents (Q2 2024)
- 📅 Content Discovery Agent
- 📅 Content Creation Agent (multi-step)
- 📅 Quality Assurance Agent
- 📅 Multi-agent collaboration

### Phase 4: Intelligence (Q3 2024)
- 📅 Learning and adaptation
- 📅 Advanced monitoring and observability
- 📅 Distribution Agent
- 📅 Human-in-the-loop approval system

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- OpenAI for GPT-4o, o1, and Whisper APIs
- FastAPI and Next.js communities
- All contributors and users

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/vibeknowing-v2/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/vibeknowing-v2/discussions)
- **Email**: support@vibeknowing.com

---

<div align="center">

**Built with ❤️ by the VibeKnowing team**

[⭐ Star us on GitHub](https://github.com/yourusername/vibeknowing-v2) • [📖 Documentation](https://docs.vibeknowing.com) • [🐛 Report Bug](https://github.com/yourusername/vibeknowing-v2/issues)

</div>
