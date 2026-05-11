/**
 * Monitoring.tsx — HornetGuard Pro (FIXED)
 *
 * Các fix:
 *  1. CameraStream: dùng setInterval reload src thay vì set một lần
 *     → Frame cập nhật liên tục (~10 FPS)
 *  2. Main camera view: cũng reload định kỳ bằng frameTs state
 *  3. pollAlerts: so sánh alert ID mới nhất (không phải .length)
 *     → Chỉ trigger toast khi thực sự có alert MỚI
 *  4. AlertToast: auto-dismiss sau 6s, tắt được bằng nút ✕
 *  5. CameraStream: loading spinner + reconnect button
 *  6. IotPanel + HistoryPanel: giữ nguyên logic, chỉ fix kiểu dữ liệu
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API         = "http://127.0.0.1:5000";
const FRAME_MS    = 100;   // reload ảnh mỗi 100ms → ~10 FPS
const POLL_MS     = 3000;  // poll alert mỗi 3 giây

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface CameraInfo {
  id: string; name: string; name_en: string;
  description: string; position: string;
  online: boolean; streamUrl: string; icon: string;
}
interface HistoryItem {
  timestamp: string; camera: string; cameraName: string;
  species: string; confidence: number; hasImage: boolean; imagePath: string;
}
interface IotDevice {
  status: string; auto: boolean; last_changed: string | null; label: string;
}
interface IotState {
  door: IotDevice; buzzer: IotDevice; light: IotDevice; fan: IotDevice;
}
interface Alert {
  id: string; timestamp: string; camera: string; cameraName: string;
  species: string; confidence: number; severity: "high" | "medium" | "low";
  imagePath: string;
}

const CAMERA_IDS = ["cam1", "cam2", "cam3"];

// ─── AUDIO BEEP ──────────────────────────────────────────────────────────────
function playBeep() {
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (_) {}
}

// ─── CAMERA STREAM THUMBNAIL ─────────────────────────────────────────────────
function CameraStream({
  camId, info, isSelected, onSelect, newAlert,
}: {
  camId: string; info: CameraInfo | undefined;
  isSelected: boolean; onSelect: () => void; newAlert: Alert | null;
}) {
  const imgRef    = useRef<HTMLImageElement>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  // FIX: reload ảnh định kỳ thay vì chỉ set 1 lần
  useEffect(() => {
    setOk(null);
    const id = setInterval(() => {
      if (imgRef.current) {
        imgRef.current.src = `${API}/latest_frame/${camId}?t=${Date.now()}`;
      }
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [camId]);

  const reconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOk(null);
    if (imgRef.current) imgRef.current.src = `${API}/latest_frame/${camId}?t=${Date.now()}`;
  };

  return (
    <div
      onClick={onSelect}
      style={{
        position: "relative", borderRadius: 10, overflow: "hidden",
        cursor: "pointer", aspectRatio: "16/9", background: "#0d1117",
        border: isSelected
          ? "2px solid #4ade80"
          : "1.5px solid rgba(255,255,255,0.07)",
        boxShadow: isSelected ? "0 0 0 3px rgba(74,222,128,0.12)" : "none",
        transition: "border-color .2s, box-shadow .2s",
      }}
    >
      {/* Alert flash border */}
      {newAlert && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          border: "3px solid #ef4444", borderRadius: 10,
          animation: "alertFlash .5s ease-in-out 3", pointerEvents: "none",
        }} />
      )}

      <img
        ref={imgRef} alt={info?.name ?? camId}
        onLoad={() => setOk(true)}
        onError={() => setOk(false)}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          display: "block", opacity: ok === false ? 0 : 1,
          transition: "opacity .3s",
        }}
      />

      {/* Loading */}
      {ok === null && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 6, background: "#0d1117",
        }}>
          <div style={{
            width: 24, height: 24,
            border: "2px solid rgba(74,222,128,.3)", borderTopColor: "#4ade80",
            borderRadius: "50%", animation: "spin .8s linear infinite",
          }} />
          <span style={{ fontSize: 10, color: "#4b5563" }}>Đang kết nối...</span>
        </div>
      )}

      {/* Error */}
      {ok === false && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 8, background: "#0d1117",
        }}>
          <span style={{ fontSize: 24 }}>📷</span>
          <span style={{ fontSize: 10, color: "#4b5563" }}>{info?.name ?? camId}</span>
          <button onClick={reconnect} style={{
            fontSize: 10, padding: "3px 10px",
            background: "rgba(74,222,128,.1)",
            border: "1px solid rgba(74,222,128,.3)",
            borderRadius: 5, color: "#4ade80", cursor: "pointer",
          }}>Kết nối lại</button>
        </div>
      )}

      {/* Bottom label */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "14px 8px 5px",
        background: "linear-gradient(transparent, rgba(0,0,0,.75))",
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>
            {info?.name ?? camId.toUpperCase()}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,.45)" }}>
            {info?.position}
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 3,
          fontSize: 9, color: ok ? "#4ade80" : "#4b5563",
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: "50%",
            background: ok ? "#4ade80" : "#374151", display: "inline-block",
          }} />
          {ok ? "Live" : "—"}
        </div>
      </div>

      {/* Alert badge */}
      {newAlert && (
        <div style={{
          position: "absolute", top: 6, right: 6,
          background: "#ef4444", color: "#fff",
          fontSize: 9, fontWeight: 700, padding: "2px 7px",
          borderRadius: 999, letterSpacing: .5,
        }}>HORNET!</div>
      )}
    </div>
  );
}

