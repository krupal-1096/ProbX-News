import React, { useEffect, useState } from 'react';

interface Props {
  etaSeconds?: number;
}

const LOADING_STEPS = [
  "Loading free AI models...",
  "Scanning language tone...",
  "Checking domain reputation...",
  "Inspecting image clues...",
  "Compiling fact sheet...",
  "Scoring credibility...",
  "Generating verdict..."
];

export const AnalysisLoader: React.FC<Props> = ({ etaSeconds = 60 }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(etaSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 1500); // Change step every 1.5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setRemaining(etaSeconds);
  }, [etaSeconds]);

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full py-12">
      {/* Animated Loader */}
      <div className="relative w-48 h-48 mb-8">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
        {/* Inner Spinning Ring */}
        <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin-slow"></div>
        {/* Inner Pulse */}
        <div className="absolute inset-4 bg-blue-50 rounded-full animate-pulse flex items-center justify-center">
           <div className="text-4xl">🤖</div>
        </div>
      </div>

      {/* Status Text */}
      <h3 className="text-xl font-bold text-slate-800 mb-1">Agent Working</h3>
      <p className="text-blue-600 font-mono text-sm bg-blue-50 px-4 py-2 rounded-full border border-blue-100 transition-all duration-300 mb-1">
        {LOADING_STEPS[stepIndex]}
      </p>
      <p className="text-xs text-slate-500 font-semibold">ETA: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p>

      {/* Data stream visual (simulated) */}
      <div className="mt-8 w-full max-w-md space-y-2 opacity-60">
        <div className="h-1 bg-slate-200 rounded overflow-hidden">
           <div className="h-full bg-blue-400 w-1/3 animate-pulse"></div>
        </div>
        <div className="h-1 bg-slate-200 rounded overflow-hidden">
           <div className="h-full bg-green-400 w-2/3 animate-pulse" style={{animationDelay: '0.2s'}}></div>
        </div>
        <div className="h-1 bg-slate-200 rounded overflow-hidden">
           <div className="h-full bg-purple-400 w-1/2 animate-pulse" style={{animationDelay: '0.4s'}}></div>
        </div>
      </div>
    </div>
  );
};
