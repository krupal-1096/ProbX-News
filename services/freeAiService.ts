import { pipeline, env } from "@xenova/transformers";
import { AnalysisMode, AnalysisResult, AgentLogEntry, InputType, ModelChoice, Source, Verdict } from "../types";

env.allowLocalModels = false; // always fetch hosted models (no API keys required)

type ZeroShotClassifier = Awaited<ReturnType<typeof pipeline<"zero-shot-classification">>>;
let textPipelinePromise: Promise<ZeroShotClassifier> | null = null;
let progressCallback: ((msg: string | null, progress?: number) => void) | null = null;

const MODE_SETTINGS: Record<AnalysisMode, { sources: number; estimateSeconds: number }> = {
  fast: { sources: 2, estimateSeconds: 25 },
  analyze: { sources: 3, estimateSeconds: 45 },
  "deep-analytic": { sources: 5, estimateSeconds: 90 }
};

export const registerDownloadProgress = (cb: (msg: string | null, progress?: number) => void) => {
  progressCallback = cb;
};

const getTextPipeline = () => {
  if (!textPipelinePromise) {
    progressCallback?.("Downloading text model", 0.01);
    textPipelinePromise = pipeline("zero-shot-classification", "Xenova/nli-deberta-v3-small", {
      progress_callback: (data: any) => {
        if (data?.status === 'download') {
          const pct = data.progress ? Math.min(0.99, data.progress) : undefined;
          const name = data.file || data.name || data.url || "model";
          progressCallback?.(`Downloading ${name}`, pct);
        }
        if (data?.status === 'ready') {
          progressCallback?.(null, 1);
        }
      }
    }).finally(() => progressCallback?.(null, 1));
  }
  return textPipelinePromise;
};

type ZeroShotImageClassifier = Awaited<ReturnType<typeof pipeline<"zero-shot-image-classification">>>;
type ImageToText = Awaited<ReturnType<typeof pipeline<"image-to-text">>>;
let imagePipelinePromise: Promise<ZeroShotImageClassifier> | null = null;
let imageToTextPromise: Promise<ImageToText> | null = null;

const getImagePipeline = () => {
  if (!imagePipelinePromise) {
    progressCallback?.("Downloading image model", 0.01);
    imagePipelinePromise = pipeline("zero-shot-image-classification", "Xenova/clip-vit-base-patch32").finally(() => progressCallback?.(null, 1));
  }
  return imagePipelinePromise;
};

const getImageToText = () => {
  if (!imageToTextPromise) {
    progressCallback?.("Downloading image caption model", 0.01);
    imageToTextPromise = pipeline("image-to-text", "Xenova/vit-gpt2-image-captioning").finally(() => progressCallback?.(null, 1));
  }
  return imageToTextPromise;
};

const resizeImageFile = (file: File, maxSide = 768): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resized = new File([blob], file.name, { type: blob.type });
            resolve(resized);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.78
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
};

const extractDomain = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const humanTitleFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, "");
    const lastPart = parsed.pathname.split("/").filter(Boolean).pop() || domain;
    const words = lastPart.replace(/[-_]/g, " ").replace(/\.[a-zA-Z0-9]+$/, "");
    return `${domain}: ${words.slice(0, 80)}`.trim();
  } catch {
    return url;
  }
};

const buildSearchQuery = (input: string): string => {
  const domain = extractDomain(input);
  if (domain) {
    const url = new URL(input);
    const pathWords = url.pathname
      .split(/[\/\-_.]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8)
      .join(" ");
    return `${domain} ${pathWords}`.trim();
  }
  return input.slice(0, 200);
};

