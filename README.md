<div align="center">
  <img src="assets/imgs/assets/imgs/probx_logo_normal.png" alt="ProbX News Logo" width="360" />
</div>

![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)

# ProbX News

ProbX News is an AI-powered fact-checking experience for web and mobile that lets users drop a news link or image and instantly get a credibility verdict, sourced evidence, and a clear audit trail of how the agent reasoned. The interface keeps users in the loop with a live progress indicator and a ticker-styled info rail, then surfaces a bold Real/Fake result with curated sources.

## How It Works
- Input: Users submit a URL/text snippet or upload an image.
- Agent: Gemini 1.5 (or OpenRouter Llama) runs claim verification. OCR prefers Gemini; if unavailable, it falls back to a local `@xenova/transformers` OCR (TroCR). Cross-checking uses GDELT + Google News RSS; social lookups (X, Reddit) are appended for context.
- Evidence: The engine returns a verdict (Real/Fake/Inconclusive/Satire), confidence score with color band, emotion intent, harm/safety flags, ethics rating, markdown report, agent log rows, and the sources used. Irrelevant sources are filtered against claim keywords; absurd/no-evidence claims are forced to low-confidence inconclusive.

## Web Quickstart
Prerequisites: Node.js 18+.

1) Install deps  
`npm install`

2) Run locally  
`npm run dev`  

## Environment
- Required (pick at least one):  
  - `VITE_GEMINI_API_KEY` (preferred for text + OCR)  
  - `VITE_OPENAI_API_KEY` (OpenRouter free-tier key for Llama fallback)  
- Optional: `GEMINI_API_KEY` or `OPENROUTER_API_KEY` aliases.  
- Cross-checking uses public GDELT + Google News RSS + `r.jina.ai` mirrors; social lookups do not require keys.

## Web Deploy
- Build for production: `npm run build` (outputs to `dist/`).  
- Serve `dist/` on your hosting platform or containerize for Cloud Run.  

## Android
- Prereqs: Android Studio + SDK/Platform Tools, USB debugging enabled on device/emulator.
- Build web bundle: `npm run build`
- Sync to native: `npx cap sync android`
- Open native project: `npx cap open android` (runs Android Studio)

## Tech Stack
- React + Vite + TypeScript + Capacitor(native android runtime)
- Gemini 1.5 + OpenRouter (Llama), local OCR fallback (`@xenova/transformers`)
- others free model can be used from OpenRouter (check list of free models)
- GDELT + Google News RSS + `r.jina.ai` text mirror + social lookups
- Tailwind-style utility classes for styling

## Attribution & License
Content and code are provided under CC BY-NC-ND 4.0. Please credit **HawkFranklin Research** when using or sharing this work. See `LICENSE` for full terms.
