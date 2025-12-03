# Fixing GitHub Push Error - Workflow Scope Issue

## Problem
You're getting this error:
```
! [remote rejected] main -> main (refusing to allow a Personal Access Token to create or update workflow `.github/workflows/ci.yml` without `workflow` scope)
```

## Solution Options

### Option 1: Update Your Personal Access Token (Recommended)

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Either:
   - **Edit existing token**: Click on your token → Check `workflow` scope → Update token
   - **Create new token**: Generate new token with `workflow` scope enabled

3. Required scopes:
   - ✅ `repo` (full control of private repositories)
   - ✅ `workflow` (update GitHub Action workflows)

4. Update your local git credentials:
   ```bash
   # Remove old credentials
   git credential-osxkeychain erase
   host=github.com
   protocol=https
   # (Press Enter twice)
   
   # Push again (will prompt for new token)
   git push origin main
   ```

### Option 2: Use SSH Instead of HTTPS

1. **Generate SSH key** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. **Add SSH key to GitHub**:
   - Copy your public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to GitHub → Settings → SSH and GPG keys → New SSH key
   - Paste and save

3. **Change remote to SSH**:
   ```bash
   git remote set-url origin git@github.com:yeluru/vibeknowing-v2.git
   ```

4. **Push**:
   ```bash
   git push origin main
   ```

### Option 3: Add Workflow File via GitHub UI

1. **Push without workflow file** (already done):
   ```bash
   git add .
   git commit -m "Initial commit: VibeKnowing V2"
   git push origin main
   ```

2. **Add workflow file via GitHub UI**:
   - Go to your repo on GitHub
   - Click "Add file" → "Create new file"
   - Path: `.github/workflows/ci.yml`
   - Copy content from the local file
   - Commit directly on GitHub

## Current Status

The workflow file has been temporarily removed from git tracking so you can push everything else. The file still exists locally at `.github/workflows/ci.yml`.

After pushing, you can:
- Add it back via GitHub UI (Option 3)
- Or update your PAT and add it back: `git add .github/workflows/ci.yml && git commit -m "Add CI workflow" && git push`

## Quick Push Command

```bash
# Stage all new files (excluding workflow)
git add README.md LICENSE CONTRIBUTING.md CHANGELOG.md SETUP.md .gitignore .env.example

# Commit
git commit -m "Initial commit: VibeKnowing V2 - Agentic AI Content Platform"

# Push (will work now without workflow file)
git push origin main
```

