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

type BootScreenProps = {
  status: 'connecting' | 'error';
  message: string | null;
  detail?: string | null;
  onRetry: () => void;
};

const BootScreen: React.FC<BootScreenProps> = ({ status, message, detail, onRetry }) => {
  const [step, setStep] = useState(0);
  const steps = [
    "setting up server",
    "Looking for news sources",
    "Getting things ready",
    "Almost there"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  const showRetry = status === 'error';

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
          <p className="text-lg font-semibold">Launching ProbX</p>
          <p className="text-sm text-slate-300">{message || steps[step]}</p>
          {detail && <p className="text-xs text-slate-400">{detail}</p>}
        </div>
        {showRetry && (
          <button
            className="mt-2 text-sm font-semibold uppercase tracking-widest bg-white/10 text-white py-2 px-4 rounded-lg border border-white/20 hover:bg-white/15 transition"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
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
  const [connectStatus, setConnectStatus] = useState<'connecting' | 'error'>('connecting');
  const [connectMsg, setConnectMsg] = useState<string | null>("Talking to the cloud server...");
  const [connectDetail, setConnectDetail] = useState<string | null>(null);
  const [connectAttempt, setConnectAttempt] = useState<number>(0);
  const [verified, setVerified] = useState<boolean>(false);
  const [notificationsReady, setNotificationsReady] = useState<boolean>(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const analyzingNotificationTag = useRef<string>("probx-analyzing");
  const notificationIdRef = useRef<number>(1);
  const PROGRESS_CHANNEL = "probx-progress";
  const ALERT_CHANNEL = "probx-alerts";
  const offlineNotificationId = useRef<number | null>(null);
  const slowTimerRef = useRef<number | null>(null);
  const modelLabels: Record<ModelChoice, string> = {
    "gemini-1.5-flash": "Gemini fact-checker",
    "openrouter-llama": "Llama (OpenRouter)"
  };
  const modeLabels: Record<AnalysisMode, string> = {
    fast: "Quick check",
    analyze: "Balanced check",
    "deep-analytic": "Thorough check"
  };

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

  useEffect(() => {
    const stored = localStorage.getItem("probx-theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      document.documentElement.classList.toggle("theme-dark", stored === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("probx-theme", next);
    document.documentElement.classList.toggle("theme-dark", next === "dark");
  };

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    let removeListener: (() => void) | undefined;
    const initNotifications = async () => {
      const platform = (window as any)?.Capacitor?.getPlatform?.();
      if (platform === 'web') {
        return;
      }
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
          if (offlineNotificationId.current && event.notification?.id === offlineNotificationId.current) {
            LocalNotifications.cancel({ notifications: [{ id: offlineNotificationId.current }] }).catch(() => undefined);
            offlineNotificationId.current = null;
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

  useEffect(() => {
    const onOffline = () => {
      scheduleLocalNotification({
        title: "Internet disconnected",
        body: "Reconnect to continue analysis.",
        channel: ALERT_CHANNEL,
        sound: "default",
        persist: true,
        id: 99991
      }).then(() => {
        offlineNotificationId.current = 99991;
      });
    };
    const onOnline = () => {
      if (offlineNotificationId.current) {
        LocalNotifications.cancel({ notifications: [{ id: offlineNotificationId.current }] }).catch(() => undefined);
        offlineNotificationId.current = null;
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  const scheduleLocalNotification = async (opts: { title: string; body: string; channel?: string; tag?: string; sound?: string | undefined; target?: string; id?: number; persist?: boolean }) => {
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
          sound: opts.sound,
          smallIcon: "ic_launcher",
          iconColor: "#0ea5e9",
          extra: { target: opts.target }
        }]
      });
      if (!opts.persist) {
        window.setTimeout(() => {
          LocalNotifications.cancel({ notifications: [{ id: nextId }] }).catch(() => undefined);
        }, 6000);
      }
    } catch (err) {
      console.warn("Notification send skipped", err);
    }
  };

  const pushAnalyzingNotification = (opts: { title: string; body: string; tag?: string; target?: string; alert?: boolean; persist?: boolean }) => {
    scheduleLocalNotification({
      title: opts.title,
      body: opts.body,
      tag: opts.tag || analyzingNotificationTag.current,
      target: opts.target,
      channel: opts.alert ? ALERT_CHANNEL : PROGRESS_CHANNEL,
      sound: opts.alert ? "default" : null,
      persist: opts.persist
    });
  };

  useEffect(() => {
    if (verified) return;
    let cancelled = false;
    const warmup = async () => {
      try {
        setView('boot');
        setConnectStatus('connecting');
        const tips = [
          "Tip: Paste a headline or a valid news link for best results.",
          "Tip: Upload a screenshot or image with clear ext to fact-check images.",
          "Tip: We cross-check news and social chatter to spot contradictions.",
          "Tip: Use clear sentences—who, what, where, when.",
          "Tip: Try a source link for faster, stronger evidence."
        ];
        setConnectMsg(tips[Math.floor(Math.random() * tips.length)]);
        setConnectDetail(null);
        // Skip API login check: just wait briefly for aesthetic boot
        const bootTips = [
          "Tip: Paste the full article link for stronger evidence.",
          "Tip: Watch for sensational headlines—verify before sharing.",
          "Tip: Cross-check with at least two reputable outlets.",
          "Tip: Screenshots of text are okay—clear images work best.",
          "Tip: Trust outlets with transparent sourcing and corrections.",
          "Tip: Look for author names and publication dates."
        ];
        const tipInterval = setInterval(() => {
          const next = bootTips[Math.floor(Math.random() * bootTips.length)];
          setConnectMsg(next);
        }, 1000);
        await new Promise((res) => setTimeout(res, 4000));
        clearInterval(tipInterval);
        if (!cancelled) {
          setVerified(true);
          setView('input');
        }
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setConnectStatus('error');
        const msg = err instanceof Error ? err.message : "";
        setConnectMsg("We couldn't reach the checker.");
        setConnectDetail(
          msg.includes("token")
            ? "Required Hugging Face Access Token with Read + Model Inference API permissions."
            : "Please check your connection and try again in a moment."
        );
        setVerified(false);
      }
    };
    warmup();
    return () => {
      cancelled = true;
    };
  }, [verified, connectAttempt]);

  // Handler for starting the analysis
  const handleAnalyze = async (input: string | File, type: InputType, model: ModelChoice, mode: AnalysisMode) => {
    if (!verified) {
      setView('boot');
      return;
    }
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
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
      body: `${modelLabels[model]} • ${modeLabels[mode]}. Gathering sources...`,
      target: "processing"
    });

    slowTimerRef.current = window.setTimeout(() => {
      scheduleLocalNotification({
        title: "Still working...",
        body: "Analysis is taking a bit longer. Hang tight.",
        channel: PROGRESS_CHANNEL,
        sound: undefined,
        persist: false,
        id: 99992
      });
    }, 5000);

    const friendlyError = "We couldn't finish the check. Please try again.";
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
            body: `${modelLabels[model]} • ${modeLabels[mode]} • ${result.sources.length} sources found`,
            target: "result",
            alert: true,
            persist: true
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
      const msg = typeof err?.message === "string" ? err.message : "";
      const computedError =
        msg.includes("Image analysis needs the Gemini")
          ? "Add your Gemini API key in .env (VITE_GEMINI_API_KEY) to analyze images."
          : msg.includes("Missing Gemini or OpenRouter")
          ? "Add a Gemini or OpenRouter API key in .env and restart, then retry."
          : msg.includes("Gemini error")
          ? "We couldn’t reach Gemini right now. Please try again or switch model."
          : msg.includes("OpenRouter error")
          ? "We couldn’t reach OpenRouter right now. Please try again or switch model."
          : msg.includes("API key")
          ? "An API key is missing. Please add it and restart."
          : "We’re having trouble finishing the check. Please try again.";
      setError(computedError);
      setView('input');
    }
    if (slowTimerRef.current) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
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
        status={connectStatus}
        message={connectMsg}
        detail={connectDetail}
        onRetry={() => {
          setConnectStatus('connecting');
          setConnectMsg("Trying again...");
          setConnectDetail(null);
          setView('boot');
          setConnectAttempt((attempt) => attempt + 1);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative">
      {/* Sticky Header */}
      <Header theme={theme} onToggleTheme={toggleTheme} />

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 pb-12 w-full max-w-3xl mx-auto z-10">

        {error && (
          <div className="w-full bg-orange-50 border-l-4 border-orange-500 text-orange-800 p-4 mb-6 rounded shadow-sm" role="alert">
            <p className="font-bold">Heads up</p>
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
