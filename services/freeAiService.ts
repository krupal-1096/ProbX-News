import { AnalysisMode, AnalysisResult, AgentLogEntry, InputType, ModelChoice, Source, Verdict } from "../types";

type ProgressExtra = { phase?: "model" | "ocr" };
let progressCallback: ((msg: string | null, progress?: number, receivedBytes?: number, totalBytes?: number, extra?: ProgressExtra) => void) | null = null;

const env = import.meta.env as Record<string, string | undefined>;
const GEMINI_KEY = (env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || "").trim();
const OPENROUTER_KEY = (env.VITE_OPENAI_API_KEY || env.OPENROUTER_API_KEY || "").trim();
const GEMINI_MODEL: ModelChoice = "gemini-1.5-flash";
const OPENROUTER_MODEL: ModelChoice = "openrouter-llama";
const DEBUG = !!import.meta.env.DEV;
let ocrPipeline: Promise<any> | null = null;

const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.debug("[probx-debug]", ...args);
  }
};
const MODEL_CONFIG: Record<ModelChoice, { provider: "gemini" | "openrouter"; modelId: string }> = {
  "gemini-1.5-flash": { provider: "gemini", modelId: "google/gemini-1.5-flash" },
  "openrouter-llama": { provider: "openrouter", modelId: "meta-llama/llama-3.2-3b-instruct:free" }
};
const MODE_SETTINGS: Record<AnalysisMode, { sources: number; estimateSeconds: number }> = {
  fast: { sources: 2, estimateSeconds: 20 },
  analyze: { sources: 4, estimateSeconds: 40 },
  "deep-analytic": { sources: 6, estimateSeconds: 75 }
};

const ensureKey = () => {
  if (!GEMINI_KEY && !OPENROUTER_KEY) {
    throw new Error("Missing Gemini or OpenRouter API key.");
  }
};

export const registerDownloadProgress = (cb: typeof progressCallback) => {
  progressCallback = cb;
};

export const warmupModels = async () => {
  // No heavy downloads; just mark ready
  progressCallback?.("Ready to analyze", 0.9);
  progressCallback?.(null, 1, 1, 1, { phase: "model" });
};

type GeminiPart = { text: string } | { inlineData: { data: string; mimeType: string } };

const callGemini = async (parts: GeminiPart[], maxTokens = 256) => {
  if (!GEMINI_KEY) throw new Error("Missing Gemini API key.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
  debugLog("Gemini request", { url, parts: parts.length, maxTokens });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: parts.map((p) => ("text" in p ? { text: p.text } : { inline_data: { data: p.inlineData.data, mime_type: p.inlineData.mimeType } }))
        }
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: maxTokens
      }
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    debugLog("Gemini response error", res.status, txt);
    throw new Error(`Gemini error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  debugLog("Gemini response", data);
  const part = data?.candidates?.[0]?.content?.parts?.[0];
  const generated = part?.text || part?.generated_text || (typeof data === "string" ? data : null);
  if (!generated) throw new Error("Gemini returned an empty response.");
  return generated as string;
};

const callOpenRouter = async (prompt: string, modelId: string, maxTokens = 256) => {
  if (!OPENROUTER_KEY) throw new Error("Missing OpenRouter API key.");
  debugLog("OpenRouter request", { modelId, promptPreview: prompt.slice(0, 120), maxTokens });
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "HTTP-Referer": "https://probx.news",
      "X-Title": "ProbX News"
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3
    })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    debugLog("OpenRouter response error", res.status, txt);
    throw new Error(`OpenRouter error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  debugLog("OpenRouter response", data);
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned an empty response.");
  return text as string;
};

const extractDomain = (value: string): string | null => {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
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
  return input.slice(0, 220);
};

