# Tejaswini Bandla —  Portfolio

A portfolio built with React + Vite on the frontend and Node.js + Express on the backend. It includes a profile-driven chatbot with local hybrid retrieval (keyword matching + TF-IDF-style similarity scoring) and optional AI generation when configured.

## Sections
- About
- Academic Profile
- Resume
- Clubs & Extra
- Certifications
- Coding Profiles
- Hackathons & Contests
- Contact
- TejuBot

## Before submission
Open `server/data/profile.json` and replace:
- `REPLACE_WITH_YOUR_GITHUB_USERNAME`
- `REPLACE_WITH_YOUR_LINKEDIN_USERNAME`
- `REPLACE_WITH_YOUR_EMAIL@gmail.com`
- `REPLACE_WITH_WEB_FORGE_AI_REPO`

Replace `client/public/resume.pdf` with your final one-page resume PDF, keeping the filename exactly `resume.pdf`.

## Run on Windows
If PowerShell blocks `npm.ps1`, use Command Prompt:

```text
cmd
```

Then, from this project folder:

```cmd
npm install
npm run install:all
npm run dev
```

Open:

`http://localhost:5173/`

Backend health check:

`http://localhost:5000/api/health`

## Chatbot
The chatbot works without an API key. It retrieves relevant profile sections locally using keyword scoring and similarity scoring. If an OpenAI API key/model is configured on the server, the retrieved context can also be passed to the configured model for a more conversational answer.

