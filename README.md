<div align="center">
  <img src="assets/imgs/logo_only.png" alt="ProbX News Logo" width="360" />
</div>

![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)

# ProbX News

ProbX News is an AI-powered fact-checking experience for web and mobile that lets users drop a news link or image and instantly get a credibility verdict, sourced evidence, and a clear audit trail of how the agent reasoned. The interface keeps users in the loop with a live progress indicator and a ticker-styled ad rail, then surfaces a bold Real/Fake result with curated sources.

## How It Works
- Input: Users submit a URL/text snippet or upload an image.
- Agent: Free, no-signup AI models (Transformers.js) run in the browser to score credibility—zero API keys required. Users can pick a model (open BART/CLIP, Grok-lite, Gemini-lite) and a mode (Fast/Analyze/Analytic). Text is zero-shot classified; images use CLIP-style similarity. Each query is cross-checked via Google/Bing HTML mirrors (r.jina.ai) to surface corroborating sources.
- Evidence: The engine returns a verdict (Real/Fake/Inconclusive/Satire), confidence score with color band, emotion intent, harm/safety flags, ethics rating, markdown report, agent log rows, and the sources used.
- UI: Boot animation → home screen with model/mode picker → processing state with ETA → result view with verdict, sources, emotions, safety, ethics, and reset.

## Quickstart
Prerequisites: Node.js 18+.

1) Install deps  
`npm install`

2) Run locally  
`npm run dev`  
Open the printed Vite URL (default http://localhost:5173).

## Environment
No API keys or sign-ins are required. Models are fetched on demand from public hubs and run directly in the browser. For cross-checking, the app performs a lightweight web lookup through r.jina.ai (Google/Bing mirrors); if the mirror is blocked, the app still returns the model-based verdict.

## Deploy
- Build for production: `npm run build` (outputs to `dist/`).  
- Serve `dist/` on your hosting platform or containerize for Cloud Run.  

## Tech Stack
- React + Vite + TypeScript
- Transformers.js (browser) + CLIP/BART models (community Grok-lite/Gemini-lite presets)
- Tailwind-style utility classes for styling

## Attribution & License
Content and code are provided under CC BY-NC-ND 4.0. Please credit **HawkFranklin Research** when using or sharing this work. See `LICENSE` for full terms.
