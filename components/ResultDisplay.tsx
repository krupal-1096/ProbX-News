import React from 'react';
import { AnalysisResult, Verdict } from '../types';

interface ResultDisplayProps {
  result: AnalysisResult;
  onReset: () => void;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, onReset }) => {
  const userSources = result.sources.filter((s) => s.title.toLowerCase().includes('user source'));
  const modelSources = result.sources.filter((s) => !s.title.toLowerCase().includes('user source'));
  const accuracy = result.confidenceScore;
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

  return (
    <div className="w-full space-y-6">
      
      {/* Verdict Card */}
      <div className={`rounded-3xl border-4 p-8 text-center shadow-xl transform transition-all border ${accuracyColor}`}>
        <div className="flex justify-center mb-4 animate-bounce-slow">
          <div className={`w-16 h-16 flex items-center justify-center text-3xl rounded-full shadow ${badge.bg}`}>{badge.icon}</div>
        </div>
        <h2 className="text-4xl font-black uppercase tracking-wider mb-2">{badge.tone}</h2>
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold border border-current/20 mb-4 ${accuracyColor}`}>
           ACCURACY: {result.confidenceScore}%
        </div>
        <p className="text-xs text-slate-500 mb-2">Model: {result.modelUsed} • Mode: {result.modeUsed}</p>
        <p className="text-xl font-medium leading-relaxed opacity-90">
          {result.summary} ({modelSources.length} sources used).
        </p>
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
            <span className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded border">MODEL + WEB CROSS-CHECK</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          <div className="p-4">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-2">User Source</p>
            {userSources.length === 0 ? (
              <div className="text-slate-400 text-sm italic">No user source captured.</div>
            ) : (
              userSources.map((source, idx) => (
                  <div key={`user-${idx}`} className="mb-2">
                    <a href={source.uri} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                      {source.title.replace("User source: ", "")}
                    </a>
                    <div className="text-xs text-slate-500">{source.uri}</div>
                  </div>
                ))
            )}
          </div>
          <div className="p-4 border-t border-slate-100">
            <p className="text-xs uppercase font-semibold text-slate-500 mb-2">Model Sources</p>
            {modelSources.length === 0 ? (
              <div className="text-slate-400 text-sm italic">No model sources found.</div>
            ) : (
              modelSources.map((source, idx) => {
                  const domain = source.title.replace("Cross-check: ", "");
                  return (
                    <div key={`model-${idx}`} className="mb-2">
                      <a href={source.uri} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                        {domain}
                      </a>
                      <div className="text-xs text-slate-500 line-clamp-2">{source.uri}</div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* Agent Research Log (The "Excel Sheet" Visualization) */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25v1.5c0 .621.504 1.125 1.125 1.125m17.25-2.625h-7.5c-.621 0-1.125.504-1.125 1.125" />
                </svg>
                Agent Signals
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

      {result.modeUsed === 'deep-analytic' && (
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
