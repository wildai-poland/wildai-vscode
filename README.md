<div align="center">

<img src="./assets/icon.png" width="128" height="128" alt="WildAI VS Code Extension" />

# WildAI for Visual Studio Code

**Official Visual Studio Code extension for the WildAI developer ecosystem.**  
*Real-time streaming assistant, intelligent refactoring, automated test generation, and seamless editor workflows.*

[![Version](https://img.shields.io/badge/VS%20Code-%3E%3D1.85.0-blue?style=flat-square&logo=visualstudiocode)](https://marketplace.visualstudio.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Organization](https://img.shields.io/badge/GitHub-wildai--poland-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/wildai-poland)

</div>

---

## ⚡ Overview

**WildAI for VS Code** integrates the high-throughput WildAI LLM runtime directly into your IDE. Engineered for developer ergonomics, it provides a persistent sidebar chat with real-time token streaming, right-click context menu code analysis, and one-click code insertion into your active editor.

---

## ✨ Features

* **💬 Sidebar Streaming Chat**: Persistent assistant panel in the VS Code Activity Bar with low-latency Server-Sent Events (SSE) streaming.
* **⚡ One-Click Code Insertion**: Generated code snippets include direct **"Copy"** and **"Insert into Editor"** actions that instantly apply updates to your selection or cursor position.
* **🖱️ Context Menu Integration**: Highlight any code block, right-click, and select:
  * **Explain Selected Code**: Deep-dive logic breakdown, complexity analysis, and edge cases.
  * **Refactor Selected Code**: Modernize syntax, improve performance, and enforce idiomatic patterns.
  * **Generate Unit Tests**: Produce comprehensive test suites covering edge cases and regressions.
  * **Fix Potential Bugs**: Static vulnerability and bug detection with suggested fixes.
* **🔒 Secure Secret Storage**: Tokens are stored using VS Code's encrypted native `SecretStorage` keychain.
* **🌐 Enterprise & Local Endpoints**: Fully configurable API endpoint (`wildai.apiUrl`) and model selection.

---

## 🚀 Installation & Setup

### 1. Build and Package from Source

Clone and install dependencies:

```bash
git clone https://github.com/wildai-poland/wildai-vscode.git
cd wildai-vscode
npm install
npm run build
```

To run in development mode, open the repository in VS Code and press **F5** to launch the Extension Development Host.

### 2. Configure Your API Token

1. Press `Cmd + Shift + P` (macOS) or `Ctrl + Shift + P` (Linux/Windows).
2. Type `WildAI: Set API Token / Key` and press Enter.
3. Paste your WildAI authorization token from [chat.wildai.pl](https://chat.wildai.pl).

---

## ⚙️ Configuration Settings

Customize behavior via `Settings -> Extensions -> WildAI`:

| Setting | Default | Description |
| :--- | :--- | :--- |
| `wildai.apiUrl` | `https://chat.wildai.pl/api/chat` | API backend URL for inference and completions. |
| `wildai.model` | `deepseek-v4.1-flash-uncensored` | Default model identifier for chat completions. |
| `wildai.temperature` | `0.7` | Sampling temperature (`0.0` - `2.0`). |
| `wildai.streamResponse` | `true` | Enable real-time token streaming. |

---

## ⌨️ Command Palette

| Command | Action |
| :--- | :--- |
| `WildAI: Open Chat Sidebar` | Opens and focuses the WildAI Chat assistant. |
| `WildAI: Explain Selected Code` | Explains highlighted code in the active editor. |
| `WildAI: Refactor Selected Code` | Suggests refactored improvements for selected code. |
| `WildAI: Generate Unit Tests` | Writes unit tests for the selected function or class. |
| `WildAI: Fix Potential Bugs` | Detects bugs and proposes fixes. |
| `WildAI: Set API Token / Key` | Securely configures API authentication token. |
| `WildAI: Clear Conversation` | Clears current chat conversation history. |

---

## 🛡️ Security & Privacy

* WildAI communicates strictly with configured endpoints (`wildai.apiUrl`).
* API tokens are stored in the platform's native encrypted keychain via the VS Code Secrets API.
* For security disclosures, please refer to our [Security Policy](https://github.com/wildai-poland/.github/blob/main/SECURITY.md) or contact `security@wildai.pl`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
