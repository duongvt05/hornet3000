import { useEffect, useState } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  bgColor: string;
  subText: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  loading?: boolean;
}

function MetricCard({ title, value, icon, color, bgColor, subText, trend, trendValue, loading }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${bgColor}`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
          <h4 className={`mt-2 font-bold text-title-sm ${loading ? "animate-pulse text-gray-300" : color}`}>
            {loading ? "—" : value}
          </h4>
          <p className="text-xs text-gray-400 mt-1">{subText}</p>
        </div>
        {trend && trendValue && !loading && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            trend === "up" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
            trend === "down" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
            "bg-gray-100 text-gray-600"
          }`}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

export default function HornetMetrics() {
  const [stats, setStats] = useState<{
    hornetDetections: number;
    beeDetections: number;
    aiAccuracy: number;
    camerasOnline: number;
    totalCameras: number;
    todayAlerts: number;
    totalDetections: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("http://127.0.0.1:5000/api/stats", {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // API chưa chạy, giữ null để hiển thị placeholder
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const isHornetDanger = stats ? stats.hornetDetections > 0 : false;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
      <MetricCard
        title="Hornet Detected"
        value={stats?.hornetDetections ?? 0}
        icon="🐝"
        color={isHornetDanger ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white"}
        bgColor={isHornetDanger ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800"}
        subText="Hôm nay"
        trend={isHornetDanger ? "down" : "neutral"}
        trendValue={isHornetDanger ? "Cảnh báo!" : "Bình thường"}
        loading={loading}
      />
      <MetricCard
        title="Bee Detected"
        value={stats?.beeDetections ?? 0}
        icon="🍯"
        color="text-amber-600 dark:text-amber-400"
        bgColor="bg-amber-50 dark:bg-amber-900/20"
        subText="Hôm nay"
        trend="neutral"
        trendValue="Hoạt động"
        loading={loading}
      />
      <MetricCard
        title="AI Confidence"
        value={stats ? `${stats.aiAccuracy}%` : "—"}
        icon="🎯"
        color="text-green-600 dark:text-green-400"
        bgColor="bg-green-50 dark:bg-green-900/20"
        subText="Trung bình"
        trend="up"
        trendValue="Tốt"
        loading={loading}
      />
      <MetricCard
        title="Camera Status"
        value={stats ? `${stats.camerasOnline}/${stats.totalCameras}` : "—"}
        icon="📷"
        color="text-blue-600 dark:text-blue-400"
        bgColor="bg-blue-50 dark:bg-blue-900/20"
        subText="Online"
        trend={stats && stats.camerasOnline === stats.totalCameras ? "neutral" : "down"}
        trendValue={stats && stats.camerasOnline === stats.totalCameras ? "OK" : "1 Offline"}
        loading={loading}
      />
    </div>
  );
}
