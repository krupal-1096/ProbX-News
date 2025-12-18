import React, { useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { NewsTicker } from './components/NewsTicker';
import { InputSection } from './components/InputSection';
import { AnalysisLoader } from './components/AnalysisLoader';
import { ResultDisplay } from './components/ResultDisplay';
import { AnalysisMode, AnalysisResult, InputType, ModelChoice } from './types';
import { LocalNotifications } from '@capacitor/local-notifications';
let analyzerLoader: Promise<typeof import('./services/freeAiService')> | null = null;
const loadAnalyzer = () => {
  if (!analyzerLoader) {
    analyzerLoader = import('./services/freeAiService');
  }
  return analyzerLoader;
};
import appMark from './assets/imgs/logo_only.png';

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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="boot-orb boot-orb-one" />
      <div className="boot-orb boot-orb-two" />
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
        <div className="relative w-28 h-28 md:w-32 md:h-32">
          <div className="boot-glow" />
          <div className="absolute inset-1 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/15 overflow-hidden flex items-center justify-center shadow-2xl">
            <div className="boot-scan" />
            <img src={appMark} alt="ProbX News logo" className="relative z-10 w-10 h-10 md:w-12 md:h-12 drop-shadow-[0_0_16px_rgba(59,130,246,0.45)]" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold">Spooling up the ProbX engine</p>
          <p className="text-sm text-slate-300">{steps[step]}</p>
        </div>
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
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState<number>(0);
  const [downloadState, setDownloadState] = useState<'idle' | 'active' | 'success' | 'error'>('idle');
  const [downloadDetail, setDownloadDetail] = useState<string | null>(null);
  const [downloadBytes, setDownloadBytes] = useState<{ received?: number; total?: number }>({});
  const [isReady, setIsReady] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("probx-model-ready") === "true";
  });
  const [notificationsReady, setNotificationsReady] = useState<boolean>(false);
  const [readyBannerVisible, setReadyBannerVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("probx-model-ready") === "true";
  });
  const hideDownloadRef = useRef<number | null>(null);
  const hideReadyRef = useRef<number | null>(null);
  const downloadNotificationTag = useRef<string>("probx-model-download");
  const lastNotifiedPct = useRef<number>(0);
  const analyzingNotificationTag = useRef<string>("probx-analyzing");
  const notificationIdRef = useRef<number>(1);
  const PROGRESS_CHANNEL = "probx-progress";
  const ALERT_CHANNEL = "probx-alerts";

  const modeSettings: Record<AnalysisMode, number> = {
    fast: 30,
    analyze: 75,
    "deep-analytic": 180
  };

  useEffect(() => {
    const timer = setTimeout(() => setView('input'), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (hideDownloadRef.current) {
        window.clearTimeout(hideDownloadRef.current);
      }
      if (hideReadyRef.current) {
        window.clearTimeout(hideReadyRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    const initNotifications = async () => {
      try {
        let permStatus = await LocalNotifications.checkPermissions();

        if (permStatus.display === 'prompt') {
          permStatus = await LocalNotifications.requestPermissions();
        }

        const granted = permStatus.display === 'granted';

        if (granted) {
          await LocalNotifications.createChannel({
            id: PROGRESS_CHANNEL,
            name: "ProbX Progress",
            importance: 3,
            visibility: 1
          });
          await LocalNotifications.createChannel({
            id: ALERT_CHANNEL,
            name: "ProbX Alerts",
            importance: 4,
            visibility: 1,
            sound: "default"
          });
          setNotificationsReady(true);
        }

        const sub = await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
          const target = (event.notification?.extra as any)?.target;
          if (target) {
            window.location.hash = `#${target}`;
            window.focus();
          }
        });
        removeListener = () => sub.remove();
      } catch (err) {
        console.warn("Notification setup skipped", err);
      }
    };
    initNotifications();
    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  const scheduleLocalNotification = async (opts: { title: string; body: string; channel?: string; tag?: string; sound?: string | null; target?: string }) => {
    if (!notificationsReady) {
      // graceful no-op on web/denied permission
      return;
    }
    try {
      const nextId = (notificationIdRef.current % 2147483640) + 1;
      notificationIdRef.current = nextId;
      await LocalNotifications.schedule({
        notifications: [{
          id: nextId,
          title: opts.title,
          body: opts.body,
          channelId: opts.channel || PROGRESS_CHANNEL,
          group: opts.tag || "probx",
          sound: opts.sound === undefined ? undefined : opts.sound,
          smallIcon: "ic_launcher",
          iconColor: "#0ea5e9",
          extra: { target: opts.target }
        }]
      });
    } catch (err) {
      console.warn("Notification send skipped", err);
    }
  };

  useEffect(() => {
    if (isReady) {
      setReadyBannerVisible(true);
      if (hideReadyRef.current) window.clearTimeout(hideReadyRef.current);
      hideReadyRef.current = window.setTimeout(() => setReadyBannerVisible(false), 2200);
    }
  }, [isReady]);

  const pushDownloadNotification = async (title: string, body: string) => {
    await scheduleLocalNotification({ title, body, channel: PROGRESS_CHANNEL, tag: downloadNotificationTag.current, sound: null, target: "processing" });
  };

  const startDownloadBanner = (msg: string) => {
    if (hideDownloadRef.current) window.clearTimeout(hideDownloadRef.current);
    setDownloadState('active');
    setDownloadMsg(msg);
    setDownloadDetail('Fetching optimized on-device models');
    setDownloadPct(0);
    setDownloadBytes({});
    lastNotifiedPct.current = 0;
  };

  const finishDownloadBanner = (status: 'success' | 'error', detail?: string) => {
    if (hideDownloadRef.current) window.clearTimeout(hideDownloadRef.current);
    setDownloadState(status);
    setDownloadDetail(detail ?? null);
    setDownloadBytes(status === 'success' ? { received: downloadBytes.total, total: downloadBytes.total } : downloadBytes);
    if (status === 'success') {
      localStorage.setItem("probx-model-ready", "true");
      setReadyBannerVisible(true);
      if (hideReadyRef.current) window.clearTimeout(hideReadyRef.current);
      hideReadyRef.current = window.setTimeout(() => setReadyBannerVisible(false), 2200);
      hideDownloadRef.current = window.setTimeout(() => {
        setDownloadState('idle');
        setDownloadMsg(null);
        setDownloadDetail(null);
      }, 1400);
    }
  };

  const pushAnalyzingNotification = (opts: { title: string; body: string; tag?: string; target?: string; alert?: boolean }) => {
    scheduleLocalNotification({
      title: opts.title,
      body: opts.body,
      tag: opts.tag || analyzingNotificationTag.current,
      target: opts.target,
      channel: opts.alert ? ALERT_CHANNEL : PROGRESS_CHANNEL,
      sound: opts.alert ? "default" : null
    });
  };

  // Handler for starting the analysis
  const handleAnalyze = async (input: string | File, type: InputType, model: ModelChoice, mode: AnalysisMode) => {
    setView('processing');
    setError(null);
    if (!isReady) {
      startDownloadBanner("this will take a moment...");
    } else {
      setDownloadState('success');
      setDownloadMsg("Using cached models");
      setDownloadDetail("No download required");
      setDownloadPct(100);
      finishDownloadBanner('success', "Models cached. We're good to go.");
    }
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
    pushAnalyzingNotification({
      title: "ProbX News",
      body: `Analyzing with ${model} • ${mode}. Gathering sources...`,
      target: "processing"
    });

    try {
      const mod = await loadAnalyzer();
      mod.registerDownloadProgress((msg, pct, receivedBytes, totalBytes) => {
        if (msg === null) {
          setDownloadMsg("Download complete");
          setDownloadPct(100);
          finishDownloadBanner('success', "Models cached. We're good to go.");
          pushDownloadNotification("ProbX News", "Model download complete — ready for analysis.");
          lastNotifiedPct.current = 100;
          setIsReady(true);
          return;
        }
        setDownloadMsg(msg);
        const pctNum = typeof pct === 'number' ? Math.max(1, Math.round(pct * 100)) : downloadPct || 1;
        const displayPct = Math.min(100, pctNum);
        setDownloadPct(displayPct);
        setDownloadBytes({
          received: receivedBytes ?? downloadBytes.received,
          total: totalBytes ?? downloadBytes.total
        });
        setDownloadDetail(`Progress: ${displayPct}%`);
        setDownloadState('active');
        if (displayPct - lastNotifiedPct.current >= 5) {
          pushDownloadNotification("ProbX News", `${displayPct}% • ${msg}`);
          lastNotifiedPct.current = displayPct;
        }
      });
      const { analyzeContent } = mod;
      const result = await analyzeContent(input, type, model, mode);
      setAnalysisData(result);
      finishDownloadBanner('success', "Models cached. We're good to go.");
      if (result.sources?.length) {
        const adjusted = Math.max(20, Math.min(300, baseEta + result.sources.length * 10));
        setEtaSeconds(adjusted);
      }
      setView('result');
      pushAnalyzingNotification({
        title: "Analysis complete",
        body: `${model} • ${mode} • ${result.sources.length} sources found`,
        target: "result",
        alert: true
      });
    } catch (err: any) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setDownloadState('error');
      setDownloadDetail("Check your connection or try again in a moment.");
      setDownloadMsg("Model download failed");
      pushDownloadNotification("ProbX News", `Download error: ${errorMessage}`);
      pushAnalyzingNotification({
        title: "Analysis failed",
        body: errorMessage || "Unexpected error during analysis",
        tag: analyzingNotificationTag.current,
        target: "input",
        alert: true
      });
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

  const downloadBarColor = downloadState === 'success' ? 'bg-green-500' : downloadState === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const downloadTone = downloadState === 'success'
    ? 'bg-green-50 border-green-500 text-green-800'
    : downloadState === 'error'
    ? 'bg-red-50 border-red-500 text-red-800'
    : 'bg-blue-50 border-blue-500 text-blue-800';
  const formatBytes = (val?: number) => {
    if (!val && val !== 0) return null;
    const units = ["B","KB","MB","GB"];
    let v = val;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v = v / 1024;
      i += 1;
    }
    return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
  };
  const downloadedText = (() => {
    const received = formatBytes(downloadBytes.received);
    const total = formatBytes(downloadBytes.total);
    if (received && total) return `${received} of ${total}`;
    if (received) return `${received} downloaded`;
    return null;
  })();

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

        {downloadState !== 'idle' && downloadMsg && (
          <div className={`w-full ${downloadTone} border-l-4 p-4 mb-6 rounded shadow-sm relative overflow-hidden`} role="status">
            <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-white via-transparent to-white animate-[pulse_2s_ease-in-out_infinite]" />
            <div className="flex items-center justify-between gap-2 relative z-10">
              <p className="font-bold flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current animate-ping" />
                {downloadState === 'success' ? 'Models ready' : downloadState === 'error' ? 'Download error' : 'Preparing models'}
              </p>
              <span className="text-xs text-slate-600 font-semibold">{Math.min(100, downloadPct)}%</span>
            </div>
            <p className="text-sm relative z-10">{downloadMsg}</p>
            {downloadDetail && <p className="text-xs opacity-80 mt-1 relative z-10">{downloadDetail}</p>}
            {downloadedText && <p className="text-xs text-slate-600 mt-1 relative z-10">{downloadedText}</p>}
            <div className="w-full bg-slate-200 h-3 rounded-xl mt-3 overflow-hidden relative z-10 shadow-inner">
              <div
                className={`h-3 transition-all ${downloadBarColor} bar-stripes`}
                style={{ width: `${Math.min(100, downloadPct)}%` }}
                aria-label={`Download progress ${Math.min(100, downloadPct)} percent`}
              ></div>
            </div>
            {downloadState === 'success' && <p className="text-xs mt-2 relative z-10">Download complete. Banner will close automatically.</p>}
            {downloadState === 'error' && <p className="text-xs mt-2 relative z-10">No connection? The request might have timed out.</p>}
          </div>
        )}

        {readyBannerVisible && (
          <div className="w-full bg-green-50 border-l-4 border-green-500 text-green-800 p-3 mb-4 rounded shadow-sm flex items-center gap-3" role="status">
            <button className="ready-check-btn" aria-label="Models installed">
              ✓
            </button>
            <div>
              <p className="font-semibold text-sm">Models installed locally</p>
              <p className="text-xs text-green-700">Ready to analyze without downloads.</p>
            </div>
          </div>
        )}

        {view === 'input' && <InputSection onAnalyze={handleAnalyze} disabled={downloadState === 'active' && !isReady} />}

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