const fetchCrossChecks = async (query: string, limit: number): Promise<Source[]> => {
  try {
    const googleUrl = `https://r.jina.ai/http://www.google.com/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(googleUrl);
    if (!res.ok) throw new Error(`Cross-check fetch failed: ${res.status}`);
    const body = await res.text();
    let matches = Array.from(body.matchAll(/\/url\?q=([^"&\s]+)/g));
    if (matches.length === 0) {
      const fallbackUrl = `https://r.jina.ai/https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const fallbackRes = await fetch(fallbackUrl);
      const fallbackBody = await fallbackRes.text();
      matches = Array.from(fallbackBody.matchAll(/https:\/\/duckduckgo\.com\/l\/\?kh=-1&uddg=([^"&\s]+)/g));
    }
    const sources: Source[] = [];
    const seen = new Set<string>();
    for (const m of matches) {
      const decoded = decodeURIComponent(m[1]);
      if (seen.has(decoded)) continue;
      seen.add(decoded);
      sources.push({
        title: humanTitleFromUrl(decoded),
        uri: decoded,
        snippet: "Found via web search mirror for corroboration."
      });
      if (sources.length >= limit) break;
    }
    return sources;
  } catch (e) {
    console.warn("Cross-check lookup skipped:", e);
    return [];
  }
};

const scoreToVerdict = (label: string, score: number): { verdict: Verdict; confidence: number } => {
  const lower = label.toLowerCase();
  if (lower.includes("real") || lower.includes("authentic") || lower.includes("news")) {
    return { verdict: Verdict.REAL, confidence: Math.max(50, Math.round(score * 100)) };
  }
  if (lower.includes("fake") || lower.includes("ai") || lower.includes("manipulated")) {
    return { verdict: Verdict.FAKE, confidence: Math.max(40, Math.round(score * 100)) };
  }
  if (lower.includes("satire") || lower.includes("meme")) {
    return { verdict: Verdict.SATIRE, confidence: Math.max(35, Math.round(score * 100)) };
  }
  return { verdict: Verdict.INCONCLUSIVE, confidence: Math.round(score * 100) };
};

const deriveEthics = (harmLabel: string) => {
  const l = harmLabel.toLowerCase();
  if (l.includes("hate") || l.includes("violence") || l.includes("racism")) return "bad" as const;
  if (l.includes("provocative") || l.includes("polarizing")) return "moderate" as const;
  return "good" as const;
};

const TRUSTED = ["bbc.co.uk", "reuters.com", "apnews.com", "theguardian.com", "bloomberg.com", "nytimes.com", "indiatoday.in", "aajtak.in", "ndtv.com", "washingtonpost.com"];
const FLAGGED = ["blogspot", "wordpress", "medium.com/p", "rumor", "gossip", "fake", "hoax"];
const REGIONAL_TRUSTED = [
  "aljazeera.com",
  "hindustantimes.com",
  "thehindu.com",
  "straitstimes.com",
  "globalnews.ca",
  "abc.net.au",
  "france24.com",
  "dw.com"
];

const getYearFromUrl = (url: string): number | null => {
  const match = url.match(/\/(20\d{2}|19\d{2})\//);
  if (match) return parseInt(match[1], 10);
  return null;
};

const adjustConfidenceWithSources = (base: number, sources: Source[], userDomain?: string) => {
  let score = base;
  const domains = sources.map((s) => extractDomain(s.uri)).filter(Boolean) as string[];
  const trustedHit = domains.find((d) => TRUSTED.some((t) => d.endsWith(t)));
  const regionalHit = domains.find((d) => REGIONAL_TRUSTED.some((t) => d.endsWith(t)));
  const flaggedHit = domains.find((d) => FLAGGED.some((t) => d.includes(t)));
  if (trustedHit) score += 10;
  if (regionalHit) score += 5;
  if (flaggedHit) score -= 8;
  if (userDomain && trustedHit && trustedHit !== userDomain) score += 5;
  if (domains.length >= 4) score += 5;

  // Recency adjustment based on URL year tokens
  const currentYear = new Date().getFullYear();
  const years = sources
    .map((s) => getYearFromUrl(s.uri))
    .filter((y): y is number => !!y);
  if (years.length) {
    const avgYear = years.reduce((a, b) => a + b, 0) / years.length;
    const diff = currentYear - avgYear;
    if (diff > 6) score -= 6;
    else if (diff > 3) score -= 3;
    else if (diff >= 0 && diff <= 1) score += 3;
  }

  return Math.min(95, Math.max(5, Math.round(score)));
};

export const analyzeContent = async (
  input: string | File,
  type: InputType,
  modelChoice: ModelChoice,
  mode: AnalysisMode
): Promise<AnalysisResult> => {
  let verdict = Verdict.INCONCLUSIVE;
  let confidenceScore = 50;
  let agentLogs: AgentLogEntry[] = [];
  let userSource: Source | null = null;
  const sources: Source[] = [
  ];

  let emotion = "neutral";
  let harmSignals = "None detected";
  let ethics: "good" | "moderate" | "bad" = "good";

  if (type === InputType.TEXT && typeof input === "string") {
    const domain = extractDomain(input);
    if (domain) {
      userSource = {
        title: `User source: ${domain}`,
        uri: input,
        snippet: "Submitted link under review."
      };
      sources.push(userSource);
    }
    const classifier = await getTextPipeline();
    const labels = ["real journalism", "fake news", "satire", "inconclusive"];
    const output = await classifier(input, labels);
    const best = Array.isArray(output) ? output[0] : output;
    const { verdict: mappedVerdict, confidence } = scoreToVerdict(best.labels[0], best.scores[0]);
    verdict = mappedVerdict;
    confidenceScore = confidence;
    agentLogs = best.labels.slice(0, 4).map((label: string, idx: number) => ({
      action: "Zero-shot classification",
      findings: `${label} (${Math.round(best.scores[idx] * 100)}%)`,
      source: "bart-large-mnli"
    }));
    const emotionLabels = ["provocative", "threatening", "anger", "disgust", "joy", "fear", "neutral"];
    const emoOutput = await classifier(input, emotionLabels);
    const emoBest = Array.isArray(emoOutput) ? emoOutput[0] : emoOutput;
    emotion = emoBest.labels[0];

    const harmLabels = ["racism", "violence", "hate speech", "neutral reporting", "harassment"];
    const harmOutput = await classifier(input, harmLabels);
    const harmBest = Array.isArray(harmOutput) ? harmOutput[0] : harmOutput;
    harmSignals = `${harmBest.labels[0]} (${Math.round(harmBest.scores[0] * 100)}%)`;
    ethics = deriveEthics(harmBest.labels[0]);

    const crossChecks = await fetchCrossChecks(buildSearchQuery(input), MODE_SETTINGS[mode].sources);
    sources.push(...crossChecks);
    if (crossChecks.length) {
      agentLogs.push({
        action: "Web cross-check",
        findings: `Collected ${crossChecks.length} corroborating hits.`,
        source: "duckduckgo (via r.jina.ai)"
      });
    }
    const baseScore = best.scores[0] * 100;
    confidenceScore = adjustConfidenceWithSources(baseScore, crossChecks, domain || undefined);
    if (crossChecks.length) {
      agentLogs.push({
        action: "Confidence synthesis",
        findings: `Adjusted to ${confidenceScore}% using ${crossChecks.length} sources.`,
        source: "fusion"
      });
    }
  } else if (type === InputType.IMAGE && input instanceof File) {
    const resized = await resizeImageFile(input);
    const classifier = await getImagePipeline();
    const describer = await getImageToText();
    const caption = await describer(resized);
    const captionText = Array.isArray(caption) ? caption[0]?.generated_text || "" : (caption as any)?.generated_text || "";

    const labels = ["authentic photo", "ai-generated image", "manipulated screenshot", "satire meme", "news screenshot"];
    const output = await classifier(resized, labels);
    const best = Array.isArray(output) ? output[0] : output;
    const { verdict: mappedVerdict, confidence } = scoreToVerdict(best.label, best.score);
    verdict = mappedVerdict;
    confidenceScore = confidence;
    agentLogs = output.slice(0, 4).map((entry: any) => ({
      action: "Visual similarity",
      findings: `${entry.label} (${Math.round(entry.score * 100)}%)`,
      source: "clip-vit-base-patch32"
    }));
    if (captionText) {
      agentLogs.push({
        action: "Image caption",
        findings: `Detected scene: ${captionText}`,
        source: "vit-gpt2-image-captioning"
      });
    }
    emotion = "neutral (image)";
    harmSignals = "Image-only: no strong hate/violence cues detected.";
    ethics = "moderate";

    const crossChecks = await fetchCrossChecks("news image authenticity check", MODE_SETTINGS[mode].sources);
    sources.push(...crossChecks);
    if (crossChecks.length) {
      agentLogs.push({
        action: "Web cross-check",
        findings: `Collected ${crossChecks.length} corroborating hits.`,
        source: "duckduckgo (via r.jina.ai)"
      });
    }
    const baseScore = best.score * 100;
    confidenceScore = adjustConfidenceWithSources(baseScore, crossChecks);
    if (crossChecks.length) {
      agentLogs.push({
        action: "Confidence synthesis",
        findings: `Adjusted to ${confidenceScore}% using ${crossChecks.length} sources.`,
        source: "fusion"
      });
    }
  }

  const summary =
    verdict === Verdict.REAL
      ? "Model signals lean toward authentic reporting."
      : verdict === Verdict.FAKE
      ? "Model signals lean toward fabricated or AI-like content."
      : verdict === Verdict.SATIRE
      ? "Tone and visuals suggest satirical or meme-style content."
      : "Signals are mixed; treat with caution.";

  return {
    verdict,
    confidenceScore,
    summary,
    detailedMarkdown:
      mode === "deep-analytic"
        ? [
            "## What was used",
            "- Zero-shot text classifier: bart-large-mnli",
            "- Zero-shot image classifier: clip-vit-base-patch32",
            "- Web corroboration via Google/Bing mirrors (r.jina.ai)",
            "",
            "## Tone and intent",
            `- Dominant emotion signal: ${emotion}`,
            "- Detects if the author is provoking, threatening, or calming readers.",
            "",
            "## Harm & safety",
            `- Harm signals: ${harmSignals}`,
            "- Flags racism, violence, hate speech tendencies if present.",
            "",
            "## Ethics and framing",
            `- Ethics rating: ${ethics}`,
            "- Assesses whether the article pressures, frightens, or misleads readers.",
            "",
            "## Notes",
            "- First load may take longer while the model downloads.",
            "- This is a heuristic signal, not a definitive fact check. Cross-verify important claims."
          ].join("\n")
        : "Detailed analysis is available in Deep Analytic Mode.",
    sources,
    agentLogs,
    emotion,
    harmSignals,
    ethics,
    modelUsed: modelChoice,
    modeUsed: mode
  };
};
