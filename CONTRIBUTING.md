# Contributing to VibeKnowing V2

Thank you for your interest in contributing to VibeKnowing V2! This document provides guidelines and instructions for contributing.

## 🎯 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/vibeknowing-v2/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Python/Node versions)
   - Screenshots if applicable

### Suggesting Features

1. Check existing [Discussions](https://github.com/yourusername/vibeknowing-v2/discussions) for similar ideas
2. Create a new discussion or issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Implementation ideas (optional)

### Code Contributions

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow code style guidelines
   - Write tests for new features
   - Update documentation
4. **Commit your changes**
   ```bash
   git commit -m "Add: Description of your feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request**
   - Provide clear description
   - Link related issues
   - Request reviews from maintainers

## 📋 Development Setup

See the main [README.md](README.md) for installation instructions.

## 🎨 Code Style

### Python

- Use **Black** for formatting
- Follow **PEP 8** guidelines
- Type hints are encouraged
- Docstrings for all functions/classes

```bash
# Format code
black apps/api/

# Check style
flake8 apps/api/
```

### TypeScript/React

- Use **Prettier** for formatting
- Follow **ESLint** rules
- Use functional components with hooks
- TypeScript types for all props

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## 🧪 Testing

### Backend Tests

```bash
cd apps/api
pytest tests/
```

### Frontend Tests

```bash
cd apps/web
npm test
```

## 📝 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Changes to existing features
- `Refactor:` Code refactoring
- `Docs:` Documentation changes
- `Test:` Adding or updating tests
- `Style:` Code style changes (formatting)
- `Chore:` Maintenance tasks

Example:
```
Add: Content Discovery Agent for auto-ingestion
Fix: YouTube transcript extraction error handling
Update: Improve AI summary generation prompts
```

## 🔍 Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add changelog entry (if applicable)
4. Request review from maintainers
5. Address review feedback
6. Wait for approval before merging

## 🏗️ Project Structure

- `apps/api/` - Backend API
- `apps/web/` - Frontend application
- `apps/extension/` - Browser extension
- `docs/` - Documentation (if exists)

## 🤔 Questions?

- Open a [Discussion](https://github.com/yourusername/vibeknowing-v2/discussions)
- Join our community chat (if available)
- Email: dev@vibeknowing.com

Thank you for contributing! 🎉