const fetchGdeltArticles = async (query: string, limit: number): Promise<Source[]> => {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&maxrecords=${limit}&format=json&sort=HybridRel:Recent:100`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GDELT ${res.status}`);
    const data = await res.json();
    const articles = Array.isArray(data?.articles) ? data.articles : [];
    return articles
      .map((a: any) => ({
        title: a.title || a.url || "GDELT source",
        uri: a.url,
        snippet: a.excerpt || a.title || a.url
      }))
      .filter((a: Source) => a.uri)
      .slice(0, limit);
  } catch (e) {
    console.warn("GDELT fetch failed", e);
    return [];
  }
};

const fetchGoogleNewsRss = async (query: string, limit: number): Promise<Source[]> => {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(rssUrl);
    if (!res.ok) throw new Error(`RSS ${res.status}`);
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const items = Array.from(doc.querySelectorAll("item")).slice(0, limit);
    return items
      .map((item) => ({
        title: item.querySelector("title")?.textContent || "Google News",
        uri: item.querySelector("link")?.textContent || "",
        snippet: item.querySelector("description")?.textContent || "Found via Google News RSS"
      }))
      .filter((s) => s.uri);
  } catch (e) {
    console.warn("Google News RSS failed", e);
    return [];
  }
};

const fetchCombinedSources = async (query: string, limit: number): Promise<Source[]> => {
  const gdelt = await fetchGdeltArticles(query, limit);
  if (gdelt.length >= limit) return gdelt.slice(0, limit);
  const rss = await fetchGoogleNewsRss(query, limit - gdelt.length);
  const merged = [...gdelt, ...rss];
  const seen = new Set<string>();
  const deduped: Source[] = [];
  for (const src of merged) {
    const key = src.uri.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(src);
    if (deduped.length >= limit) break;
  }
  const socials = buildSocialSearches(query);
  return [...deduped, ...socials];
};

const fetchArticleText = async (url: string): Promise<string> => {
  try {
    const safeUrl = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(`https://r.jina.ai/${safeUrl}`, { method: "GET" });
    if (!res.ok) return "";
    const body = await res.text();
    return body.slice(0, 4000);
  } catch {
    return "";
  }
};

const buildSocialSearches = (query: string): Source[] => {
  const encoded = encodeURIComponent(query);
  return [
    {
      title: "Social search: X/Twitter",
      uri: `https://x.com/search?q=${encoded}&f=live`,
      snippet: "Open live discussions on X."
    },
    {
      title: "Social search: Reddit",
      uri: `https://www.reddit.com/search/?q=${encoded}&t=week`,
      snippet: "Community threads on Reddit."
    }
  ];
};

const detectSatireOrJoke = (text: string): boolean => {
  const t = text.toLowerCase();
  const cues = [
    "joke",
    "just kidding",
    "lol",
    "😂",
    "🤣",
    "satire",
    "parody",
    "world is flat",
    "flat earth",
    "trust me bro"
  ];
  return cues.some((c) => t.includes(c));
};

const detectHarmfulContent = (text: string) => {
  const t = text.toLowerCase();
  const hostileWords = [
    "kill",
    "destroy",
    "eliminate",
    "hate",
    "exterminate",
    "genocide",
    "terror",
    "bomb",
    "violence"
  ];
  const groupMarkers = [
    "religion",
    "race",
    "ethnic",
    "gender",
    "women",
    "men",
    "lgbt",
    "gay",
    "trans",
    "country",
    "people",
    "community",
    "refugee",
    "migrant",
    "immigrant"
  ];
  const flagged = hostileWords.some((w) => t.includes(w)) && groupMarkers.some((w) => t.includes(w));
  if (!flagged) {
    return {
      flagged: false,
      emotion: "neutral",
      harm: "No direct harmful language detected.",
      ethics: "moderate" as AnalysisResult["ethics"],
      reminder: ""
    };
  }
  return {
    flagged: true,
    emotion: "aggressive",
    harm: "Harmful or hateful language detected. This content may target a protected group.",
    ethics: "bad" as AnalysisResult["ethics"],
    reminder: "Please avoid harmful or hateful remarks. Rephrase respectfully and fact-check with care."
  };
};

