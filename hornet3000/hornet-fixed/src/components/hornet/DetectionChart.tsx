import { useState, useEffect } from "react";

const API = "http://127.0.0.1:5000";
const POLL_MS = 15000;

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}h`);

interface AnalyticsData {
  hourly:    { hour: string; count: number }[];
  weekly:    { day: string; count: number }[];
  byCamera:  { camera: string; name: string; count: number }[];
  bySpecies: { species: string; count: number }[];
}

export default function DetectionChart() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<"week" | "hour">("week");
  const [loading, setLoading]     = useState(true);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API}/api/analytics`, {
          signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) throw new Error("not ok");
        const data: AnalyticsData = await res.json();
        setAnalytics(data);
        setApiOnline(true);
      } catch {
        setApiOnline(false);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const id = setInterval(fetchAnalytics, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Xây dựng dữ liệu bar chart theo tab
  const chartData: { label: string; hornet: number; bee: number }[] = (() => {
    if (!analytics) return [];

    if (activeTab === "week") {
      // weekly: day "0"=Mon … "6"=Sun
      return DAY_LABELS.map((label, i) => {
        const row = analytics.weekly.find((w) => w.day === String(i));
        // phân tách hornet vs bee không có trong analytics weekly
        // → dùng bySpecies ratio để ước lượng
        const total = row?.count ?? 0;
        const hornets = analytics.bySpecies
          .filter((s) => ["vcra", "vespsp", "hornet", "vespa"].includes(s.species.toLowerCase()))
          .reduce((acc, s) => acc + s.count, 0);
        const bees = analytics.bySpecies
          .filter((s) => s.species.toLowerCase().includes("bee"))
          .reduce((acc, s) => acc + s.count, 0);
        const totalAll = hornets + bees || 1;
        return {
          label,
          hornet: Math.round((total * hornets) / totalAll),
          bee:    Math.round((total * bees) / totalAll),
        };
      });
    } else {
      // hourly — nhóm thành 8 khung 3-giờ để chart không quá dày
      const groups: { label: string; hornet: number; bee: number }[] = [];
      for (let g = 0; g < 8; g++) {
        const start = g * 3;
        const end = start + 2;
        const total = analytics.hourly
          .filter((h) => {
            const hr = parseInt(h.hour);
            return hr >= start && hr <= end;
          })
          .reduce((acc, h) => acc + h.count, 0);
        const hornets = analytics.bySpecies
          .filter((s) => ["vcra", "vespsp", "hornet", "vespa"].includes(s.species.toLowerCase()))
          .reduce((acc, s) => acc + s.count, 0);
        const bees = analytics.bySpecies
          .filter((s) => s.species.toLowerCase().includes("bee"))
          .reduce((acc, s) => acc + s.count, 0);
        const totalAll = hornets + bees || 1;
        groups.push({
          label: `${start}-${end}h`,
          hornet: Math.round((total * hornets) / totalAll),
          bee:    Math.round((total * bees) / totalAll),
        });
      }
      return groups;
    }
  })();

  const maxVal = Math.max(...chartData.map((d) => Math.max(d.hornet, d.bee)), 1);

  // Top species
  const topSpecies = analytics?.bySpecies.slice(0, 4) ?? [];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Detection History
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {apiOnline ? "Dữ liệu thật từ log.csv" : "Đang kết nối API..."}
          </p>
        </div>
        <div className="flex gap-2">
          {["week", "hour"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "week" | "hour")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {tab === "week" ? "Week" : "Hourly"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-500">Hornet</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-xs text-gray-500">Bee</span>
        </div>
      </div>

      {/* Bar Chart */}
      {loading ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
            Đang tải...
          </div>
        </div>
      ) : chartData.every((d) => d.hornet === 0 && d.bee === 0) ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm flex-col gap-2">
          <span className="text-2xl">📊</span>
          {apiOnline ? "Chưa có dữ liệu detection" : "API offline"}
        </div>
      ) : (
        <div className="flex items-end gap-2 h-48">
          {chartData.map((d) => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end" style={{ height: "160px" }}>
                {/* Hornet bar */}
                <div
                  className="flex-1 bg-red-500 rounded-t-sm transition-all duration-500 hover:bg-red-600 relative group cursor-pointer"
                  style={{
                    height: `${(d.hornet / maxVal) * 100}%`,
                    minHeight: d.hornet > 0 ? "4px" : "0",
                  }}
                >
                  {d.hornet > 0 && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10">
                      {d.hornet}
                    </div>
                  )}
                </div>
                {/* Bee bar */}
                <div
                  className="flex-1 bg-amber-400 rounded-t-sm transition-all duration-500 hover:bg-amber-500 relative group cursor-pointer"
                  style={{
                    height: `${(d.bee / maxVal) * 100}%`,
                    minHeight: d.bee > 0 ? "4px" : "0",
                  }}
                >
                  {d.bee > 0 && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10">
                      {d.bee}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400 truncate w-full text-center">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* By-species breakdown */}
      {topSpecies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Top Species
          </p>
          <div className="flex flex-wrap gap-2">
            {topSpecies.map((s) => (
              <span
                key={s.species}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ["vcra", "vespsp", "hornet", "vespa"].includes(s.species.toLowerCase())
                      ? "bg-red-500"
                      : "bg-amber-400"
                  }`}
                />
                {s.species}: {s.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}