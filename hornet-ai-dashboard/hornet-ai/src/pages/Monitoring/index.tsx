import { useEffect, useState, useRef, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";

const API_BASE = "http://127.0.0.1:5000";

interface Detection {
  id: number;
  species: string;
  confidence: number;
  camera: string;
  timestamp: string;
  action: string;
}

interface StatBox {
  label: string;
  value: string | number;
  icon: string;
  danger?: boolean;
}

export default function Monitoring() {
  const [streamOk, setStreamOk] = useState<boolean | null>(null); // null = loading, true = ok, false = error
  const [lastDetections, setLastDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState<{ hornetDetections: number; beeDetections: number; aiAccuracy: number; totalDetections: number } | null>(null);
  const [frameTs, setFrameTs] = useState(Date.now());
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const imgRef = useRef<HTMLImageElement>(null);
  const streamLoadedRef = useRef(false);

  // Refresh frame timestamp mỗi 2 giây (chỉ với /latest_frame nếu không phải MJPEG)
  useEffect(() => {
    const t = setInterval(() => setFrameTs(Date.now()), 2000);
    return () => clearInterval(t);
  }, []);

  // Check API status
  const checkApi = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stats`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setApiStatus("online");
        const data = await res.json();
        setStats(data);
      } else {
        setApiStatus("offline");
      }
    } catch {
      setApiStatus("offline");
    }
  }, []);

  useEffect(() => {
    checkApi();
    const t = setInterval(checkApi, 10000);
    return () => clearInterval(t);
  }, [checkApi]);

  // Fetch recent detections
  useEffect(() => {
    const fetch_det = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/detections?limit=8`);
        if (res.ok) {
          const data = await res.json();
          setLastDetections(data);
        }
      } catch {}
    };
    fetch_det();
    const t = setInterval(fetch_det, 5000);
    return () => clearInterval(t);
  }, []);

  const latestHornet = lastDetections.find(d =>
    d.species?.toLowerCase().includes("hornet")
  );

  const statBoxes: StatBox[] = [
    { label: "Total Detections", value: stats?.totalDetections ?? "—", icon: "🔍" },
    { label: "Hornet Alerts", value: stats?.hornetDetections ?? "—", icon: "⚠️", danger: true },
    { label: "Avg Confidence", value: stats ? `${stats.aiAccuracy}%` : "—", icon: "🎯" },
    { label: "Bee Detections", value: stats?.beeDetections ?? "—", icon: "🍯" },
  ];

  return (
    <>
      <PageMeta title="Monitoring - Hornet AI" description="Live camera monitoring" />

      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Live Monitoring</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Camera trực tiếp với phát hiện YOLOv8</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/[0.03]">
          <span className={`w-2.5 h-2.5 rounded-full ${
            apiStatus === "online" ? "bg-green-500 animate-pulse" :
            apiStatus === "offline" ? "bg-red-500" : "bg-amber-400 animate-pulse"
          }`} />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Flask API:{" "}
            <span className={
              apiStatus === "online" ? "text-green-600 dark:text-green-400" :
              apiStatus === "offline" ? "text-red-600 dark:text-red-400" : "text-amber-600"
            }>
              {apiStatus === "checking" ? "Đang kiểm tra..." : apiStatus === "online" ? "Online" : "Offline"}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">

        {/* ============================
            CAMERA FEED CHÍNH - FIX HERE
            ============================
            Dùng <img> cho MJPEG stream từ Flask.
            KHÔNG dùng <video>, fetch, axios, websocket.
            MJPEG = multipart/x-mixed-replace → browser tự cập nhật liên tục.
        */}
        <div className="col-span-12 xl:col-span-8">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">

            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${streamOk ? "bg-green-500 animate-pulse" : streamOk === false ? "bg-red-500" : "bg-amber-400 animate-pulse"}`} />
                <span className="font-semibold text-gray-800 dark:text-white text-sm">
                  Camera 1 — Hive Entrance
                </span>
              </div>
              <div className="flex items-center gap-2">
                {latestHornet && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium animate-pulse bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    ⚠ {latestHornet.species} {latestHornet.confidence}%
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-xs font-mono">
                  {streamOk ? "LIVE" : streamOk === false ? "OFFLINE" : "..."}
                </span>
              </div>
            </div>

            {/* Camera Frame */}
            <div className="relative bg-gray-950" style={{ paddingBottom: "56.25%" }}>

              {/* Overlay khi offline */}
              {streamOk === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                  <div className="text-6xl">📷</div>
                  <p className="text-gray-300 text-sm font-medium">Flask API chưa chạy</p>
                  <p className="text-gray-500 text-xs">Chạy: <code className="text-green-400">python api_server.py</code></p>
                  <a
                    href={`${API_BASE}/latest_frame`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors"
                  >
                    Test stream trực tiếp ↗
                  </a>
                </div>
              )}

              {/* Spinner chỉ hiện khi đang check lần đầu */}
              {streamOk === null && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
                </div>
              )}

              {/*
                ⭐ KEY FIX: MJPEG stream dùng <img> thuần túy
                - src = /latest_frame (Flask trả MJPEG multipart)
                - onLoad = stream đã kết nối thành công → tắt spinner
                - onError = Flask offline → hiện error UI
                - KHÔNG thêm ?t=... timestamp vào MJPEG URL (sẽ reset stream)
              */}
              <img
                ref={imgRef}
                src={`${API_BASE}/latest_frame`}
                alt="Live camera feed"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ display: streamOk === false ? "none" : "block" }}
                onLoad={() => {
                  if (!streamLoadedRef.current) {
                    streamLoadedRef.current = true;
                    setStreamOk(true);
                  }
                }}
                onError={() => {
                  setStreamOk(false);
                  streamLoadedRef.current = false;
                }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={() => {
                  setStreamOk(null);
                  streamLoadedRef.current = false;
                  if (imgRef.current) {
                    const src = imgRef.current.src;
                    imgRef.current.src = "";
                    setTimeout(() => {
                      if (imgRef.current) imgRef.current.src = src;
                    }, 100);
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                🔄 Reconnect
              </button>
              <button
                onClick={() => {
                  if (imgRef.current) {
                    const a = document.createElement("a");
                    const canvas = document.createElement("canvas");
                    canvas.width = imgRef.current.naturalWidth || 640;
                    canvas.height = imgRef.current.naturalHeight || 480;
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      ctx.drawImage(imgRef.current, 0, 0);
                      a.href = canvas.toDataURL("image/jpeg");
                      a.download = `snapshot_${Date.now()}.jpg`;
                      a.click();
                    }
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                📸 Snapshot
              </button>
              <a
                href={`${API_BASE}/latest_frame`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                🔗 Full stream
              </a>
              <span className="ml-auto text-xs text-gray-400 font-mono" suppressHydrationWarning>
                {new Date().toLocaleTimeString("vi-VN")}
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar: Recent Detections */}
        <div className="col-span-12 xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white">Phát hiện gần đây</h3>
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "340px" }}>
              {lastDetections.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-3xl mb-2">📡</p>
                  <p className="text-xs">Đang chờ dữ liệu...</p>
                </div>
              ) : (
                lastDetections.map((d) => {
                  const isHornet = d.species?.toLowerCase().includes("hornet");
                  return (
                    <div
                      key={d.id}
                      className={`p-3 rounded-xl border text-xs ${
                        isHornet
                          ? "bg-red-50 border-red-200 dark:bg-red-900/15 dark:border-red-800"
                          : "bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${isHornet ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                          {isHornet ? "🐝" : "🍯"} {d.species}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                          isHornet ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}>
                          {d.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-gray-400">
                        <span>{d.confidence}%</span>
                        <span>·</span>
                        <span>{d.camera}</span>
                        <span>·</span>
                        <span>{String(d.timestamp).split(" ")[1]?.slice(0, 5) || d.timestamp}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <a href="/alerts-center" className="text-xs text-brand-500 hover:text-brand-600 font-medium">
                Xem tất cả alerts →
              </a>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white">Thống kê hôm nay</h3>
              {stats === null && (
                <span className="text-xs text-gray-400 animate-pulse">Đang tải từ API...</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statBoxes.map((stat) => (
                <div
                  key={stat.label}
                  className={`p-4 rounded-xl ${stat.danger ? "bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-gray-800/50"}`}
                >
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

            {/* API instructions khi offline */}
            {apiStatus === "offline" && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">⚠ Flask API chưa chạy</p>
                <p className="text-xs text-gray-500">Chạy lệnh sau trong terminal:</p>
                <code className="block mt-1 text-xs text-green-600 dark:text-green-400 bg-gray-900 px-3 py-2 rounded-lg">
                  cd bee_monitoring_system && python api_server.py
                </code>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
