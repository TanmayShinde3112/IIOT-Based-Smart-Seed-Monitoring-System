# Contributing to IIOT-Based-Smart-Seed-Monitoring-System

Thank you for your interest in contributing! This document provides guidelines and instructions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**
   ```bash
   git clone <your-repository-url>
   ```
3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Setup

Follow the [SETUP.md](SETUP.md) guide to set up your development environment.

## Code Style

### Python
- Follow [PEP 8](https://pep8.org/) style guidelines
- Use type hints where possible
- Maximum line length: 100 characters
- Use meaningful variable and function names

### JavaScript/React
- Use ES6+ syntax
- Use meaningful component and function names
- Follow React best practices
- Use hooks instead of class components where appropriate

### General
- Write clear, descriptive commit messages
- Add comments for complex logic
- Keep functions small and focused

## Before Submitting

1. **Test your changes**
   ```bash
   # Run backend tests
   cd backend
   pytest

   # Run frontend build
   cd frontend
   npm run build
   ```

2. **Check for issues**
   - Verify the application runs without errors
   - Test both backend and frontend
   - Test on different browsers (Chrome, Firefox, Safari)

3. **Update documentation**
   - Update README.md if behavior changes
   - Document new features
   - Update SETUP.md if setup changes

## Making a Pull Request

1. **Sync with upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Open a Pull Request** on GitHub with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots (if UI changes)
   - Test results

## Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: add new dashboard chart for humidity trends
fix: resolve sensor reading parsing error
docs: update ESP32 configuration instructions
refactor: simplify authentication service
test: add unit tests for seed prediction model
```

Format:
```
<type>: <short description (50 chars max)>

<optional longer description (wrap at 72 chars)>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `style`: Code style changes
- `perf`: Performance improvements

## Reporting Issues

### Bug Reports
Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots/logs if applicable
- Python/Node.js/Browser versions

### Feature Requests
Include:
- Clear description of the feature
- Use cases/benefits
- Possible implementation approach
- Examples or mockups if applicable

## Project Structure

```
IIOT-Based-Smart-Seed-Monitoring-System/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Configuration
│   │   ├── db/          # Database
│   │   ├── models/      # Data models
│   │   ├── services/    # Business logic
│   │   └── main.py      # Application entry
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment template
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── styles/      # Stylesheets
│   ├── package.json     # Node dependencies
│   └── vite.config.js   # Vite configuration
├── ml/                  # ML training scripts
├── esp32/               # ESP32 firmware
└── docs/                # Documentation
```

## Questions?

- Open an issue for questions
- Check existing issues and discussions
- Review the README and SETUP guide

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing to IIOT-Based-Smart-Seed-Monitoring-System! 🌱
