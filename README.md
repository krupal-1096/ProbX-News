<div align="center">
  <img src="assets/imgs/logo_only.png" alt="ProbX News Logo" width="360" />
</div>

![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)

# ProbX News

ProbX News is an AI-powered fact-checking experience for web and mobile that lets users drop a news link or image and instantly get a credibility verdict, sourced evidence, and a clear audit trail of how the agent reasoned. The interface keeps users in the loop with a live progress indicator and a ticker-styled info rail, then surfaces a bold Real/Fake result with curated sources.

## How It Works
- Input: Users submit a URL/text snippet or upload an image.
- Agent: Gemini 1.5 (or OpenRouter Llama) runs claim verification. OCR prefers Gemini; if unavailable, it falls back to a local `@xenova/transformers` OCR (TroCR). Cross-checking uses GDELT + Google News RSS; social lookups (X, Reddit) are appended for context.
- Evidence: The engine returns a verdict (Real/Fake/Inconclusive/Satire), confidence score with color band, emotion intent, harm/safety flags, ethics rating, markdown report, agent log rows, and the sources used. Irrelevant sources are filtered against claim keywords; absurd/no-evidence claims are forced to low-confidence inconclusive.
- UI: Boot animation → home screen with model/mode picker → processing state with ETA → result view with verdict, sources, emotions, safety, ethics, and reset.

## Web Quickstart
Prerequisites: Node.js 18+.

1) Install deps  
`npm install`

2) Run locally  
`npm run dev`  
Open the printed Vite URL (default http://localhost:5173).

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
- Run on device/emulator via Android Studio ▶, or CLI:  
  - `cd android && ./gradlew assembleDebug`  
  - `adb install -r app/build/outputs/apk/debug/app-debug.apk`

Boot flow:
- On first launch, the app briefly checks Hugging Face Inference connectivity (no model downloads).
- If HF is warming up or rate-limited, the boot screen may show a short wait or allow retry.

Troubleshooting Android builds:
- Web code changes require a fresh build + copy before running in Android Studio:
  1) `npm run build`
  2) `npx cap copy android` (or `npx cap sync android`)
  3) Rebuild/run in Android Studio or via Gradle.
- If you still see an old UI, uninstall or clear app data to drop cached assets, then reinstall after the steps above.

Assets:
- Boot animation: CSS-driven animated splash (no bundled video assets)
- App icons: `assets/icons/android/*` (mirrored into `android/app/src/main/res/mipmap-*`)
- App mark: `assets/imgs/logo_only.png`

Notes:
- Re-run `npm run build` + `npx cap sync android` after web code changes.
- “Live Now” ticker shows fact-check tips only (no ads). Model/mode pickers are behind the Settings toggle on the home screen. Default model: Gemini; fallback: OpenRouter Llama.
- The UI now has light/dark themes, immersive loader visuals, randomized helpful tips/placeholders, and Android notifications (completion, slow-job reminder, offline alert).

## Tech Stack
- React + Vite + TypeScript
- Gemini 1.5 + OpenRouter (Llama), local OCR fallback (`@xenova/transformers`)
- GDELT + Google News RSS + `r.jina.ai` text mirror + social lookups
- Tailwind-style utility classes for styling

## Attribution & License
Content and code are provided under CC BY-NC-ND 4.0. Please credit **HawkFranklin Research** when using or sharing this work. See `LICENSE` for full terms.
