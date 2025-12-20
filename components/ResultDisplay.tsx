import React, { useState } from 'react';
import { AnalysisResult, Verdict } from '../types';

interface ResultDisplayProps {
  result: AnalysisResult;
  onReset: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, onReset }) => {
  const [showWhy, setShowWhy] = useState(false);
  const isUserSource = (s: string) => s.toLowerCase().startsWith('user ');
  const isSocial = (s: string) => s.toLowerCase().includes('social search');

  const userSources = result.sources.filter((s) => isUserSource(s.title));
  const modelSources = result.sources.filter((s) => !isUserSource(s.title));
  const socialSources = modelSources.filter((s) => isSocial(s.title));
  const articleSources = modelSources.filter((s) => !isSocial(s.title));
  const accuracy = result.confidenceScore;
  const modelLabels: Record<string, string> = {
    "hf-nli": "Cloud fact-checker",
    "hf-nli-explain": "Fact-checker + notes"
  };
  const modeLabels: Record<string, string> = {
    fast: "Quick check",
    analyze: "Balanced check",
    "deep-analytic": "Thorough check"
  };
  let accuracyColor = "bg-slate-100 text-slate-800 border-slate-200";
  let badge = { bg: "bg-slate-300", icon: "🙂", tone: "unauthentic" };
  if (accuracy <= 40) {
    accuracyColor = "bg-red-50 text-red-800 border-red-100";
    badge = { bg: "bg-red-200 text-red-900", icon: "☹", tone: "unauthentic" };
  } else if (accuracy <= 55) {
    accuracyColor = "bg-orange-50 text-orange-800 border-orange-100";
    badge = { bg: "bg-orange-200 text-orange-900", icon: "⚪", tone: "somewhat true" };
  } else if (accuracy <= 75) {
    accuracyColor = "bg-yellow-50 text-yellow-800 border-yellow-100";
    badge = { bg: "bg-yellow-200 text-yellow-900", icon: "◑", tone: "almost true" };
  } else {
    accuracyColor = "bg-green-50 text-green-800 border-green-100";
    badge = { bg: "bg-green-200 text-green-900", icon: "◕", tone: "real and authentic" };
  }

  const showDetail = result.modeUsed === 'deep-analytic' && result.shouldShowDetail !== false;
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("theme-dark");

  const Icon = ({ kind }: { kind: 'x' | 'reddit' | 'web' | 'doc' }) => {
    const common = "w-4 h-4 inline-block text-slate-500";
    if (kind === 'x') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16M20 4L9 15" />
        </svg>
      );
    }
    if (kind === 'reddit') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="6" />
          <circle cx="9.5" cy="12" r="1" />
          <circle cx="14.5" cy="12" r="1" />
          <path d="M9 14c1.5 1 4.5 1 6 0" />
        </svg>
      );
    }
    if (kind === 'doc') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v4h4" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
      </svg>
    );
  };

  const getIconKind = (uri: string) => {
    const lower = uri.toLowerCase();
    if (lower.includes('x.com') || lower.includes('twitter.com')) return 'x';
    if (lower.includes('reddit.com')) return 'reddit';
    if (lower.includes('http')) return 'web';
    return 'doc';
  };

  const isUrl = (val: string) => /^https?:\/\//i.test(val);
  const whyLines: string[] = [];
  whyLines.push(`Verdict: ${badge.tone} with ${accuracy}% confidence using ${modelLabels[result.modelUsed] || result.modelUsed}.`);
  if (articleSources.length > 0) {
    whyLines.push(`We checked ${articleSources.length} news sources and compared wording for consistency.`);
  } else {
    whyLines.push("No matching articles were found online; verdict leans on model reasoning only.");
  }
  if (socialSources.length > 0) {
    whyLines.push("Social searches were included to spot contradictions or viral claims.");
  }
  if (result.verdict === Verdict.SATIRE) {
    whyLines.push("The statement looks satirical or playful, so it should not be treated as factual news.");
  }
  if (accuracy < 50) {
    whyLines.push("Low confidence: consider adding a clearer source link or headline and rerun.");
  }

  return (
    <div className="w-full space-y-6">
      
      {/* Verdict Card */}
      <div className={`rounded-3xl border-4 p-8 text-center shadow-xl transform transition-all border ${accuracyColor} ${isDark ? 'glass-card' : ''}`}>
        <div className="flex justify-center mb-4 animate-bounce-slow">
          <div className={`w-16 h-16 flex items-center justify-center text-3xl rounded-full shadow ${badge.bg}`}>{badge.icon}</div>
        </div>
        <h2 className="text-4xl font-black uppercase tracking-wider mb-2">{badge.tone}</h2>
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold border border-current/20 mb-4 ${accuracyColor}`}>
           ACCURACY: {result.confidenceScore}%
        </div>
        <p className="text-xs text-slate-500 mb-2">
          Checker: {modelLabels[result.modelUsed] || result.modelUsed} • Depth: {modeLabels[result.modeUsed] || result.modeUsed}
        </p>
        <p className="text-xl font-medium leading-relaxed opacity-90">
          {result.summary} ({articleSources.length} sources used).
        </p>
        <button
          onClick={() => setShowWhy((p) => !p)}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white/60 hover:bg-white transition text-sm font-semibold text-slate-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4" />
            <circle cx="12" cy="16" r="0.75" />
          </svg>
          Why this verdict
        </button>
        {showWhy && (
          <div className="mt-3 text-left bg-white/80 border border-slate-200 rounded-xl p-3 shadow-sm space-y-1">
            {whyLines.map((line, idx) => (
              <p key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                {line}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Resources / Evidence Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-100 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Evidence Sources
            </h3>
            <span className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded border">EVIDENCE GATHERED ONLINE</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          <div className="p-4">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-2">User Source</p>
            {userSources.length === 0 ? (
              <div className="text-slate-400 text-sm italic">No user source captured.</div>
            ) : (
              userSources.map((source, idx) => (
                  <div key={`user-${idx}`} className="mb-2">
                    {source.uri.startsWith("image://") ? (
                      <>
                        <p className="text-blue-600 font-semibold">Uploaded image</p>
                        {source.snippet && <div className="text-xs text-slate-500 line-clamp-2">{source.snippet}</div>}
                      </>
                    ) : isUrl(source.uri) ? (
                      <>
                        <a href={source.uri} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                          {source.title.replace("User source: ", "") || "User link"} <Icon kind={getIconKind(source.uri)} />
                        </a>
                        <div className="text-xs text-slate-500">{source.uri}</div>
                      </>
                    ) : (
                      <>
                        <p className="text-blue-600 font-semibold">User statement</p>
                        <div className="text-xs text-slate-500 line-clamp-2">{source.uri}</div>
                      </>
                    )}
                  </div>
                ))
            )}
          </div>
          <div className="p-4 border-t border-slate-100">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-2">Model Sources</p>
            {articleSources.length === 0 ? (
              <div className="text-slate-400 text-sm italic">No model sources found.</div>
            ) : (
              articleSources.map((source, idx) => {
                  const domain = source.title.replace("Cross-check: ", "");
                  return (
                    <div key={`model-${idx}`} className="mb-2">
                        <a href={source.uri} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                          {domain} <Icon kind={getIconKind(source.uri)} />
                        </a>
                        <div className="text-xs text-slate-500 line-clamp-2">{source.uri}</div>
                      </div>
                    );
                  })
            )}
            {socialSources.length > 0 && (
              <div className="mt-3">
                <p className="text-xs uppercase font-semibold text-slate-500 mb-2">Social searches</p>
                {socialSources.map((source, idx) => (
                  <div key={`social-${idx}`} className="mb-2">
                    <a href={source.uri} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                      {source.title} <Icon kind={getIconKind(source.uri)} />
                    </a>
                    <div className="text-xs text-slate-500 line-clamp-2">{source.uri}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent Research Log (The "Excel Sheet" Visualization) */}
      {articleSources.length > 1 && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12l4-4m-4 4 4 4" />
              </svg>
              Cross verification
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500 text-white">2+ sources</span>
          </div>
          <div className="p-4 space-y-3">
            {articleSources.slice(0, 2).map((src, idx) => (
              <div key={`cross-${idx}`} className="flex items-start gap-3 p-3 border border-slate-200 rounded-xl">
                <Icon kind={getIconKind(src.uri)} />
                <div>
                  <a href={src.uri} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 hover:underline">
                    {src.title.replace("Cross-check: ", "")}
                  </a>
                  <div className="text-xs text-slate-500 line-clamp-2">{src.uri}</div>
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Findings were cross-checked across multiple sources to avoid single-source bias.
            </p>
          </div>
        </div>
      )}
      {articleSources.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Sources to compare</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">spot differences</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {articleSources.slice(0, 2).map((src, idx) => (
              <div key={`diff-${idx}`} className="p-3 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <Icon kind={getIconKind(src.uri)} />
                  <a href={src.uri} target="_blank" rel="noreferrer" className="hover:underline">
                    {src.title.replace("Cross-check: ", "")}
                  </a>
                </div>
                {src.snippet && <p className="mt-2 text-xs text-slate-500 line-clamp-3">{src.snippet}</p>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Compare these two sources side-by-side. If their wording or claims differ, treat the verdict cautiously.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25v1.5c0 .621.504 1.125 1.125 1.125m17.25-2.625h-7.5c-.621 0-1.125.504-1.125 1.125" />
                </svg>
                What we noticed
            </h3>
            <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">LIVE DATA</span>
        </div>
        <div className="p-4 grid gap-3 sm:grid-cols-2">
        {result.agentLogs.map((log, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-3 bg-white shadow-sm">
            <p className="text-sm text-slate-700">{log.findings}</p>
          </div>
        ))}
      </div>
    </div>

      {showDetail && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-4">
            <h3 className="text-xl font-bold text-slate-800">Detailed Analysis</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Tone and intent</p>
                <p className="text-sm text-slate-600">
                  The article leans toward: {result.emotion}. This is inferred from repeated phrasing and emphasis that guide the reader’s emotion in that direction.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Harm and safety</p>
                <p className="text-sm text-slate-600">
                  {result.harmSignals}. No specific community/country/race/gender was flagged as a target; monitor for indirect harm if context shifts to vulnerable groups.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Ethics</p>
                <p className="text-sm text-slate-600">
                  Ethics rated {result.ethics}. This reflects how balanced the claims are and whether the author avoids sensationalism or misleading framing.
                </p>
              </div>
              {result.confidenceScore < 60 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  Low confidence: consider cross-checking with an additional trusted source or re-running in Deep Analytic mode.
                </div>
              )}
            </div>
       </div>
      )}

      <button
        onClick={onReset}
        className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        ANALYZE ANOTHER
      </button>
    </div>
  );
};
