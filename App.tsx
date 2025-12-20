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

const formatBytes = (val?: number) => {
  if (!val && val !== 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let v = val;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v = v / 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
};

const formatSeconds = (sec?: number | null) => {
  if (!sec || sec < 0) return null;
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
};

type BootScreenProps = {
  downloadState: 'idle' | 'active' | 'success' | 'error';
  downloadMsg: string | null;
  downloadDetail: string | null;
  downloadPct: number;
  downloadBytes: { received?: number; total?: number };
  downloadSegments: {
    phase?: "model" | "ocr";
    model?: { received?: number; total?: number };
    ocr?: { received?: number; total?: number };
  };
  downloadEta: number | null;
  onRetry: () => void;
};

const BootScreen: React.FC<BootScreenProps> = ({
  downloadState,
  downloadMsg,
  downloadDetail,
  downloadPct,
  downloadBytes,
  downloadSegments,
  downloadEta,
  onRetry
}) => {
  const [step, setStep] = useState(0);
  const steps = [
    "Configuring AI models",
    "Checking cross-check channels",
    "Arming fake news radar",
    "Loading home screen"
  ];

  useEffect(() => {
    if (downloadState === 'active') {
      setStep(0);
      return;
    }
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 750);
    return () => clearInterval(interval);
  }, [downloadState, steps.length]);

  const downloadBarColor = downloadState === 'success' ? 'bg-green-400' : downloadState === 'error' ? 'bg-red-400' : 'bg-blue-400';
  const received = formatBytes(downloadBytes.received);
  const total = formatBytes(downloadBytes.total);
  const percentText = `${Math.min(100, downloadPct)}%`;
  const detailLine = downloadState === 'error'
    ? downloadDetail || "Connection lost. Tap retry to resume."
    : null;
  const etaText = formatSeconds(downloadEta);
  const modelText = (() => {
    const received = formatBytes(downloadSegments.model?.received);
    const total = formatBytes(downloadSegments.model?.total);
    if (!received && !total) return null;
    return `Model: ${received || "0 B"}${total ? ` of ${total}` : ""}`;
  })();
  const ocrText = (() => {
    const received = formatBytes(downloadSegments.ocr?.received);
    const total = formatBytes(downloadSegments.ocr?.total);
    if (!received && !total) return null;
    return `OCR: ${received || "0 B"}${total ? ` of ${total}` : ""}`;
  })();

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
          <p className="text-lg font-semibold">Launching ProbX engine</p>
          <p className="text-sm text-slate-300">{steps[step]}</p>
        </div>
      </div>
      <div className="absolute bottom-8 left-0 right-0 px-6">
        <div className="max-w-xl mx-auto bg-slate-900/70 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
            <span>
              {downloadState === 'error'
                ? 'Download paused'
                : downloadSegments.phase === 'ocr'
                ? 'Downloading OCR assets'
                : 'Downloading models'}
            </span>
            <span className="text-slate-300">Progress: {percentText}</span>
          </div>
          <div className="w-full bg-slate-800/80 h-2.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-2.5 transition-all ${downloadBarColor} bar-stripes`}
              style={{ width: `${Math.min(100, downloadPct)}%` }}
              aria-label={`Download progress ${Math.min(100, downloadPct)} percent`}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-300">
            <span>{downloadMsg || "Preparing download..."}</span>
            {etaText ? <span>ETA: {etaText}</span> : <span aria-hidden="true">&nbsp;</span>}
          </div>
          {(modelText || ocrText) && (
            <div className="flex flex-col gap-1 mt-2 text-[11px] text-slate-400">
              {modelText && <span>{modelText}</span>}
              {ocrText && <span>{ocrText}</span>}
            </div>
          )}
          {detailLine && <p className="text-[11px] text-slate-400 mt-1">{detailLine}</p>}
          <div className="mt-2 text-[11px] text-slate-400 space-y-1">
            <p>One-time install. Files stay cached for offline use.</p>
            <p>If interrupted, the download resumes automatically.</p>
            {etaText && <p>Estimated time remaining: {etaText}</p>}
          </div>
          {downloadState === 'error' && (
            <button
              className="mt-3 w-full text-xs font-semibold uppercase tracking-widest bg-red-500/20 text-red-200 py-2 rounded-lg border border-red-400/40 hover:bg-red-500/30 transition"
              onClick={onRetry}
            >
              Retry download
            </button>
          )}
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
  const [downloadSegments, setDownloadSegments] = useState<{
    phase?: "model" | "ocr";
    model?: { received?: number; total?: number };
    ocr?: { received?: number; total?: number };
  }>({});
  const [downloadEta, setDownloadEta] = useState<number | null>(null);
  const [downloadAttempt, setDownloadAttempt] = useState<number>(0);
  const [verified, setVerified] = useState<boolean>(false);
  const [notificationsReady, setNotificationsReady] = useState<boolean>(false);
  const [lastDownloadTick, setLastDownloadTick] = useState<number>(Date.now());
  const hideDownloadRef = useRef<number | null>(null);
  const analyzingNotificationTag = useRef<string>("probx-analyzing");
  const notificationIdRef = useRef<number>(1);
  const bootActiveRef = useRef<boolean>(true);
  const PROGRESS_CHANNEL = "probx-progress";
  const ALERT_CHANNEL = "probx-alerts";

  const modeSettings: Record<AnalysisMode, number> = {
    fast: 30,
    analyze: 75,
    "deep-analytic": 180
  };

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => undefined);
    }
  }, []);

  // Smooth progress when backend does not report pct; prevents “stuck at 1%”
  useEffect(() => {
    if (downloadState !== 'active') return;
    const id = window.setInterval(() => {
      setDownloadPct((pct) => {
        const now = Date.now();
        const elapsed = now - lastDownloadTick;
        if (elapsed > 5000 && pct < 90) {
          return Math.min(90, pct + 1);
        }
        return pct;
      });
    }, 2000);
    return () => window.clearInterval(id);
  }, [downloadState, lastDownloadTick]);

  useEffect(() => {
    bootActiveRef.current = view === 'boot';
  }, [view]);

  useEffect(() => {
    return () => {
      if (hideDownloadRef.current) {
        window.clearTimeout(hideDownloadRef.current);
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

  const scheduleLocalNotification = async (opts: { title: string; body: string; channel?: string; tag?: string; sound?: string | null; target?: string; id?: number }) => {
    if (!notificationsReady) {
      // graceful no-op on web/denied permission
      return;
    }
    try {
      const nextId = opts.id ?? ((notificationIdRef.current % 2147483640) + 1);
      if (!opts.id) notificationIdRef.current = nextId;
      else {
        await LocalNotifications.cancel({ notifications: [{ id: nextId }] }).catch(() => undefined);
      }
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
      window.setTimeout(() => {
        LocalNotifications.cancel({ notifications: [{ id: nextId }] }).catch(() => undefined);
      }, 6000);
    } catch (err) {
      console.warn("Notification send skipped", err);
    }
  };

  const startDownloadBoot = (msg: string) => {
    if (hideDownloadRef.current) window.clearTimeout(hideDownloadRef.current);
    setDownloadState('active');
    setDownloadMsg(msg);
    setDownloadDetail('Fetching optimized on-device models');
    setDownloadSegments({});
    setDownloadBytes({});
    setDownloadPct((pct) => (pct > 0 ? pct : 1));
  };

  const finishDownloadBoot = (status: 'success' | 'error', detail?: string) => {
    if (hideDownloadRef.current) window.clearTimeout(hideDownloadRef.current);
    setDownloadState(status);
    setDownloadDetail(detail ?? null);
    if (status === 'success') {
      localStorage.setItem("probx-model-ready", "true");
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

  const hydrateDownloadProgress = () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("probx-model-progress");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { received?: number; total?: number; pct?: number };
      if (parsed?.received || parsed?.total) {
        setDownloadBytes({ received: parsed.received, total: parsed.total });
      }
      if (typeof parsed?.pct === "number") {
        setDownloadPct(Math.max(1, Math.min(99, Math.round(parsed.pct))));
      }
    } catch {
      // ignore invalid cache
    }
  };

  const persistDownloadProgress = (received?: number, total?: number, pct?: number) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("probx-model-progress", JSON.stringify({
      received,
      total,
      pct,
      ts: Date.now()
    }));
  };

  useEffect(() => {
    if (verified) return;
    hydrateDownloadProgress();
    let cancelled = false;
    const warmup = async () => {
      try {
        setView('boot');
        startDownloadBoot("Preparing on-device models");
        const mod = await loadAnalyzer();
        mod.registerDownloadProgress((msg, pct, receivedBytes, totalBytes, extra) => {
          if (cancelled || !bootActiveRef.current) return;
          if (msg === null) {
            setDownloadMsg("Download complete");
            setDownloadPct(100);
            setDownloadBytes({ received: totalBytes ?? downloadBytes.total, total: totalBytes ?? downloadBytes.total });
            if (extra?.model || extra?.ocr) setDownloadSegments({ phase: extra?.phase, model: extra?.model, ocr: extra?.ocr });
            finishDownloadBoot('success', "Models cached. We're good to go.");
            setVerified(true);
            setView('input');
            mod.registerDownloadProgress(() => undefined);
            if (typeof window !== "undefined") {
              localStorage.removeItem("probx-model-progress");
            }
            return;
          }
          const derivedPct = typeof totalBytes === 'number' && typeof receivedBytes === 'number' && totalBytes > 0
            ? Math.max(1, Math.round((receivedBytes / totalBytes) * 100))
            : typeof pct === 'number'
            ? Math.max(1, Math.round(pct * 100))
            : Math.max(downloadPct, 5);
          setDownloadMsg(msg);
          setDownloadPct(Math.min(99, derivedPct));
          const aggregateReceived = receivedBytes ?? extra?.model?.received ?? extra?.ocr?.received;
          const aggregateTotal = totalBytes ?? extra?.model?.total ?? extra?.ocr?.total;
          setDownloadBytes((prev) => ({
            received: aggregateReceived ?? prev.received,
            total: aggregateTotal ?? prev.total
          }));
          if (aggregateReceived && aggregateTotal) {
            const connection = (navigator as any)?.connection;
            const downlinkMbps = connection?.downlink && connection.downlink > 0 ? connection.downlink : 2;
            const bytesPerSec = downlinkMbps * 125000;
            const remaining = Math.max(0, aggregateTotal - aggregateReceived);
            const eta = Math.max(3, Math.round(remaining / bytesPerSec));
            setDownloadEta(eta);
          }
          if (extra?.model || extra?.ocr || extra?.phase) {
            setDownloadSegments({ phase: extra?.phase, model: extra?.model, ocr: extra?.ocr });
          }
          setLastDownloadTick(Date.now());
          setDownloadDetail(null);
          setDownloadState('active');
          persistDownloadProgress(receivedBytes, totalBytes, derivedPct);
        });
        await mod.warmupModels();
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setDownloadState('error');
        setDownloadMsg("Model download interrupted");
        setDownloadDetail("Check your connection and retry.");
        setVerified(false);
      }
    };
    warmup();
    return () => {
      cancelled = true;
    };
  }, [verified, downloadAttempt]);

  // Handler for starting the analysis
  const handleAnalyze = async (input: string | File, type: InputType, model: ModelChoice, mode: AnalysisMode) => {
    if (!verified) {
      setView('boot');
      return;
    }
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
    pushAnalyzingNotification({
      title: "ProbX News",
      body: `Analyzing with ${model} • ${mode}. Gathering sources...`,
      target: "processing"
    });

    const friendlyError = "Connection interrupted. Please retry.";
    try {
      let lastErr: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const mod = await loadAnalyzer();
          const { analyzeContent } = mod;
          const result = await analyzeContent(input, type, model, mode);
          setAnalysisData(result);
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
          lastErr = null;
          break;
        } catch (innerErr) {
          lastErr = innerErr;
          // Brief pause before retry
          await new Promise((res) => setTimeout(res, 600));
        }
      }
      if (lastErr) throw lastErr;
    } catch (err: any) {
      console.error(err);
      setError(friendlyError);
      setView('input');
    }
  };

  const handleReset = () => {
    setAnalysisData(null);
    setError(null);
    setView('input');
  };

  if (view === 'boot') {
    return (
      <BootScreen
        downloadState={downloadState}
        downloadMsg={downloadMsg}
        downloadDetail={downloadDetail}
        downloadPct={downloadPct}
        downloadBytes={downloadBytes}
        downloadSegments={downloadSegments}
        downloadEta={downloadEta}
        onRetry={() => {
          setDownloadState('active');
          setDownloadMsg("Reconnecting to model host...");
          setDownloadDetail("Resuming download from cache.");
          setDownloadPct((pct) => Math.max(1, pct));
          setView('boot');
          setDownloadAttempt((attempt) => attempt + 1);
        }}
      />
    );
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

        {view === 'input' && <InputSection onAnalyze={handleAnalyze} disabled={!verified} />}

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
