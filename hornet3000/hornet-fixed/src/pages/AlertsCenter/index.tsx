import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";

interface Alert {
  id: number;
  type: "hornet" | "bee" | "system";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  camera: string;
  location: string;
  timestamp: string;
  status: "new" | "acknowledged" | "resolved";
  confidence?: number;
}

const mockAlerts: Alert[] = [
  { id: 1, type: "hornet", severity: "critical", title: "Asian Hornet Detected", description: "Multiple Asian hornets detected near hive entrance. Immediate action required.", camera: "Camera 1", location: "North Hive", timestamp: "2025-05-10 14:32:01", status: "new", confidence: 98.2 },
  { id: 2, type: "hornet", severity: "high", title: "Hornet Cluster Spotted", description: "Small group of hornets (3-5) observed circling the hive.", camera: "Camera 3", location: "South Entrance", timestamp: "2025-05-10 14:15:22", status: "new", confidence: 91.3 },
  { id: 3, type: "bee", severity: "medium", title: "High Bee Activity", description: "Unusual spike in bee activity detected, possible swarming behavior.", camera: "Camera 2", location: "East Field", timestamp: "2025-05-10 13:55:33", status: "acknowledged", confidence: 87.6 },
  { id: 4, type: "system", severity: "medium", title: "Camera 4 Offline", description: "Camera 4 at West Gate has lost connection. Check network and power.", camera: "Camera 4", location: "West Gate", timestamp: "2025-05-10 12:30:00", status: "acknowledged" },
  { id: 5, type: "hornet", severity: "high", title: "Hornet Entry Attempt", description: "Hornet attempted to enter hive through top vent. Repelled by guard bees.", camera: "Camera 1", location: "North Hive", timestamp: "2025-05-10 11:22:14", status: "resolved", confidence: 95.8 },
  { id: 6, type: "bee", severity: "low", title: "Swarm Movement", description: "Small swarm movement detected toward neighboring tree.", camera: "Camera 2", location: "East Field", timestamp: "2025-05-10 10:05:00", status: "resolved", confidence: 82.1 },
];

export default function AlertsCenter() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filter, setFilter] = useState<"all" | "new" | "acknowledged" | "resolved">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "hornet" | "bee" | "system">("all");

  const filtered = alerts.filter(a => {
    if (filter !== "all" && a.status !== filter) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    return true;
  });

  const updateStatus = (id: number, status: Alert["status"]) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const severityConfig = {
    critical: { badge: "bg-red-600 text-white", border: "border-l-red-600", bg: "bg-red-50 dark:bg-red-900/10" },
    high: { badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", border: "border-l-red-400", bg: "" },
    medium: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", border: "border-l-amber-400", bg: "" },
    low: { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", border: "border-l-blue-400", bg: "" },
  };

  const criticalCount = alerts.filter(a => a.severity === "critical" && a.status === "new").length;

  return (
    <>
      <PageMeta title="Alerts - Hornet AI" description="Alert management center" />
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Alert Center</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track detection alerts</p>
          </div>
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl animate-pulse">
              <span>⚠</span>
              <span className="font-semibold text-sm">{criticalCount} Critical Alert{criticalCount > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "New", value: alerts.filter(a => a.status === "new").length, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
            { label: "Acknowledged", value: alerts.filter(a => a.status === "acknowledged").length, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
            { label: "Resolved", value: alerts.filter(a => a.status === "resolved").length, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
            { label: "Total Today", value: alerts.length, color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-50 dark:bg-gray-800" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(["all", "new", "acknowledged", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === f ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm" : "text-gray-500"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(["all", "hornet", "bee", "system"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                typeFilter === f ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm" : "text-gray-500"
              }`}
            >
              {f === "hornet" ? "🐝 Hornet" : f === "bee" ? "🍯 Bee" : f === "system" ? "⚙ System" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Cards */}
      <div className="flex flex-col gap-3">
        {filtered.map((alert) => {
          const config = severityConfig[alert.severity];
          return (
            <div
              key={alert.id}
              className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] border-l-4 ${config.border} p-4 md:p-5 ${alert.severity === "critical" && alert.status === "new" ? "ring-1 ring-red-300 dark:ring-red-800" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-lg">
                      {alert.type === "hornet" ? "🐝" : alert.type === "bee" ? "🍯" : "⚙️"}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-white text-sm">{alert.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    {alert.confidence && (
                      <span className="text-xs text-gray-400">AI: {alert.confidence}%</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{alert.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    <span>📷 {alert.camera}</span>
                    <span>📍 {alert.location}</span>
                    <span>🕐 {alert.timestamp.split(" ")[1]}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    alert.status === "new" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                    alert.status === "acknowledged" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}>
                    {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                  </span>
                  
                  <div className="flex gap-1">
                    {alert.status === "new" && (
                      <button
                        onClick={() => updateStatus(alert.id, "acknowledged")}
                        className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-200 transition-colors"
                      >
                        Acknowledge
                      </button>
                    )}
                    {alert.status === "acknowledged" && (
                      <button
                        onClick={() => updateStatus(alert.id, "resolved")}
                        className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-sm">No alerts matching your filter</p>
          </div>
        )}
      </div>
    </>
  );
}
