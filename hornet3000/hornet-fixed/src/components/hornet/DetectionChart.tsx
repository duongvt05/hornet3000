import { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const mockHornet = [12, 19, 8, 25, 31, 14, 19];
const mockBee = [45, 62, 38, 71, 55, 80, 66];

export default function DetectionChart() {
  const [data] = useState({ hornet: mockHornet, bee: mockBee });
  const [activeTab, setActiveTab] = useState<"week" | "month">("week");

  const maxVal = Math.max(...data.hornet, ...data.bee);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Detection History</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Hornet vs Bee detections</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("week")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "week"
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setActiveTab("month")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "month"
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-gray-500">Hornet</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
          <span className="text-xs text-gray-500">Bee</span>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end gap-2 h-48">
        {DAYS.map((day, i) => (
          <div key={day} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end" style={{ height: "160px" }}>
              {/* Hornet bar */}
              <div
                className="flex-1 bg-red-500 rounded-t-sm transition-all duration-500 hover:bg-red-600 relative group"
                style={{ height: `${(data.hornet[i] / maxVal) * 100}%`, minHeight: "4px" }}
                title={`Hornet: ${data.hornet[i]}`}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10">
                  {data.hornet[i]}
                </div>
              </div>
              {/* Bee bar */}
              <div
                className="flex-1 bg-amber-400 rounded-t-sm transition-all duration-500 hover:bg-amber-500 relative group"
                style={{ height: `${(data.bee[i] / maxVal) * 100}%`, minHeight: "4px" }}
                title={`Bee: ${data.bee[i]}`}
              >
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity z-10">
                  {data.bee[i]}
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-400">{day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
