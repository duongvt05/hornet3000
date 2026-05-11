import { useState, useEffect, useRef, useCallback } from "react";

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface CameraInfo {
  id: string;
  name: string;
  name_en: string;
  description: string;
  position: string;
  online: boolean;
  streamUrl: string;
}

interface HistoryItem {
  timestamp: string;
  camera: string;
  cameraName: string;
  species: string;
  confidence: number;
  hasImage: boolean;
  imagePath: string;
}

interface IotDevice {
  status: string;
  auto: boolean;
  last_changed: string | null;
  label: string;
}

interface IotState {
  door: IotDevice;
  buzzer: IotDevice;
  light: IotDevice;
  fan: IotDevice;
}

interface Alert {
  id: string;
  timestamp: string;
  camera: string;
  cameraName: string;
  species: string;
  confidence: number;
  severity: "high" | "medium" | "low";
}

const API = "http://127.0.0.1:5000";

// ─── CAMERA IDs ──────────────────────────────────────────────────────────────

const CAMERA_IDS = ["cam1", "cam2", "cam3"];

// ─── CAMERA STREAM ───────────────────────────────────────────────────────────

function CameraStream({
  camId,
  info,
  isSelected,
  onSelect,
  newAlert,
}: {
  camId: string;
  info: CameraInfo | undefined;
  isSelected: boolean;
  onSelect: () => void;
  newAlert: Alert | null;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [streamOk, setStreamOk] = useState<boolean | null>(null);
  const loadedRef = useRef(false);

  // Mount stream URL once
  useEffect(() => {
    if (!imgRef.current) return;
    loadedRef.current = false;
    setStreamOk(null);
    imgRef.current.src = `${API}/latest_frame/${camId}?t=${Date.now()}`;
  }, [camId]);

  const handleLoad = useCallback(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      setStreamOk(true);
    }
  }, []);

  const handleError = useCallback(() => {
    setStreamOk(false);
  }, []);

  const reconnect = () => {
    if (!imgRef.current) return;
    loadedRef.current = false;
    setStreamOk(null);
    imgRef.current.src = `${API}/latest_frame/${camId}?t=${Date.now()}`;
  };

  return (
    <div
      onClick={onSelect}
      style={{
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        border: isSelected
          ? "2px solid #4ade80"
          : "1.5px solid rgba(255,255,255,0.08)",
        background: "#0d1117",
        aspectRatio: "16/9",
        transition: "border-color 0.2s",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(74,222,128,0.15)"
          : "none",
      }}
    >
      {/* Alert flash */}
      {newAlert && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            border: "3px solid #ef4444",
            borderRadius: 12,
            animation: "alertFlash 0.5s ease-in-out 3",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Stream */}
      <img
        ref={imgRef}
        onLoad={handleLoad}
        onError={handleError}
        alt={info?.name ?? camId}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          opacity: streamOk === false ? 0 : 1,
          transition: "opacity 0.3s",
        }}
      />

      {/* Loading spinner */}
      {streamOk === null && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "#0d1117",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              border: "2.5px solid rgba(74,222,128,0.3)",
              borderTopColor: "#4ade80",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            Đang kết nối...
          </span>
        </div>
      )}

      {/* Error */}
      {streamOk === false && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "#0d1117",
          }}
        >
          <span style={{ fontSize: 28 }}>📷</span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {info?.name ?? camId}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              reconnect();
            }}
            style={{
              fontSize: 11,
              padding: "4px 12px",
              background: "rgba(74,222,128,0.1)",
              border: "1px solid rgba(74,222,128,0.3)",
              borderRadius: 6,
              color: "#4ade80",
              cursor: "pointer",
            }}
          >
            Kết nối lại
          </button>
        </div>
      )}

      {/* Overlay label */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 10px 6px",
          background:
            "linear-gradient(transparent, rgba(0,0,0,0.75))",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>
            {info?.name ?? camId.toUpperCase()}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
            {info?.position}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10,
            color: streamOk ? "#4ade80" : "#6b7280",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: streamOk ? "#4ade80" : "#374151",
              display: "inline-block",
            }}
          />
          {streamOk ? "Online" : "—"}
        </div>
      </div>

      {/* Alert badge */}
      {newAlert && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "#ef4444",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            letterSpacing: 0.5,
          }}
        >
          HORNET!
        </div>
      )}
    </div>
  );
}

// ─── IOT PANEL ───────────────────────────────────────────────────────────────

