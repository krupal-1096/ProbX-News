import React, { useEffect, useState } from 'react';
import { SocialIcon } from 'react-social-icons';

interface Props {
  etaSeconds?: number;
}

const LOADING_STEPS = [
  "Scanning recent headlines...",
  "Looking for matching reports...",
  "Comparing wording across sources...",
  "Reading image text if present...",
  "Cross-checking social chatter...",
  "Summarizing what was found...",
  "Scoring credibility..."
];

const CENTER_URLS = [
  "https://google.com",
  "https://duckduckgo.com",
  "https://reddit.com",
  "https://x.com",
  "https://news.google.com",
  "https://rss.com"
];

export const AnalysisLoader: React.FC<Props> = ({ etaSeconds = 60 }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(etaSeconds);
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      setIconIndex((prev) => (prev + 1) % CENTER_URLS.length);
    }, 1400); // Change step every 1.4s
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
    <div className="relative flex flex-col items-center justify-center w-full py-12 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none loader-aurora" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="orb orb-one" />
        <div className="orb orb-two" />
      </div>
      {/* Animated Loader */}
      <div className="relative w-48 h-48 mb-8">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
        {/* Inner Spinning Ring */}
        <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin-slow"></div>
        {/* Inner Pulse */}
        <div className="absolute inset-4 bg-blue-50 rounded-full animate-pulse flex items-center justify-center">
           <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center">
             <SocialIcon url={CENTER_URLS[iconIndex]} style={{ height: 48, width: 48 }} bgColor="transparent" fgColor="currentColor" />
           </div>
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
