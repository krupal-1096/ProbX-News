<div align="center">
  <img src="assets/imgs/logo_only.png" alt="ProbX News Logo" width="360" />
</div>

![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)

# ProbX News

ProbX News is an AI-powered fact-checking experience for web and mobile that lets users drop a news link or image and instantly get a credibility verdict, sourced evidence, and a clear audit trail of how the agent reasoned. The interface keeps users in the loop with a live progress indicator and a ticker-styled ad rail, then surfaces a bold Real/Fake result with curated sources.

## How It Works
- Input: Users submit a URL/text snippet or upload an image.
- Agent: Backend calls Google Gemini (`gemini-3-pro-preview`) with grounding and schema guidance to extract claims, search the web, and log findings.
- Evidence: The model returns a verdict (Real/Fake/Inconclusive/Satire), confidence score, markdown report, agent log rows (the “mental spreadsheet”), and grounded sources.
- UI: A processing state shows live tasks; the result view displays the verdict, key reasoning, and scrollable sources, with a reset for new checks.

## Quickstart
Prerequisites: Node.js 18+ and a Google AI Studio API key.

1) Install deps  
`npm install`

2) Provide your Gemini API key (picked up from `API_KEY`):  
`API_KEY=your_key_here npm run dev`

3) Run locally  
`npm run dev`  
Open the printed Vite URL (default http://localhost:5173).

## Environment
- `API_KEY`: Google AI Studio key with access to `gemini-3-pro-preview`.
- No other services are required; browsing/grounding is handled via the Gemini tool call.

## Deploy
- Build for production: `npm run build` (outputs to `dist/`).  
- Serve `dist/` on your hosting platform or containerize for Cloud Run.  
- Be sure to set `API_KEY` in your deployment environment secrets.

## Tech Stack
- React + Vite + TypeScript
- Google Generative AI SDK (`@google/genai`) calling `gemini-3-pro-preview`
- Tailwind-style utility classes for styling

## Attribution & License
Content and code are provided under CC BY-NC-ND 4.0. Please credit **HawkFranklin Research** when using or sharing this work. See `LICENSE` for full terms.
