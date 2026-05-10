import { useEffect, useState } from "react";

interface AlertItem {
  id: number;
  type: "hornet" | "bee" | "system";
  message: string;
  camera: string;
  time: string;
  severity: "high" | "medium" | "low";
}

const mockAlerts: AlertItem[] = [
  { id: 1, type: "hornet", message: "Asian Hornet detected!", camera: "Cam 1", time: "2 min ago", severity: "high" },
  { id: 2, type: "hornet", message: "Hornet cluster spotted", camera: "Cam 3", time: "15 min ago", severity: "high" },
  { id: 3, type: "bee", message: "High bee activity", camera: "Cam 2", time: "32 min ago", severity: "medium" },
  { id: 4, type: "system", message: "Camera 4 offline", camera: "Cam 4", time: "1h ago", severity: "medium" },
  { id: 5, type: "bee", message: "Swarm movement detected", camera: "Cam 1", time: "2h ago", severity: "low" },
];

export default function AlertPanel() {
  const [alerts, setAlerts] = useState<AlertItem[]>(mockAlerts);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/alerts");
        if (res.ok) {
          const data = await res.json();
          setAlerts(data);
        }
      } catch {}
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  const severityConfig = {
    high: { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
    medium: { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
    low: { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-200 dark:border-blue-800", dot: "bg-blue-400", text: "text-blue-700 dark:text-blue-400" },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Alerts</h3>
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
          Live
        </span>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto max-h-72">
        {alerts.map((alert) => {
          const config = severityConfig[alert.severity];
          return (
            <div key={alert.id} className={`p-3 rounded-xl border ${config.bg} ${config.border}`}>
              <div className="flex items-start gap-2">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${config.dot}`}></div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${config.text}`}>{alert.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{alert.camera}</span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-xs text-gray-400">{alert.time}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <a href="/alerts-center" className="text-sm text-brand-500 hover:text-brand-600 font-medium">
          View all alerts →
        </a>
      </div>
    </div>
  );
}
