# Repository Setup Guide

This guide will help you set up the VibeKnowing V2 repository for development.

## 📋 Initial Setup Checklist

### 1. Repository Files Created

✅ **README.md** - Comprehensive project documentation
✅ **LICENSE** - MIT License
✅ **CONTRIBUTING.md** - Contribution guidelines
✅ **CHANGELOG.md** - Version history
✅ **.gitignore** - Git ignore rules
✅ **.env.example** - Environment variables template
✅ **.github/workflows/ci.yml** - GitHub Actions CI/CD

### 2. Git Repository Setup

The repository is already initialized. To set up a remote:

```bash
# Add your GitHub remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/vibeknowing-v2.git

# Or if using SSH
git remote add origin git@github.com:yourusername/vibeknowing-v2.git

# Verify remote
git remote -v
```

### 3. First Commit

```bash
# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: VibeKnowing V2 - Agentic AI Content Platform"

# Push to remote (after setting up remote)
git push -u origin master
```

### 4. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here
```

### 5. Install Dependencies

**Backend:**
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd apps/web
npm install
```

### 6. Initialize Database

```bash
cd apps/api
source venv/bin/activate
python -m migrations.init_db
```

### 7. Run the Application

**Terminal 1 - Backend:**
```bash
cd apps/api
source venv/bin/activate
uvicorn main:app --reload --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
npm run dev
```

## 🚀 Next Steps

1. **Update README.md** - Replace placeholder GitHub URLs with your actual repository
2. **Set up CI/CD** - Configure GitHub Actions secrets (OPENAI_API_KEY, etc.)
3. **Add badges** - Update README badges with your repo info
4. **Create issues** - Set up project board and initial issues
5. **Set up branch protection** - Configure main/master branch rules

## 📝 Repository Customization

### Update README URLs

Search and replace in `README.md`:
- `yourusername` → Your GitHub username
- `support@vibeknowing.com` → Your support email
- `dev@vibeknowing.com` → Your dev email

### Add Repository Topics

On GitHub, add topics:
- `ai`
- `content-platform`
- `agentic-ai`
- `fastapi`
- `nextjs`
- `openai`
- `content-creation`
- `learning-platform`

### Configure GitHub Settings

1. Go to Settings → General
2. Enable Issues and Discussions
3. Set up branch protection rules
4. Configure GitHub Pages (if needed)

## 🔐 Secrets to Configure

For GitHub Actions, add these secrets:
- `OPENAI_API_KEY` - Your OpenAI API key
- `CODECOV_TOKEN` - Code coverage token (optional)

## 📦 Publishing

When ready to publish:

1. Create a release on GitHub
2. Tag the version: `git tag v2.0.0`
3. Push tags: `git push --tags`
4. Update CHANGELOG.md with release notes

## ✅ Verification

Check that everything works:

```bash
# Backend health check
curl http://localhost:8001/health

# Frontend loads
open http://localhost:3000

# API docs accessible
open http://localhost:8001/docs
```

---

**You're all set!** 🎉

For questions or issues, see [CONTRIBUTING.md](CONTRIBUTING.md) or open an issue.

