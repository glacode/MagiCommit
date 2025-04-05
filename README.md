<div align="center">
  <img src="resources/mage-hat.png" width="128" alt="MagiCommit Logo">
  <h1>MagiCommit</h1>
  <p>🧙 AI-Powered Commit Messages </p>
</div>

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/glacode.magicommit?label=Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=glacode.magicommit)
[![License](https://img.shields.io/github/license/glacode/MagiCommit)](LICENSE)

Generate meaningful Git commit messages using Google's Gemini AI directly in VSCode.

## ✨ Features
- Automatically analyzes `git diff --cached`
- Considers last commits for context
- One-click insertion into commit box
- Configurable AI temperature

## 🚀 Quick Start
1. Install extension
2. Get [Gemini API key](https://ai.google.dev/)
3. Set in VSCode settings:
```json
"magicommit.geminiApiKey": "your-key-here"
```
4. Click the magic wand icon in the SCM view:
   - <img src="resources/light/wand.svg" width="16" alt="MagiCommit Logo"> (Light Theme)
   - <img src="resources/dark/wand.svg" width="16" alt="MagiCommit Logo"> (Dark Theme)

## 🛠 Development
```bash
git clone https://github.com/glacode/MagiCommit.git
cd MagiCommit
npm install
npm run watch
```
F5 to debug

## 📜 License
MIT © [Glacode](https://github.com/glacode)