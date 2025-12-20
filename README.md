<div align="center">
  <img src="assets/imgs/logo_only.png" alt="ProbX News Logo" width="360" />
</div>

![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)

# ProbX News

ProbX News is an AI-powered fact-checking experience for web and mobile that lets users drop a news link or image and instantly get a credibility verdict, sourced evidence, and a clear audit trail of how the agent reasoned. The interface keeps users in the loop with a live progress indicator and a ticker-styled info rail, then surfaces a bold Real/Fake result with curated sources.

## How It Works
- Input: Users submit a URL/text snippet or upload an image.
- Agent: Free, no-signup AI models (Transformers.js) run in the browser to score credibility—zero API keys required. Users can pick a model (open BART/CLIP, Grok-lite, Gemini-lite) and a mode (Fast/Analyze/Analytic). Text is zero-shot classified; images use CLIP-style similarity. Each query is cross-checked via Google/Bing HTML mirrors (r.jina.ai) to surface corroborating sources.
- Evidence: The engine returns a verdict (Real/Fake/Inconclusive/Satire), confidence score with color band, emotion intent, harm/safety flags, ethics rating, markdown report, agent log rows, and the sources used.
- UI: Boot animation → home screen with model/mode picker → processing state with ETA → result view with verdict, sources, emotions, safety, ethics, and reset.

## Web Quickstart
Prerequisites: Node.js 18+.

1) Install deps  
`npm install`

2) Run locally  
`npm run dev`  
Open the printed Vite URL (default http://localhost:5173).

## Environment
No API keys or sign-ins are required. Models are fetched on demand from public hubs and run directly in the browser. For cross-checking, the app performs a lightweight web lookup through r.jina.ai (Google/Bing mirrors); if the mirror is blocked, the app still returns the model-based verdict.

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

Boot download flow:
- On first launch, the app stays on the boot screen and downloads all required text + OCR models before navigating home.
- Progress is per-asset and resumes if the app is interrupted or force-closed.
- No download bar appears on the home/analysis screens—only on boot.

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
- “Live Now” ticker shows fact-check tips only (no ads). Model/mode pickers are behind the Settings toggle on the home screen. Default model: `gemini-lite`.

## Tech Stack
- React + Vite + TypeScript
- Transformers.js (browser) + CLIP/BART models (community Grok-lite/Gemini-lite presets)
- Tailwind-style utility classes for styling

## Attribution & License
Content and code are provided under CC BY-NC-ND 4.0. Please credit **HawkFranklin Research** when using or sharing this work. See `LICENSE` for full terms.
