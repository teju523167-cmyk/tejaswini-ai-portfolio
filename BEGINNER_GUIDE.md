# Beginner Setup Guide

## 1. Open Command Prompt

In PowerShell, type:

```cmd
cmd
```

This avoids the Windows `npm.ps1` execution-policy error.

## 2. Go to the project folder

```cmd
cd C:\Users\teju5\Downloads\tejaswini-ai-portfolio-final
```

Use the actual folder name if you extracted the ZIP elsewhere.

## 3. Install dependencies

Run once:

```cmd
npm install
npm run install:all
```

## 4. Start the portfolio

```cmd
npm run dev
```

Then open Chrome or Edge:

```text
http://localhost:5173/
```

Do not use the VS Code built-in browser if its console shows Electron Content Security Policy warnings. Chrome/Edge gives the cleanest testing environment.

## 5. Update your details

Edit:

`server/data/profile.json`

Replace the GitHub, LinkedIn and email placeholders and add your Web Forge AI repository URL.

## 6. Replace the resume

Put your final PDF at:

`client/public/resume.pdf`

Keep the filename exactly `resume.pdf`.

## 7. Stop the server

In the CMD window:

```text
Ctrl + C
```
