# Contributing to Petalbyte

First off, thank you for considering contributing to Petalbyte! It's people like you that make open-source awesome.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- **Be respectful**: Treat everyone with respect. No harassment, discrimination, or offensive behavior.
- **Be collaborative**: Work together towards common goals. Share knowledge and help others.
- **Be professional**: Keep discussions focused on the project and constructive.
- **Be inclusive**: Welcome newcomers and help them get started.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **System information**:
    - OS and version
    - Docker version
    - Browser (for UI issues)
    - Relevant logs

**Template:**
```markdown
### Description
[Clear description of the bug]

### Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

### Expected Behavior
[What should happen]

### Actual Behavior
[What actually happens]

### Environment
- OS: [e.g., Pop!_OS 22.04]
- Docker: [e.g., 24.0.5]
- Browser: [e.g., Firefox 118]

### Logs
```
[Relevant log output]
```
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use case**: Why is this enhancement needed?
- **Proposed solution**: How do you envision it working?
- **Alternatives considered**: What other solutions did you consider?
- **Additional context**: Mockups, examples, etc.

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the setup instructions** below
3. **Write clean, documented code**
4. **Add tests** for new functionality
5. **Update documentation** as needed
6. **Ensure all tests pass**
7. **Submit a pull request**

## Development Setup

### Prerequisites

- Docker Desktop or Docker Engine
- Node.js 20+ and npm
- Python 3.11+
- Git

### Local Development

1. **Clone your fork:**
```bash
git clone https://github.com/your-username/petalbyte.git
cd petalbyte
```

2. **Backend setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Frontend setup:**
```bash
cd frontend
npm install
```

4. **Run development servers:**

Backend:
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:
```bash
cd frontend
npm run dev
```

5. **Run with Docker (recommended):**
```bash
docker-compose -f docker-compose.dev.yml up
```

## Project Structure

```
petalbyte/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Core business logic
│   │   ├── dependencies/   # System dependency checks
│   │   ├── models.py       # Pydantic models
│   │   └── main.py         # Application entry
│   └── tests/              # Backend tests
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store
│   │   └── api/            # API client
│   └── tests/              # Frontend tests
├── docs/                   # Documentation
├── scripts/                # Utility scripts
└── docker-compose.yml      # Production compose
```

## Documentation

- Update README.md for user-facing changes
- Update API documentation for endpoint changes
- Add JSDoc comments for complex functions
- Include examples in documentation
- Keep tutorials up-to-date

## Review Process

1. **Automated checks** must pass (linting, tests)
2. **Code review** by at least one maintainer
3. **Documentation** must be updated
4. **Changelog** entry required for significant changes
5. **Manual testing** for UI changes

## Release Process

1. Update version numbers
2. Update CHANGELOG.md
3. Create release branch
4. Run full test suite
5. Build and tag Docker images
6. Create GitHub release
7. Update documentation site

## Getting Help

- 💬 Discord: Join our developer channel
- 🐛 Issues: Use the "question" label
- 📖 Wiki: Check developer documentation

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes

Thank you for contributing to Petalbyte! 🎉