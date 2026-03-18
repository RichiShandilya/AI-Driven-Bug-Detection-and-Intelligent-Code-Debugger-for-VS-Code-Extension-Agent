# 🔍 AI Bug Detector — VS Code Extension

> **AI-Driven Bug Detection and Intelligent Code Debugger**
> B.Tech Final Year Project

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue?logo=visualstudiocode)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178c6?logo=typescript)](https://typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI%20Powered-4285f4?logo=google)](https://ai.google.dev/)

---

## 📖 Overview

AI Bug Detector is a Visual Studio Code extension that **automatically detects common bugs** in Python, JavaScript, and Java code using **rule-based static analysis** and then provides **beginner-friendly AI-powered explanations** via the Google Gemini API.

### Key Features

- 🐛 **7 Bug Detection Rules** — Unused variables, unused functions, missing returns, infinite loops, assignment in conditions, unreachable code, and logical errors
- 🤖 **AI Explanations** — Each bug gets a plain-English explanation and suggested fix from Google Gemini
- 🎨 **Beautiful WebView UI** — Dark/light theme aware results panel with severity-colored cards
- ⚡ **Fast & Non-Blocking** — Rules run in parallel; one failing rule never blocks others
- 📦 **Zero External CDN** — All UI assets are fully inline

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ installed
- **VS Code** 1.85.0+
- **Google Gemini API Key** (free tier) — [Get yours here](https://makersuite.google.com/app/apikey)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd ai-bug-detector

# 2. Install dependencies
npm install

# 3. Set up your Gemini API key
cp .env.example .env
# Edit .env and replace 'your_gemini_api_key_here' with your actual key

# 4. Compile the TypeScript source
npm run compile
```

### Running the Extension

1. Open the `ai-bug-detector` folder in VS Code.
2. Press **F5** to launch the Extension Host window.
3. Open any `.py`, `.js`, `.ts`, or `.java` file.
4. Open the Command Palette (`Ctrl+Shift+P`) and run:
   **"AI Bug Detector: Analyze Current File"**
5. View the results in the WebView panel that opens beside your editor.

---

## 🏗️ Architecture

```
src/
├── extension.ts              ← Entry point & command registration
├── core/
│   ├── codeExtractor.ts      ← File reading & language detection
│   ├── bugClassifier.ts      ← Severity assignment & labels
│   └── bugDetectionEngine.ts ← Orchestrates all 7 rules
├── parsers/
│   ├── parserFactory.ts      ← Routes to correct parser by language
│   ├── pythonParser.ts       ← Regex + line-based Python analysis
│   ├── jsParser.ts           ← Babel AST for JavaScript/TypeScript
│   └── javaParser.ts         ← Regex + pattern-based Java analysis
├── rules/
│   ├── unusedVariable.ts     ← Detects unused variables
│   ├── unusedFunction.ts     ← Detects unused functions
│   ├── missingReturn.ts      ← Detects missing return paths
│   ├── infiniteLoop.ts       ← Detects infinite loops
│   ├── assignmentInCondition.ts ← Detects = in conditions
│   ├── unreachableCode.ts    ← Detects code after return/break
│   ├── logicalError.ts       ← Detects div/0, self-compare, etc.
│   └── index.ts              ← Exports all rule instances
├── ai/
│   ├── promptBuilder.ts      ← Builds structured Gemini prompts
│   └── geminiExplainer.ts    ← Calls Gemini API with caching
├── ui/
│   ├── webviewContent.ts     ← HTML/CSS/JS for results panel
│   └── resultsPanel.ts       ← VS Code WebView lifecycle
├── types/
│   └── index.ts              ← Shared TypeScript interfaces
└── utils/
    ├── logger.ts              ← VS Code OutputChannel logger
    └── cache.ts               ← In-memory API response cache
```

### Analysis Pipeline

```
File → codeExtractor → parserFactory → [7 rules in parallel]
    → bugClassifier → geminiExplainer → resultsPanel (WebView)
```

---

## 🐛 Bug Types Detected

| # | Bug Type | Severity | Description |
|---|----------|----------|-------------|
| 1 | Unused Variable | ⚠️ Warning | Variable declared but never referenced |
| 2 | Unused Function | ⚠️ Warning | Function defined but never called |
| 3 | Missing Return | 🔴 Error | Function paths without return statements |
| 4 | Infinite Loop | 🔴 Error | `while(true)` with no break/return |
| 5 | Assignment in Condition | 🔴 Error | `=` used instead of `==` in if/while |
| 6 | Unreachable Code | ⚠️ Warning | Statements after return/throw/break |
| 7 | Logical Error | 🔴 Error | Division by zero, self-comparison, etc. |

---

## 🧪 Test Samples

The `test-samples/` directory contains files with intentional bugs:

- **`sample_bugs.py`** — 6 bugs (unused var, unused func, missing return, infinite loop, unreachable, div/0)
- **`sample_bugs.js`** — 4 bugs (assignment in condition, unused var, infinite loop, unreachable)
- **`sample_bugs.java`** — 4 bugs (unused var, missing return, unreachable, self-comparison)

---

## ⚙️ Configuration

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key | Optional* |

*If not set, the extension uses built-in fallback explanations instead of AI-generated ones.

---

## 📜 Scripts

```bash
npm run compile    # Compile TypeScript to JavaScript
npm run watch      # Watch mode for development
npm run package    # Package as .vsix file
```

---

## 🛠️ Tech Stack

- **TypeScript** (strict mode) — Primary language
- **VS Code Extension API** — Platform integration
- **@babel/parser** — JavaScript/TypeScript AST parsing
- **Google Gemini 1.5 Flash** — AI explanations
- **dotenv** — Environment variable management

---

## 📄 License

This project is developed as a B.Tech Final Year Project.

---

## 👨‍💻 Author

**Piyush Maurya**
B.Tech Computer Science
