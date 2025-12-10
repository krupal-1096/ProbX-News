import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { NewsTicker } from './components/NewsTicker';
import { InputSection } from './components/InputSection';
import { AnalysisLoader } from './components/AnalysisLoader';
import { ResultDisplay } from './components/ResultDisplay';
import { analyzeContent } from './services/freeAiService';
import { AnalysisMode, AnalysisResult, InputType, ModelChoice } from './types';
import appBootWebm from './assets/android/app-boot.webm';
import appBootMp4 from './assets/android/app-boot.mp4';
import appLogo from './assets/android/app-logo.png';

const BootScreen: React.FC = () => {
  const [step, setStep] = useState(0);
  const steps = [
    "Warming up free AI models",
    "Checking cross-check channels",
    "Arming fake news radar",
    "Loading home screen"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 750);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="w-full flex items-center justify-center">
        <video
          className="w-[55vw] max-w-[420px] h-auto object-contain opacity-95"
          autoPlay
          muted
          playsInline
          loop
          poster={appLogo}
        >
          <source src={appBootWebm} type="video/webm" />
          <source src={appBootMp4} type="video/mp4" />
        </video>
      </div>
      <div className="absolute bottom-14 md:bottom-10 text-center px-6">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">Boot</p>
        <p className="text-lg font-semibold text-slate-800">Starting multi-model fact-checker</p>
        <p className="text-slate-500 text-sm">{steps[step]}</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // State management for the app flow
  const [view, setView] = useState<'boot' | 'input' | 'processing' | 'result'>('boot');
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [etaSeconds, setEtaSeconds] = useState<number>(60);

  const modeSettings: Record<AnalysisMode, number> = {
    fast: 30,
    analyze: 75,
    "deep-analytic": 180
  };

  useEffect(() => {
    const timer = setTimeout(() => setView('input'), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Handler for starting the analysis
  const handleAnalyze = async (input: string | File, type: InputType, model: ModelChoice, mode: AnalysisMode) => {
    setView('processing');
    setError(null);
    let baseEta = modeSettings[mode];
    if (type === InputType.IMAGE) {
      baseEta = Math.round(baseEta * 1.2); // slight buffer for image processing
    }
    const connection = (navigator as any).connection;
    if (connection?.downlink) {
      if (connection.downlink > 10) baseEta = Math.max(20, Math.round(baseEta * 0.6));
      else if (connection.downlink < 2) baseEta = Math.round(baseEta * 1.3);
    }
    setEtaSeconds(baseEta);

    try {
      const result = await analyzeContent(input, type, model, mode);
      setAnalysisData(result);
      if (result.sources?.length) {
        const adjusted = Math.max(20, Math.min(300, baseEta + result.sources.length * 10));
        setEtaSeconds(adjusted);
      }
      setView('result');
      if ("Notification" in window) {
        Notification.requestPermission().then((perm) => {
          if (perm === "granted") {
            new Notification("ProbX News", { body: "Your analysis result is ready." });
          }
        });
      }
    } catch (err: any) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || "An unexpected error occurred during analysis.");
      setView('input');
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setError(null);
    setView('input');
  };

  if (view === 'boot') {
    return <BootScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      {/* Sticky Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 pb-12 w-full max-w-3xl mx-auto z-10">

        {error && (
          <div className="w-full bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm animate-pulse" role="alert">
            <p className="font-bold">System Alert</p>
            <p>{error}</p>
          </div>
        )}

        {view === 'input' && <InputSection onAnalyze={handleAnalyze} />}

        {view === 'processing' && <AnalysisLoader etaSeconds={etaSeconds} />}

        {view === 'result' && analysisData && (
          <ResultDisplay result={analysisData} onReset={handleReset} />
        )}

      </main>

      {/* Sticky Footer Ad Ticker */}
      <NewsTicker />

    </div>
  );
};

export default App;
