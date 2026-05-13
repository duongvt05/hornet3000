import { useEffect, useState } from "react";

const API = "http://127.0.0.1:5000";
const POLL_MS = 5000; // poll mỗi 5 giây (nhanh hơn 10s cũ)

interface Stats {
  hornetDetections: number;
  beeDetections:    number;
  aiAccuracy:       number;
  camerasOnline:    number;
  totalCameras:     number;
  todayAlerts:      number;
  totalDetections:  number;
}

interface MetricCardProps {
  title:       string;
  value:       string | number;
  icon:        string;
  color:       string;
  bgColor:     string;
  subText:     string;
  trend?:      "up" | "down" | "neutral";
  trendValue?: string;
  loading?:    boolean;
  pulse?:      boolean; // nhấp nháy khi có alert
}

function MetricCard({
  title, value, icon, color, bgColor,
  subText, trend, trendValue, loading, pulse,
}: MetricCardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 transition-all ${
        pulse ? "ring-2 ring-red-400 dark:ring-red-500" : ""
      }`}
    >
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${bgColor}`}>
        <span className={`text-2xl ${pulse ? "animate-bounce" : ""}`}>{icon}</span>
      </div>
      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
          <h4
            className={`mt-2 font-bold text-title-sm ${
              loading ? "animate-pulse text-gray-300 dark:text-gray-600" : color
            }`}
          >
            {loading ? "—" : value}
          </h4>
          <p className="text-xs text-gray-400 mt-1">{subText}</p>
        </div>
        {trend && trendValue && !loading && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend === "up"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : trend === "down"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

export default function HornetMetrics() {
  const [stats, setStats]       = useState<Stats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [prevHornet, setPrevHornet] = useState(0);
  const [newDetection, setNewDetection] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/api/stats`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) throw new Error("not ok");
        const data: Stats = await res.json();

        // Flash nếu hornet count tăng
        if (data.hornetDetections > prevHornet && prevHornet > 0) {
          setNewDetection(true);
          setTimeout(() => setNewDetection(false), 3000);
        }
        setPrevHornet(data.hornetDetections);
        setStats(data);
        setApiOnline(true);
      } catch {
        setApiOnline(false);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const id = setInterval(fetchStats, POLL_MS);
    return () => clearInterval(id);
  }, [prevHornet]);

  const isHornetDanger = (stats?.hornetDetections ?? 0) > 0;
  const allCamsOk =
    stats != null && stats.camerasOnline === stats.totalCameras;

  return (
    <div className="space-y-2">
      {/* API status bar */}
      {!apiOnline && !loading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
          Flask API offline — chạy: <code className="ml-1 font-mono">python api_server.py</code>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
        <MetricCard
          title="Hornets Detected"
          value={stats?.hornetDetections ?? 0}
          icon="🐝"
          color={isHornetDanger ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white"}
          bgColor={isHornetDanger ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800"}
          subText={`Today: ${stats?.todayAlerts ?? 0}`}
          trend={isHornetDanger ? "down" : "neutral"}
          trendValue={isHornetDanger ? "Alert!" : "Normal"}
          loading={loading}
          pulse={newDetection}
        />
        <MetricCard
          title="Total Detections"
          value={stats?.totalDetections ?? 0}
          icon="🍯"
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-900/20"
          subText="All time"
          trend="neutral"
          trendValue="Active"
          loading={loading}
        />
        <MetricCard
          title="AI Confidence"
          value={stats ? `${stats.aiAccuracy}%` : "—"}
          icon="🎯"
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-50 dark:bg-green-900/20"
          subText="Average"
          trend="up"
          trendValue="Good"
          loading={loading}
        />
        <MetricCard
          title="Camera Status"
          value={stats ? `${stats.camerasOnline}/${stats.totalCameras}` : "—"}
          icon="📷"
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
          subText="Online"
          trend={allCamsOk ? "neutral" : "down"}
          trendValue={allCamsOk ? "All OK" : "Check cams"}
          loading={loading}
        />
      </div>
    </div>
  );
}