const clampConfidence = (raw: number, sources: number, satiric: boolean, harmful: boolean) => {
  let score = Math.max(0, Math.min(100, raw));
  if (sources === 0) score = Math.min(score, 40);
  if (satiric) score = Math.min(score, 30);
  if (harmful) score = Math.min(score, 60);
  return Math.max(5, Math.round(score));
};

const looksImprobable = (text: string) => {
  const cues = [
    "cat protest",
    "dog protest",
    "cats are flying",
    "dogs are flying",
    "flying cats",
    "flying dogs",
    "alien",
    "unicorn",
    "magic",
    "flat earth",
    "time travel"
  ];
  const lower = text.toLowerCase();
  return cues.some((c) => lower.includes(c));
};

const STOPWORDS = new Set([
  "the","is","are","a","an","and","or","of","in","on","at","to","for","with","by","from","about","as","that","this","these","those","today","now","yesterday","tomorrow","was","were","be","been","will","would","could","should","can"
]);

const extractKeywords = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w));
};

const filterRelevantSources = (claim: string, sources: Source[]) => {
  const claimKeywords = extractKeywords(claim);
  if (!claimKeywords.length) return [];
  const claimSet = new Set(claimKeywords);
  return sources.filter((src) => {
    const text = `${src.title} ${src.snippet || ""}`.toLowerCase();
    const overlap = Array.from(claimSet).filter((k) => text.includes(k));
    return overlap.length >= 1;
  });
};

const parseVerdict = (val: string): Verdict => {
  const v = val?.toLowerCase() || "";
  if (v.includes("real") || v.includes("support") || v.includes("true")) return Verdict.REAL;
  if (v.includes("fake") || v.includes("false") || v.includes("refute")) return Verdict.FAKE;
  if (v.includes("satire")) return Verdict.SATIRE;
  return Verdict.INCONCLUSIVE;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",").pop() || "";
        resolve(base64);
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getLocalOcr = async () => {
  if (!ocrPipeline) {
    ocrPipeline = import("@xenova/transformers").then(({ pipeline }) =>
      pipeline("image-to-text", "Xenova/trocr-small-printed")
    );
  }
  return ocrPipeline;
};

const runLocalOcr = async (file: File) => {
  try {
    const pipe = await getLocalOcr();
    const result = await pipe(file);
    const best = Array.isArray(result) ? result[0] : result;
    const text = (best?.generated_text || best?.text || "").toString().trim();
    return text.slice(0, 800);
  } catch (err) {
    debugLog("Local OCR failed", err);
    return "";
  }
};

const extractImageText = async (file: File): Promise<{ text: string; source: string }> => {
  if (GEMINI_KEY) {
    try {
      const base64 = await fileToBase64(file);
      const prompt = "Read any text visible in this image, then return just the text you see.";
      const response = await callGemini(
        [
          { text: prompt },
          { inlineData: { data: base64, mimeType: file.type || "image/jpeg" } }
        ],
        120
      );
      const cleaned = response.slice(0, 800).trim();
      if (cleaned) return { text: cleaned, source: "Gemini" };
    } catch (err) {
      debugLog("Gemini OCR failed, falling back", err);
    }
  }
  const fallback = await runLocalOcr(file);
  return { text: fallback, source: "Local OCR" };
};

const buildPrompt = (claim: string, sourceSnippets: { title: string; snippet: string }[]) => {
  const lines = [
    "You are a concise fact-checker. Return JSON only:",
    '{ "verdict": "REAL|FAKE|INCONCLUSIVE|SATIRE", "confidence": 0-100, "summary": "one sentence" }',
    "",
    `Claim: ${claim.slice(0, 800)}`,
    "",
    "Source snippets:",
    ...sourceSnippets.map((s, i) => `${i + 1}. ${s.title}: ${s.snippet.slice(0, 240)}`)
  ];
  return lines.join("\n");
};