function IotPanel({
  iotState,
  onControl,
  onReset,
}: {
  iotState: IotState | null;
  onControl: (device: string, action: string) => void;
  onReset: () => void;
}) {
  if (!iotState) return null;

  const devices: { key: keyof IotState; icon: string; onAction: string; offAction: string }[] = [
    { key: "door",   icon: "🚪", onAction: "closed", offAction: "open" },
    { key: "buzzer", icon: "🔔", onAction: "on",     offAction: "off" },
    { key: "light",  icon: "💡", onAction: "on",     offAction: "off" },
    { key: "fan",    icon: "🌀", onAction: "on",     offAction: "off" },
  ];

  const isActive = (dev: IotDevice, key: string) => {
    if (key === "door") return dev.status === "closed";
    return dev.status === "on";
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>
          Điều khiển IoT
        </div>
        <button
          onClick={onReset}
          style={{
            fontSize: 11,
            padding: "3px 10px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 6,
            color: "#f87171",
            cursor: "pointer",
          }}
        >
          Reset an toàn
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {devices.map(({ key, icon, onAction, offAction }) => {
          const dev = iotState[key];
          const active = isActive(dev, key);
          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 8,
                background: active
                  ? "rgba(74,222,128,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: active
                  ? "1px solid rgba(74,222,128,0.2)"
                  : "1px solid rgba(255,255,255,0.05)",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#e5e7eb" }}>
                    {dev.label}
                  </div>
                  <div style={{ fontSize: 10, color: dev.auto ? "#6ee7b7" : "#9ca3af" }}>
                    {dev.auto ? "Tự động" : "Thủ công"} ·{" "}
                    <span style={{ color: active ? "#4ade80" : "#6b7280" }}>
                      {dev.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() =>
                  onControl(key, active ? offAction : onAction)
                }
                style={{
                  fontSize: 11,
                  padding: "4px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  border: "1px solid",
                  fontWeight: 500,
                  transition: "all 0.15s",
                  background: active
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(74,222,128,0.15)",
                  borderColor: active
                    ? "rgba(239,68,68,0.4)"
                    : "rgba(74,222,128,0.4)",
                  color: active ? "#f87171" : "#4ade80",
                }}
              >
                {active
                  ? key === "door"
                    ? "Mở cửa"
                    : "Tắt"
                  : key === "door"
                  ? "Đóng cửa"
                  : "Bật"}
              </button>
            </div>
          );
        })}
      </div>

      {/* IoT logic explanation */}
      <div
        style={{
          marginTop: 12,
          padding: "8px 10px",
          borderRadius: 8,
          background: "rgba(251,191,36,0.05)",
          border: "1px solid rgba(251,191,36,0.15)",
        }}
      >
        <div style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600, marginBottom: 3 }}>
          Logic tự động khi phát hiện hornet (conf &gt;55%):
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.6 }}>
          🚪 Đóng cửa tổ → 🔔 Kích còi siêu âm → 💡 Bật đèn UV xua đuổi
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY PANEL ───────────────────────────────────────────────────────────

