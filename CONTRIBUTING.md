# Contributing to Image Tagger

Thank you for your interest in contributing to Image Tagger! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Documentation](#documentation)

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful**: Treat all contributors with respect and kindness
- **Be inclusive**: Welcome newcomers and help them get started
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone has different skill levels and backgrounds

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed
- **npm** or **yarn** package manager
- **Git** for version control
- **Google Gemini API key** for testing AI features
- Basic knowledge of **TypeScript**, **React**, and **Express.js**

### Development Setup

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/image-tagger.git
   cd image-tagger
   ```

2. **Set up the development environment**
   ```bash
   # Run the setup script
   ./scripts/setup.sh
   
   # Or manually:
   npm run install:all
   cp .env.example .env
   # Edit .env and add your Gemini API key
   ```

3. **Start the development servers**
   ```bash
   # Start both server and client
   ./scripts/start.sh
   
   # Or individually:
   npm run dev:server  # Backend on port 3001
   npm run dev:client  # Frontend on port 5173
   ```

4. **Verify the setup**
   - Visit http://localhost:5173
   - Upload a test image
   - Verify AI analysis works

## 📝 Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug fixes**: Fix issues and improve stability
- **✨ New features**: Add new functionality
- **📚 Documentation**: Improve docs, README, comments
- **🎨 UI/UX improvements**: Enhance user interface
- **⚡ Performance**: Optimize code and improve speed
- **🧪 Tests**: Add or improve test coverage
- **🔧 Tooling**: Improve development tools and scripts

### Before You Start

1. **Check existing issues**: Look for related issues or discussions
2. **Create an issue**: For new features or major changes, create an issue first
3. **Discuss your approach**: Get feedback before starting significant work
4. **Keep it focused**: One feature/fix per pull request

### Coding Standards

#### TypeScript/JavaScript
- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Use **meaningful variable names** and **clear function signatures**
- Add **JSDoc comments** for public APIs
- Prefer **async/await** over promises

#### React Components
- Use **functional components** with hooks
- Follow **React best practices**
- Use **TypeScript interfaces** for props
- Keep components **small and focused**
- Use **CSS modules** or **styled-components**

#### Backend Code
- Follow **RESTful API** conventions
- Use **proper HTTP status codes**
- Add **error handling** and **validation**
- Use **database transactions** where appropriate
- Add **logging** for debugging

#### Database
- Use **migrations** for schema changes
- Add **proper indexes** for performance
- Follow **SQL best practices**
- Document **schema changes**

## 🔄 Pull Request Process

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes
- Write clean, well-documented code
- Follow the coding standards
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes
```bash
# Run tests (when available)
npm test

# Test manually
./scripts/start.sh
# Verify your changes work correctly
```

### 4. Commit Your Changes
```bash
# Use conventional commit messages
git commit -m "feat: add batch processing progress indicators"
git commit -m "fix: resolve pagination issue with large datasets"
git commit -m "docs: update API documentation"
```

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
# Create pull request on GitHub
```

### 6. PR Requirements

Your pull request should:
- **Have a clear title** and description
- **Reference related issues** (e.g., "Fixes #123")
- **Include screenshots** for UI changes
- **Pass all checks** (linting, tests)
- **Be up to date** with the main branch

## 🐛 Issue Reporting

### Bug Reports

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected vs actual behavior**
- **Environment details** (OS, Node.js version, browser)
- **Screenshots or logs** if applicable
- **Minimal reproduction case** if possible

### Feature Requests

For new features, please provide:

- **Clear description** of the feature
- **Use case and motivation**
- **Proposed implementation** (if you have ideas)
- **Alternatives considered**
- **Additional context** or examples

## 🛠 Development Workflow

### Project Structure
```
image-tagger/
├── src/                 # Backend source code
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── client/             # Frontend React app
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── services/   # API clients
│   │   └── styles/     # CSS files
├── scripts/            # Development scripts
├── docs/              # Documentation
└── tests/             # Test files
```

### Key Technologies

- **Backend**: Node.js, Express.js, TypeScript, SQLite
- **Frontend**: React, TypeScript, Vite, CSS3
- **AI**: Google Gemini API
- **Image Processing**: Sharp
- **Development**: Nodemon, Concurrently, ESLint

### Common Tasks

```bash
# Install dependencies
npm run install:all

# Start development
./scripts/start.sh

# Build for production
npm run build:all

# Stop all processes
./scripts/stop.sh

# Clean install
rm -rf node_modules client/node_modules
npm run install:all
```

## 🧪 Testing

### Manual Testing

1. **Image Upload**: Test single image upload and analysis
2. **Batch Processing**: Test folder processing with various scenarios
3. **Search**: Test keyword and general search functionality
4. **Pagination**: Test with large datasets
5. **Error Handling**: Test with invalid inputs and network issues

### Test Scenarios

- Upload supported formats (JPG, PNG, TIFF, RAW)
- Test with large files (near 50MB limit)
- Test batch processing with mixed file types
- Test duplicate detection
- Test search across all metadata fields
- Test pagination with different page sizes

## 📚 Documentation

### What to Document

- **API endpoints**: Parameters, responses, examples
- **New features**: How to use them
- **Configuration**: Environment variables, options
- **Deployment**: Setup and deployment instructions
- **Troubleshooting**: Common issues and solutions

### Documentation Style

- Use **clear, concise language**
- Include **code examples**
- Add **screenshots** for UI features
- Keep **README.md** up to date
- Use **proper markdown formatting**

## 🎯 Areas for Contribution

### High Priority
- **Test coverage**: Add unit and integration tests
- **Error handling**: Improve error messages and recovery
- **Performance**: Optimize batch processing and database queries
- **Accessibility**: Improve keyboard navigation and screen reader support

### Medium Priority
- **Additional AI providers**: Support for other AI services
- **Export features**: Export metadata to various formats
- **Advanced search**: Filters, sorting, date ranges
- **User management**: Multi-user support with authentication

### Low Priority
- **Themes**: Dark mode and custom themes
- **Plugins**: Plugin system for extensibility
- **Mobile app**: React Native mobile application
- **Cloud deployment**: Docker containers and cloud setup

## 📞 Getting Help

If you need help or have questions:

1. **Check the documentation**: README.md and docs/
2. **Search existing issues**: Someone might have asked already
3. **Create a discussion**: For general questions
4. **Join the community**: Participate in issue discussions

## 📄 License

By contributing to Image Tagger, you agree that your contributions will be licensed under the same license as the project (Non-Commercial Use License). See [LICENSE.md](LICENSE.md) for details.

---

**Thank you for contributing to Image Tagger! 🎉**
