import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";

const API = "http://127.0.0.1:5000";
const POLL_MS = 4000; // poll mỗi 4 giây

interface AlertItem {
  id: string;
  type: "hornet" | "bee" | "system";
  severity: "high" | "medium" | "low";
  message: string;
  camera: string;
  cameraName: string;
  time: string;
  timestamp: string;
  confidence?: number;
  species?: string;
  imagePath?: string;
}

// Beep âm thanh khi có alert mới
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

// Chuyển đổi từ API response sang AlertItem
function mapApiAlert(raw: any, idx: number): AlertItem {
  const conf = typeof raw.confidence === "number" ? raw.confidence : parseFloat(raw.confidence) || 0;
  // API trả confidence đã là %, ví dụ 83.0
  const confPct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf);
  const species = raw.species ?? raw.class ?? raw.Class ?? "unknown";
  const sev: "high" | "medium" | "low" =
    raw.severity === "high" || confPct >= 75 ? "high" :
    raw.severity === "medium" || confPct >= 50 ? "medium" : "low";
  const ts: string = raw.timestamp ?? raw.time ?? "";
  const timeOnly = ts.split(" ")[1]?.slice(0, 8) ?? ts.slice(0, 8) ?? "—";

  return {
    id:         raw.id ?? `alert_${idx}`,
    type:       "hornet",
    severity:   sev,
    message:    `⚠ ${species.toUpperCase()} detected (${confPct}%)`,
    camera:     (raw.camera ?? "cam1").toUpperCase(),
    cameraName: raw.cameraName ?? raw.camera ?? "Camera",
    time:       timeOnly,
    timestamp:  ts,
    confidence: confPct,
    species,
    imagePath:  raw.imagePath ?? raw.Image_Path ?? "",
  };
}

const severityConfig = {
  high: {
    bg:     "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    dot:    "bg-red-500",
    text:   "text-red-700 dark:text-red-400",
  },
  medium: {
    bg:     "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    dot:    "bg-amber-500",
    text:   "text-amber-700 dark:text-amber-400",
  },
  low: {
    bg:     "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    dot:    "bg-blue-400",
    text:   "text-blue-700 dark:text-blue-400",
  },
};

export default function AlertPanel() {
  const [alerts, setAlerts]     = useState<AlertItem[]>([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [newAlert, setNewAlert] = useState(false);
  const lastIdRef = useRef<string>("");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API}/api/alerts?limit=10`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) throw new Error("not ok");

        const data = await res.json();

        // FIX: API trả { alerts: [...], total: N } — không phải array trực tiếp
        const rawList: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data.alerts)
          ? data.alerts
          : [];

        if (rawList.length === 0) {
          setApiOnline(true);
          return;
        }

        const mapped = rawList.map(mapApiAlert);
        setAlerts(mapped);
        setApiOnline(true);

        // Phát hiện alert mới → beep + flash
        const newestId = mapped[0]?.id ?? "";
        if (newestId && newestId !== lastIdRef.current) {
          if (lastIdRef.current !== "") {
            playBeep();
            setNewAlert(true);
            setTimeout(() => setNewAlert(false), 3000);
          }
          lastIdRef.current = newestId;
        }
      } catch {
        setApiOnline(false);
      }
    };

    fetchAlerts();
    const id = setInterval(fetchAlerts, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Recent Alerts
        </h3>
        <div className="flex items-center gap-2">
          {!apiOnline && (
            <span className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
              offline
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
              newAlert
                ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-100"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            }`}
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            {newAlert ? "NEW!" : "Live"}
          </span>
        </div>
      </div>

      {/* Alert list */}
      <div className="flex flex-col gap-3 overflow-y-auto max-h-72">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">🐝</div>
            <p className="text-sm">
              {apiOnline ? "Chưa phát hiện hornet nào" : "Đang kết nối API..."}
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const cfg = severityConfig[alert.severity];
            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border transition-all ${cfg.bg} ${cfg.border}`}
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${cfg.text} truncate`}>
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400">{alert.camera}</span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-xs text-gray-400">{alert.time}</span>
                      {alert.confidence !== undefined && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-xs text-gray-400">{alert.confidence}%</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Thumbnail nếu có ảnh */}
                  {alert.imagePath && (
                    <img
                      src={`${API}/api/history/image?path=${encodeURIComponent(alert.imagePath)}`}
                      alt=""
                      className="w-10 h-8 object-cover rounded flex-shrink-0 border border-gray-200 dark:border-gray-700"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <Link
          to="/alerts-center"
          className="text-sm text-brand-500 hover:text-brand-600 font-medium"
        >
          View all alerts →
        </Link>
        <span className="text-xs text-gray-400">
          {apiOnline ? `${alerts.length} records` : "API offline"}
        </span>
      </div>
    </div>
  );
}