function HistoryPanel({
  history,
  onRefresh,
}: {
  history: HistoryItem[];
  onRefresh: () => void;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>
          Lịch sử phát hiện
        </div>
        <button
          onClick={onRefresh}
          style={{
            fontSize: 11,
            padding: "3px 10px",
            background: "rgba(74,222,128,0.1)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 6,
            color: "#4ade80",
            cursor: "pointer",
          }}
        >
          Làm mới
        </button>
      </div>

      {history.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "24px 0",
            color: "#4b5563",
            fontSize: 12,
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>🐝</div>
          Chưa phát hiện ong bắp cày
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {history.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background:
                  i === 0
                    ? "rgba(239,68,68,0.07)"
                    : "rgba(255,255,255,0.02)",
                border:
                  i === 0
                    ? "1px solid rgba(239,68,68,0.2)"
                    : "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {/* Thumbnail placeholder */}
              <div
                style={{
                  width: 44,
                  height: 32,
                  borderRadius: 6,
                  background: item.hasImage
                    ? "#1c2a1c"
                    : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 14,
                  overflow: "hidden",
                }}
              >
                {item.hasImage ? (
                  <img
                    src={`${API}/api/history/image?path=${encodeURIComponent(
                      item.imagePath
                    )}`}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  "🐝"
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: i === 0 ? "#f87171" : "#e5e7eb",
                    marginBottom: 2,
                  }}
                >
                  {item.species} · {item.confidence.toFixed(0)}%
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6b7280",
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <span>{item.cameraName}</span>
                  <span>·</span>
                  <span>
                    {item.timestamp
                      ? item.timestamp.split(" ")[1]?.substring(0, 8) ?? item.timestamp
                      : "—"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background:
                    item.confidence > 75
                      ? "rgba(239,68,68,0.15)"
                      : "rgba(251,191,36,0.15)",
                  color:
                    item.confidence > 75 ? "#f87171" : "#fbbf24",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {item.confidence > 75 ? "CAO" : "VỪA"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ALERT TOAST ─────────────────────────────────────────────────────────────

function AlertToast({
  alert,
  onDismiss,
}: {
  alert: Alert;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [alert, onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        top: 80,
        right: 24,
        zIndex: 1000,
        width: 320,
        background: "#1a0a0a",
        border: "1.5px solid #ef4444",
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        animation: "slideInRight 0.3s ease",
        boxShadow: "0 8px 32px rgba(239,68,68,0.25)",
      }}
    >
      <div style={{ fontSize: 24, flexShrink: 0 }}>🚨</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>
          Phát hiện ong bắp cày!
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
          <span style={{ color: "#e5e7eb" }}>{alert.cameraName}</span> · Conf:{" "}
          {alert.confidence.toFixed(0)}% ·{" "}
          {alert.timestamp?.split(" ")[1]?.substring(0, 8)}
        </div>
        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
          IoT đang phản hồi tự động...
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: "#6b7280",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const [cameras, setCameras] = useState<Record<string, CameraInfo>>({});
  const [selectedCam, setSelectedCam] = useState<string>("cam1");
  const [iotState, setIotState] = useState<IotState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [cameraAlerts, setCameraAlerts] = useState<Record<string, Alert | null>>({});
  const [apiOnline, setApiOnline] = useState(false);
  const prevAlertCountRef = useRef(0);

  // Fetch camera list
  const fetchCameras = async () => {
    try {
      const res = await fetch(`${API}/api/cameras`);
      const data = await res.json();
      setCameras(data);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  };

  // Fetch IoT state
  const fetchIot = async () => {
    try {
      const res = await fetch(`${API}/api/iot/status`);
      const data = await res.json();
      setIotState(data);
    } catch {}
  };

  // Fetch history
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/api/history?limit=20`);
      const data = await res.json();
      setHistory(data.history ?? []);
    } catch {}
  };

  // Poll alerts
  const pollAlerts = async () => {
    try {
      const res = await fetch(`${API}/api/alerts?limit=5`);
      const data = await res.json();
      const alerts: Alert[] = data.alerts ?? [];

      if (alerts.length > prevAlertCountRef.current) {
        const newest = alerts[0];
        setActiveAlert(newest);
        // Mark camera
        setCameraAlerts((prev) => ({
          ...prev,
          [newest.camera]: newest,
        }));
        setTimeout(() => {
          setCameraAlerts((prev) => ({ ...prev, [newest.camera]: null }));
        }, 4000);
      }
      prevAlertCountRef.current = alerts.length;
    } catch {}
  };

  useEffect(() => {
    fetchCameras();
    fetchIot();
    fetchHistory();
    const interval = setInterval(() => {
      fetchIot();
      pollAlerts();
      fetchHistory();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleIotControl = async (device: string, action: string) => {
    try {
      const res = await fetch(`${API}/api/iot/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device, action }),
      });
      const data = await res.json();
      if (data.success) fetchIot();
    } catch {}
  };

  const handleIotReset = async () => {
    try {
      await fetch(`${API}/api/iot/reset`, { method: "POST" });
      fetchIot();
    } catch {}
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0f14",
        color: "#e5e7eb",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: "20px 24px",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes alertFlash {
          0%,100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Alert toast */}
      {activeAlert && (
        <AlertToast
          alert={activeAlert}
          onDismiss={() => setActiveAlert(null)}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: "#f0fdf4",
              letterSpacing: -0.3,
            }}
          >
            🍯 Giám sát trang trại ong
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#4b5563" }}>
            HornetGuard Pro · 3 Camera · AI Detection
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: apiOnline ? "#4ade80" : "#6b7280",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: apiOnline ? "#4ade80" : "#374151",
              display: "inline-block",
            }}
          />
          {apiOnline ? "API Online" : "API Offline"}
        </div>
      </div>

      {/* Layout: cameras left, panels right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* LEFT: Camera grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Main selected camera */}
          <div
            style={{
              borderRadius: 14,
              overflow: "hidden",
              border: "1.5px solid rgba(74,222,128,0.2)",
              background: "#0d1117",
              aspectRatio: "16/9",
              position: "relative",
            }}
          >
            {(() => {
              const info = cameras[selectedCam];
              return (
                <>
                  <img
                    src={`${API}/latest_frame/${selectedCam}`}
                    alt={info?.name ?? selectedCam}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 12,
                      background: "rgba(0,0,0,0.6)",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#fff",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    {info?.name ?? selectedCam} · {info?.position}
                  </div>
                  {cameraAlerts[selectedCam] && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 12,
                        background: "#ef4444",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#fff",
                        animation: "alertFlash 0.5s ease-in-out infinite",
                      }}
                    >
                      🚨 HORNET DETECTED
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Thumbnail row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            {CAMERA_IDS.map((camId) => (
              <CameraStream
                key={camId}
                camId={camId}
                info={cameras[camId]}
                isSelected={selectedCam === camId}
                onSelect={() => setSelectedCam(camId)}
                newAlert={cameraAlerts[camId] ?? null}
              />
            ))}
          </div>

          {/* Camera name tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            {CAMERA_IDS.map((camId) => (
              <button
                key={camId}
                onClick={() => setSelectedCam(camId)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: selectedCam === camId
                    ? "1px solid rgba(74,222,128,0.4)"
                    : "1px solid rgba(255,255,255,0.07)",
                  background: selectedCam === camId
                    ? "rgba(74,222,128,0.1)"
                    : "rgba(255,255,255,0.03)",
                  color: selectedCam === camId ? "#4ade80" : "#9ca3af",
                }}
              >
                {cameras[camId]?.name ?? camId}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <IotPanel
            iotState={iotState}
            onControl={handleIotControl}
            onReset={handleIotReset}
          />
          <HistoryPanel history={history} onRefresh={fetchHistory} />
        </div>
      </div>
    </div>
  );
}