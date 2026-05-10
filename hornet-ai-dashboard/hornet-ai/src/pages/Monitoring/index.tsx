import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";

interface CameraFeed {
  id: number;
  name: string;
  location: string;
  status: "online" | "offline";
  detections: number;
  lastSeen: string;
}

const cameras: CameraFeed[] = [
  { id: 1, name: "Camera 1", location: "North Hive", status: "online", detections: 42, lastSeen: "Live" },
  { id: 2, name: "Camera 2", location: "East Field", status: "online", detections: 28, lastSeen: "Live" },
  { id: 3, name: "Camera 3", location: "South Entrance", status: "online", detections: 15, lastSeen: "Live" },
  { id: 4, name: "Camera 4", location: "West Gate", status: "offline", detections: 0, lastSeen: "2h ago" },
];

export default function Monitoring() {
  const [selectedCam, setSelectedCam] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [frameError, setFrameError] = useState(false);
  const [lastDetection, setLastDetection] = useState<string | null>(null);

  const API_BASE = "http://localhost:5000";

  useEffect(() => {
    setIsLoading(true);
    setFrameError(false);
  }, [selectedCam]);

  useEffect(() => {
    const fetchLatestDetection = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/detections?limit=1&camera=${selectedCam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setLastDetection(data[0].species);
        }
      } catch {}
    };
    fetchLatestDetection();
    const interval = setInterval(fetchLatestDetection, 5000);
    return () => clearInterval(interval);
  }, [selectedCam]);

  return (
    <>
      <PageMeta title="Monitoring - Hornet AI" description="Live camera monitoring" />
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Live Monitoring</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time camera feeds with YOLOv8 detection</p>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Main Camera Feed */}
        <div className="col-span-12 xl:col-span-8">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="font-semibold text-gray-800 dark:text-white">
                  {cameras.find(c => c.id === selectedCam)?.name} — {cameras.find(c => c.id === selectedCam)?.location}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {lastDetection && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium animate-pulse ${
                    lastDetection.includes("Hornet")
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    ⚠ {lastDetection} detected
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-mono">LIVE</span>
              </div>
            </div>

            {/* Camera Frame */}
            <div className="relative bg-gray-900" style={{ paddingBottom: "56.25%" }}>
              {frameError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="text-5xl">📷</div>
                  <p className="text-gray-400 text-sm">Flask API not running</p>
                  <p className="text-gray-500 text-xs">Start: python api_server.py</p>
                  <code className="text-green-400 text-xs bg-gray-800 px-3 py-1 rounded">
                    GET http://localhost:5000/latest_frame
                  </code>
                </div>
              ) : (
                <>
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  <img
                    src={`${API_BASE}/latest_frame?cam=${selectedCam}&t=${Date.now()}`}
                    alt="Live camera feed"
                    className="absolute inset-0 w-full h-full object-contain"
                    onLoad={() => setIsLoading(false)}
                    onError={() => { setIsLoading(false); setFrameError(true); }}
                  />
                </>
              )}
            </div>

            {/* Controls Bar */}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                📸 Screenshot
              </button>
              <button
                onClick={() => { setFrameError(false); setIsLoading(true); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                🔄 Refresh
              </button>
              <span className="ml-auto text-xs text-gray-400 font-mono">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Camera List */}
        <div className="col-span-12 xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Camera Feeds</h3>
            <div className="flex flex-col gap-3">
              {cameras.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => cam.status === "online" && setSelectedCam(cam.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedCam === cam.id
                      ? "border-brand-300 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-700"
                      : cam.status === "offline"
                      ? "border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed"
                      : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-gray-800 dark:text-white">{cam.name}</span>
                    <span className={`flex items-center gap-1 text-xs ${cam.status === "online" ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cam.status === "online" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></span>
                      {cam.status === "online" ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{cam.location}</span>
                    <span className="text-xs text-gray-400">{cam.detections} detections today</span>
                  </div>

                  {/* Thumbnail placeholder */}
                  <div className="mt-2 h-16 bg-gray-900 rounded-lg overflow-hidden relative">
                    {cam.status === "online" ? (
                      <img
                        src={`${API_BASE}/latest_frame?cam=${cam.id}&thumb=1`}
                        alt={cam.name}
                        className="w-full h-full object-cover opacity-80"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = "none";
                        }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 flex items-center justify-center ${cam.status === "offline" ? "" : "opacity-0"}`}>
                      <span className="text-gray-500 text-xs">No signal</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detection Stats Bar */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Today's Detection Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Detections", value: "85", icon: "🔍" },
                { label: "Hornet Alerts", value: "7", icon: "⚠️", danger: true },
                { label: "Avg Confidence", value: "94.2%", icon: "🎯" },
                { label: "Active Cameras", value: "3/4", icon: "📷" },
              ].map((stat) => (
                <div key={stat.label} className={`p-4 rounded-xl ${stat.danger ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800/50"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{stat.icon}</span>
                    <span className="text-xs text-gray-500">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${stat.danger ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white"}`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
