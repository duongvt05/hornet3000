import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";

const weeklyData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  hornet: [12, 19, 8, 25, 31, 14, 19],
  bee: [45, 62, 38, 71, 55, 80, 66],
};

const speciesData = [
  { name: "Asian Hornet", count: 128, pct: 23, color: "bg-red-500" },
  { name: "Honey Bee", count: 342, pct: 62, color: "bg-amber-400" },
  { name: "Bumble Bee", count: 78, pct: 14, color: "bg-yellow-300" },
  { name: "Other", count: 5, pct: 1, color: "bg-gray-400" },
];

const hourlyData = [2, 1, 0, 0, 0, 3, 8, 15, 22, 18, 12, 9, 14, 20, 25, 31, 28, 19, 12, 8, 5, 3, 2, 1];

export default function Analytics() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const maxVal = Math.max(...weeklyData.hornet, ...weeklyData.bee);
  const maxHourly = Math.max(...hourlyData);

  return (
    <>
      <PageMeta title="Analytics - Hornet AI" description="Detection analytics and trends" />
      
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Detection patterns and AI performance metrics</p>
        </div>
        <div className="flex gap-2">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Summary Cards */}
        <div className="col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Detections", value: "553", change: "+18%", positive: true },
            { label: "Hornet Events", value: "128", change: "+32%", positive: false },
            { label: "AI Accuracy", value: "96.4%", change: "+0.3%", positive: true },
            { label: "Alerts Sent", value: "47", change: "-5%", positive: true },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-xs text-gray-500 mb-2">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stat.value}</p>
              <span className={`text-xs font-medium ${stat.positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {stat.change} this week
              </span>
            </div>
          ))}
        </div>

        {/* Bar Chart - Weekly */}
        <div className="col-span-12 xl:col-span-7 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Weekly Detection Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Hornet vs Bee per day</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-500">Hornet</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span className="text-xs text-gray-500">Bee</span>
              </div>
            </div>
          </div>
          <div className="flex items-end gap-3 h-52">
            {weeklyData.labels.map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-1 items-end" style={{ height: "180px" }}>
                  <div
                    className="flex-1 bg-red-500 hover:bg-red-600 rounded-t transition-all duration-300 relative group cursor-pointer"
                    style={{ height: `${(weeklyData.hornet[i] / maxVal) * 100}%`, minHeight: "4px" }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                      {weeklyData.hornet[i]}
                    </div>
                  </div>
                  <div
                    className="flex-1 bg-amber-400 hover:bg-amber-500 rounded-t transition-all duration-300 relative group cursor-pointer"
                    style={{ height: `${(weeklyData.bee[i] / maxVal) * 100}%`, minHeight: "4px" }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                      {weeklyData.bee[i]}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Species Distribution */}
        <div className="col-span-12 xl:col-span-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Species Distribution</h3>
          <p className="text-xs text-gray-400 mb-6">This week's detection breakdown</p>
          <div className="flex flex-col gap-4">
            {speciesData.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{s.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{s.count}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-white w-8 text-right">{s.pct}%</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all duration-700`} style={{ width: `${s.pct}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          {/* Donut-style summary */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">⚠ Threat Level</p>
                <p className="text-lg font-bold text-red-700 dark:text-red-300">MEDIUM</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1">✓ Hive Health</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">GOOD</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Heatmap */}
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-1">Hourly Activity Pattern</h3>
          <p className="text-xs text-gray-400 mb-5">Average detections per hour (24h)</p>
          <div className="flex items-end gap-1.5 h-32">
            {hourlyData.map((val, hour) => (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t transition-all duration-300 group relative cursor-pointer"
                  style={{
                    height: `${Math.max((val / maxHourly) * 96, 3)}px`,
                    backgroundColor: val > 20 ? "#ef4444" : val > 10 ? "#f59e0b" : val > 5 ? "#fcd34d" : "#e5e7eb",
                  }}
                  title={`${hour}:00 — ${val} detections`}
                >
                  {val > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                      {val}
                    </div>
                  )}
                </div>
                {hour % 4 === 0 && <span className="text-xs text-gray-400">{hour}h</span>}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-500"></div><span className="text-xs text-gray-500">High (&gt;20)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-400"></div><span className="text-xs text-gray-500">Medium (10-20)</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-yellow-200"></div><span className="text-xs text-gray-500">Low (&lt;10)</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