// ─── IOT PANEL ───────────────────────────────────────────────────────────────
function IotPanel({
  iotState, onControl, onReset,
}: {
  iotState: IotState | null;
  onControl: (device: string, action: string) => void;
  onReset: () => void;
}) {
  if (!iotState) return null;

  const devices: { key: keyof IotState; icon: string; onAct: string; offAct: string }[] = [
    { key: "door",   icon: "🚪", onAct: "closed", offAct: "open" },
    { key: "buzzer", icon: "🔔", onAct: "on",     offAct: "off"  },
    { key: "light",  icon: "💡", onAct: "on",     offAct: "off"  },
    { key: "fan",    icon: "🌀", onAct: "on",     offAct: "off"  },
  ];

  const isActive = (dev: IotDevice, key: string) =>
    key === "door" ? dev.status === "closed" : dev.status === "on";

  return (
    <div style={{
      background: "rgba(255,255,255,.03)",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>Điều khiển IoT</span>
        <button onClick={onReset} style={{
          fontSize: 11, padding: "3px 10px",
          background: "rgba(239,68,68,.1)",
          border: "1px solid rgba(239,68,68,.3)",
          borderRadius: 6, color: "#f87171", cursor: "pointer",
        }}>Reset an toàn</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {devices.map(({ key, icon, onAct, offAct }) => {
          const dev    = iotState[key];
          const active = isActive(dev, key);
          return (
            <div key={key} style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px", borderRadius: 8,
              background: active ? "rgba(74,222,128,.07)" : "rgba(255,255,255,.02)",
              border: active
                ? "1px solid rgba(74,222,128,.2)"
                : "1px solid rgba(255,255,255,.05)",
              transition: "all .2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15 }}>{icon}</span>
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
                onClick={() => onControl(key, active ? offAct : onAct)}
                style={{
                  fontSize: 11, padding: "4px 12px", borderRadius: 6,
                  cursor: "pointer", border: "1px solid", fontWeight: 500,
                  background: active ? "rgba(239,68,68,.15)" : "rgba(74,222,128,.15)",
                  borderColor: active ? "rgba(239,68,68,.4)" : "rgba(74,222,128,.4)",
                  color: active ? "#f87171" : "#4ade80",
                  transition: "all .15s",
                }}>
                {active
                  ? key === "door" ? "Mở cửa" : "Tắt"
                  : key === "door" ? "Đóng cửa" : "Bật"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 12, padding: "8px 10px", borderRadius: 8,
        background: "rgba(251,191,36,.05)",
        border: "1px solid rgba(251,191,36,.15)",
      }}>
        <div style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600, marginBottom: 3 }}>
          Logic tự động (conf &gt; 55%):
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.6 }}>
          🚪 Đóng cửa tổ → 🔔 Kích còi siêu âm → 💡 Bật đèn UV
        </div>
      </div>
    </div>
  );
}

// ─── HISTORY PANEL ───────────────────────────────────────────────────────────
function HistoryPanel({
  history, onRefresh,
}: { history: HistoryItem[]; onRefresh: () => void }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.03)",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 12,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>
          Lịch sử phát hiện
        </span>
        <button onClick={onRefresh} style={{
          fontSize: 11, padding: "3px 10px",
          background: "rgba(74,222,128,.1)",
          border: "1px solid rgba(74,222,128,.2)",
          borderRadius: 6, color: "#4ade80", cursor: "pointer",
        }}>Làm mới</button>
      </div>

      {history.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "24px 0",
          color: "#4b5563", fontSize: 12,
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🐝</div>
          Chưa phát hiện ong bắp cày
        </div>
      ) : (
        <div style={{
          display: "flex", flexDirection: "column",
          gap: 6, maxHeight: 320, overflowY: "auto",
        }}>
          {history.map((item, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8,
              background: i === 0 ? "rgba(239,68,68,.07)" : "rgba(255,255,255,.02)",
              border: i === 0
                ? "1px solid rgba(239,68,68,.2)"
                : "1px solid rgba(255,255,255,.04)",
            }}>
              {/* Thumbnail */}
              <div style={{
                width: 44, height: 32, borderRadius: 6, overflow: "hidden",
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.07)",
                flexShrink: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                {item.hasImage ? (
                  <img
                    src={`${API}/api/history/image?path=${encodeURIComponent(item.imagePath)}`}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 14 }}>🐝</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, marginBottom: 2,
                  color: i === 0 ? "#f87171" : "#e5e7eb",
                }}>
                  {item.species} · {item.confidence.toFixed(0)}%
                </div>
                <div style={{
                  fontSize: 10, color: "#6b7280",
                  display: "flex", gap: 5,
                }}>
                  <span>{item.cameraName}</span>
                  <span>·</span>
                  <span>{item.timestamp?.split(" ")[1]?.substring(0, 8) ?? "—"}</span>
                </div>
              </div>

              <div style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 600,
                background: item.confidence > 75 ? "rgba(239,68,68,.15)" : "rgba(251,191,36,.15)",
                color: item.confidence > 75 ? "#f87171" : "#fbbf24",
                whiteSpace: "nowrap",
              }}>
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
  alert, onDismiss,
}: { alert: Alert; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [alert.id, onDismiss]);

  return (
    <div style={{
      position: "fixed", top: 72, right: 20, zIndex: 1000,
      width: 310, background: "#1a0a0a",
      border: "1.5px solid #ef4444", borderRadius: 12,
      padding: "14px 16px", display: "flex", gap: 10,
      alignItems: "flex-start",
      animation: "slideInRight .3s ease",
      boxShadow: "0 8px 32px rgba(239,68,68,.3)",
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🚨</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 4 }}>
          Phát hiện ong bắp cày!
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
          <span style={{ color: "#e5e7eb" }}>{alert.cameraName}</span>
          {" · "}Conf: {alert.confidence.toFixed(0)}%
          {" · "}{alert.timestamp?.split(" ")[1]?.substring(0, 8)}
        </div>
        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
          IoT đang phản hồi tự động...
        </div>
      </div>
      <button onClick={onDismiss} style={{
        background: "none", border: "none",
        color: "#6b7280", cursor: "pointer",
        fontSize: 15, lineHeight: 1, padding: 0, flexShrink: 0,
      }}>✕</button>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const [cameras, setCameras]       = useState<Record<string, CameraInfo>>({});
  const [selectedCam, setSelectedCam] = useState("cam1");
  const [iotState, setIotState]     = useState<IotState | null>(null);
  const [history, setHistory]       = useState<HistoryItem[]>([]);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const [camAlerts, setCamAlerts]   = useState<Record<string, Alert | null>>({});
  const [apiOnline, setApiOnline]   = useState(false);
  // FIX: dùng lastAlertId thay vì count để phát hiện alert mới chính xác
  const lastAlertIdRef = useRef<string>("");
  // FIX: main camera frame timestamp để trigger reload
  const [frameTs, setFrameTs]       = useState(Date.now());

  // Reload main camera frame định kỳ
  useEffect(() => {
    const id = setInterval(() => setFrameTs(Date.now()), FRAME_MS);
    return () => clearInterval(id);
  }, []);

  const fetchCameras = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/cameras`);
      setCameras(await r.json());
      setApiOnline(true);
    } catch { setApiOnline(false); }
  }, []);

  const fetchIot = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/iot/status`);
      setIotState(await r.json());
    } catch {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const r    = await fetch(`${API}/api/history?limit=20`);
      const data = await r.json();
      setHistory(data.history ?? []);
    } catch {}
  }, []);

  // FIX: so sánh ID alert mới nhất, không phải length
  const pollAlerts = useCallback(async () => {
    try {
      const r    = await fetch(`${API}/api/alerts?limit=5`);
      const data = await r.json();
      const alerts: Alert[] = data.alerts ?? [];
      if (alerts.length === 0) return;

      const newest = alerts[0];
      if (newest.id && newest.id !== lastAlertIdRef.current) {
        // Chỉ phát beep + toast khi đã có lần fetch trước (tránh noise lúc load)
        if (lastAlertIdRef.current !== "") {
          playBeep();
          setActiveAlert(newest);
          setCamAlerts(prev => ({ ...prev, [newest.camera]: newest }));
          setTimeout(() => {
            setCamAlerts(prev => ({ ...prev, [newest.camera]: null }));
          }, 5000);
        }
        lastAlertIdRef.current = newest.id;
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCameras(); fetchIot(); fetchHistory(); pollAlerts();
    const id = setInterval(() => {
      fetchIot(); pollAlerts(); fetchHistory();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [fetchCameras, fetchIot, fetchHistory, pollAlerts]);

  const handleControl = async (device: string, action: string) => {
    try {
      await fetch(`${API}/api/iot/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device, action }),
      });
      fetchIot();
    } catch {}
  };

  const handleReset = async () => {
    try {
      await fetch(`${API}/api/iot/reset`, { method: "POST" });
      fetchIot();
    } catch {}
  };

  const camInfo = cameras[selectedCam];

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0f14",
      color: "#e5e7eb",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      padding: "18px 20px",
    }}>
      <style>{`
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes alertFlash  { 0%,100%{ opacity:1; } 50%{ opacity:.15; } }
        @keyframes slideInRight{ from{ transform:translateX(115%); opacity:0; }
                                  to{ transform:translateX(0); opacity:1; } }
      `}</style>

      {/* Toast */}
      {activeAlert && (
        <AlertToast alert={activeAlert} onDismiss={() => setActiveAlert(null)} />
      )}

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 18,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 19, fontWeight: 700,
            color: "#f0fdf4", letterSpacing: -.3,
          }}>🍯 Giám sát trang trại ong</h1>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#4b5563" }}>
            HornetGuard Pro · 3 Camera · YOLO AI Detection
          </p>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 11, color: apiOnline ? "#4ade80" : "#6b7280",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: apiOnline ? "#4ade80" : "#374151",
            display: "inline-block",
          }} />
          {apiOnline ? "API Online" : "API Offline"}
        </div>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 296px",
        gap: 14, alignItems: "start",
      }}>
        {/* LEFT: cameras */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Main view — FIX: reload bằng frameTs */}
          <div style={{
            borderRadius: 14, overflow: "hidden",
            border: "1.5px solid rgba(74,222,128,.2)",
            background: "#0d1117", aspectRatio: "16/9",
            position: "relative",
          }}>
            <img
              src={`${API}/latest_frame/${selectedCam}?t=${frameTs}`}
              alt={camInfo?.name ?? selectedCam}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {/* HUD: camera name */}
            <div style={{
              position: "absolute", top: 10, left: 12,
              background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)",
              borderRadius: 6, padding: "4px 10px",
              fontSize: 12, fontWeight: 600, color: "#fff",
            }}>
              {camInfo?.name ?? selectedCam} · {camInfo?.position}
            </div>
            {/* HUD: AI badge */}
            <div style={{
              position: "absolute", bottom: 10, left: 12,
              display: "flex", alignItems: "center", gap: 5,
              background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)",
              borderRadius: 5, padding: "3px 8px",
              fontSize: 10, color: "#4ade80", fontWeight: 600,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "#4ade80", display: "inline-block",
                animation: "alertFlash 2s ease-in-out infinite",
              }} />
              AI ACTIVE
            </div>
            {/* HUD: alert */}
            {camAlerts[selectedCam] && (
              <div style={{
                position: "absolute", top: 10, right: 12,
                background: "#ef4444", borderRadius: 6,
                padding: "4px 10px", fontSize: 11, fontWeight: 700,
                color: "#fff", animation: "alertFlash .5s ease-in-out infinite",
              }}>
                🚨 HORNET DETECTED
              </div>
            )}
          </div>

          {/* Thumbnail row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {CAMERA_IDS.map(camId => (
              <CameraStream
                key={camId} camId={camId} info={cameras[camId]}
                isSelected={selectedCam === camId}
                onSelect={() => setSelectedCam(camId)}
                newAlert={camAlerts[camId] ?? null}
              />
            ))}
          </div>

          {/* Camera tabs */}
          <div style={{ display: "flex", gap: 6 }}>
            {CAMERA_IDS.map(camId => (
              <button key={camId} onClick={() => setSelectedCam(camId)} style={{
                flex: 1, padding: "7px 0", borderRadius: 7,
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                transition: "all .15s",
                border: selectedCam === camId
                  ? "1px solid rgba(74,222,128,.4)"
                  : "1px solid rgba(255,255,255,.07)",
                background: selectedCam === camId
                  ? "rgba(74,222,128,.1)" : "rgba(255,255,255,.02)",
                color: selectedCam === camId ? "#4ade80" : "#9ca3af",
              }}>
                {cameras[camId]?.name ?? camId}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: IoT + History */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <IotPanel iotState={iotState} onControl={handleControl} onReset={handleReset} />
          <HistoryPanel history={history} onRefresh={fetchHistory} />
        </div>
      </div>
    </div>
  );
}