export const analyzeContent = async (
  input: string | File,
  type: InputType,
  modelChoice: ModelChoice,
  mode: AnalysisMode
): Promise<AnalysisResult> => {
  ensureKey();
  const sources: Source[] = [];
  const agentLogs: AgentLogEntry[] = [];
  let claimText = "";
  let satiric = false;
  let safetyFlag = {
    flagged: false,
    emotion: "neutral",
    harm: "Not evaluated.",
    ethics: "moderate" as AnalysisResult["ethics"],
    reminder: ""
  };
  let userSourceAdded = false;

  if (type === InputType.TEXT && typeof input === "string") {
    claimText = input.trim();
    const domain = extractDomain(claimText);
    if (domain) {
      sources.push({ title: `User source: ${domain}`, uri: claimText, snippet: "Submitted link under review." });
      userSourceAdded = true;
    } else if (claimText) {
      sources.push({
        title: "User statement",
        uri: claimText.slice(0, 200),
        snippet: "User-provided text"
      });
      userSourceAdded = true;
    }
  }

  if (type === InputType.IMAGE && input instanceof File) {
    const { text, source } = await extractImageText(input);
    claimText = text || "No text detected in image.";
    agentLogs.push({
      action: "Image analysis",
      findings: text ? `Extracted text from image using ${source}.` : "Image contained no readable text.",
      source
    });
    sources.push({
      title: "User image upload",
      uri: "image://uploaded",
      snippet: text ? text.slice(0, 200) : "Image without readable text."
    });
    userSourceAdded = true;
  }

  const targetSources = MODE_SETTINGS[mode].sources;
  const query = buildSearchQuery(claimText || "news verification");
  debugLog("Source query", { query, targetSources });
  let crossSources = await fetchCombinedSources(query, targetSources);
  if (!crossSources.length && claimText.length > 30) {
    crossSources = await fetchCombinedSources(claimText.slice(0, 80), targetSources);
  }
  let filteredSources = crossSources.filter((s) => !s.title.toLowerCase().includes("social search"));
  if (claimText) {
    filteredSources = filterRelevantSources(claimText, filteredSources);
  }
  const socialSources = crossSources.filter((s) => s.title.toLowerCase().includes("social search"));
  const realSourceCount = filteredSources.length;
  sources.push(...crossSources);
  agentLogs.push({
    action: "Source gathering",
    findings: realSourceCount
      ? `Fetched ${realSourceCount}/${targetSources} relevant news hits (GDELT + Google News).`
      : "No corroborating articles found; relying on model only.",
    source: "GDELT + RSS"
  });

  satiric = detectSatireOrJoke(claimText);
  safetyFlag = detectHarmfulContent(claimText);

  const snippets: { title: string; snippet: string }[] = [];
  for (const src of filteredSources.slice(0, 3)) {
    const text = await fetchArticleText(src.uri);
    if (text) snippets.push({ title: src.title, snippet: text });
  }
  if (!snippets.length && claimText) {
    snippets.push({ title: "Claim text", snippet: claimText.slice(0, 500) });
  }
  if (!userSourceAdded && claimText) {
    sources.unshift({
      title: "User statement",
      uri: claimText.slice(0, 200),
      snippet: "User-provided text"
    });
  }

  const prompt = buildPrompt(claimText || "No claim text detected", snippets);
  const preferConfig = MODEL_CONFIG[modelChoice] || MODEL_CONFIG[GEMINI_MODEL];
  let modelUsed: ModelChoice = modelChoice;
  let modelOutput: string;

  const tryOpenRouter = async (fallback?: ModelChoice) => {
    const target = MODEL_CONFIG[fallback || "openrouter-llama"];
    if (!target || target.provider !== "openrouter") throw new Error("OpenRouter config missing.");
    const output = await callOpenRouter(prompt, target.modelId, 200);
    modelUsed = fallback || "openrouter-llama";
    return output;
  };

  try {
    debugLog("Model selection", { requested: modelChoice, provider: preferConfig.provider });
    if (preferConfig.provider === "gemini") {
      modelOutput = await callGemini([{ text: prompt }], 200);
      modelUsed = "gemini-1.5-flash";
    } else {
      modelOutput = await tryOpenRouter(modelChoice);
    }
  } catch (err) {
    // Fallback logic: switch provider if available
    if (preferConfig.provider === "gemini" && OPENROUTER_KEY) {
      modelOutput = await tryOpenRouter("openrouter-llama");
    } else if (preferConfig.provider === "openrouter" && GEMINI_KEY) {
      modelOutput = await callGemini([{ text: prompt }], 200);
      modelUsed = "gemini-1.5-flash";
    } else if (preferConfig.provider === "openrouter" && OPENROUTER_KEY) {
      modelOutput = await tryOpenRouter("openrouter-llama");
    } else {
      debugLog("Model fallback failed", err);
      throw err;
    }
  }

  let verdict = Verdict.INCONCLUSIVE;
  let confidenceScore = 50;
  let summary = "Signals are mixed; more evidence needed.";

  try {
    const jsonText = modelOutput.match(/\{[\s\S]*\}/)?.[0] || modelOutput;
    const parsed = JSON.parse(jsonText);
    verdict = parseVerdict(parsed.verdict);
    confidenceScore = Math.min(100, Math.max(0, Math.round(parsed.confidence ?? 50)));
    summary = typeof parsed.summary === "string" ? parsed.summary : summary;
  } catch {
    debugLog("JSON parse fallback", modelOutput);
    // fallback parse
    verdict = parseVerdict(modelOutput);
    confidenceScore = modelOutput.toLowerCase().includes("high") ? 80 : 55;
    summary = modelOutput.slice(0, 200);
  }

  agentLogs.push({
    action: "Gemini verdict",
    findings: `${verdict} (${confidenceScore}%)`,
    source: modelUsed
  });

  if (satiric && verdict === Verdict.REAL) {
    verdict = Verdict.SATIRE;
  }
  if (satiric && !summary.toLowerCase().includes("satire")) {
    summary = "This reads like satire or a joke; treat as non-factual content.";
  }
  if (realSourceCount === 0 || looksImprobable(claimText)) {
    verdict = Verdict.INCONCLUSIVE;
    summary = "No credible sources found. This claim needs more evidence.";
  }
  const confidenceAdjusted = clampConfidence(confidenceScore, realSourceCount, satiric, safetyFlag.flagged || looksImprobable(claimText));

  if (safetyFlag.flagged) {
    agentLogs.push({
      action: "Safety warning",
      findings: safetyFlag.harm,
      source: "Moderation"
    });
    if (!summary.toLowerCase().includes("harmful")) {
      summary = `${summary} ${safetyFlag.reminder}`;
    }
  }

  const shouldShowDetail =
    mode === "deep-analytic" &&
    !satiric &&
    (sources.some((s) => !s.title.toLowerCase().includes("social search")) || realSourceCount > 0);

  const detailedMarkdown =
    shouldShowDetail
      ? [
          "## What was used",
          `- Model: ${modelUsed}`,
          "- Sources: GDELT doc API + Google News RSS + r.jina.ai page text",
          "",
          "## Notes",
          "- Verdict is heuristic; confirm important claims with primary sources.",
          "- Network/API limits may affect responses; retry if it looks off."
        ].join("\n")
      : "Detailed analysis is available in Deep Analytic Mode.";

  return {
    verdict,
    confidenceScore: confidenceAdjusted,
    summary,
    detailedMarkdown,
    sources,
    agentLogs,
    emotion: safetyFlag.flagged ? safetyFlag.emotion : satiric ? "playful" : "neutral",
    harmSignals: safetyFlag.flagged ? safetyFlag.harm : "No direct harmful language detected.",
    ethics: safetyFlag.ethics,
    modelUsed,
    modeUsed: mode,
    shouldShowDetail
  };
};
