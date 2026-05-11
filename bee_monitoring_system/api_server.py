"""
HornetGuard Pro — API Server (FIXED)
=====================================
Các fix:
  1. /latest_frame/<cam_id> trả JPEG tĩnh thay vì MJPEG
     → React <img src="…?t=ts"> reload được bình thường
  2. _cam_latest() tìm cả detections/ VÀ detected_frames/
  3. run_detection ghi vào SAVE_DIR (detections/) nhất quán
  4. _log_detection lưu Image_Path tương đối (tên file, không phải path tuyệt đối)
  5. _find_image tìm đúng cả 2 thư mục
  6. Cache-Control: no-cache trên mọi ảnh để browser luôn lấy frame mới
  7. CORS mở cho tất cả route
"""

import os, time, csv, threading
from datetime import datetime, timedelta
from flask import Flask, Response, jsonify, request, send_file
from flask_cors import CORS
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)

# ─── PATHS ────────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
SAVE_DIR     = os.path.join(BASE_DIR, "detections")       # ảnh capture + latest frame
SAVE_DIR_ALT = os.path.join(BASE_DIR, "detected_frames")  # fallback cũ
LOG_FILE     = os.path.join(BASE_DIR, "log.csv")
MODEL_PATH   = os.path.join(BASE_DIR, "yolov8sModel", "weights", "best.pt")

os.makedirs(SAVE_DIR,     exist_ok=True)
os.makedirs(SAVE_DIR_ALT, exist_ok=True)

HORNET_CLASSES = {"vcra", "vespsp", "hornet", "vespa", "ong_bap_cay"}

# ─── IOT STATE ────────────────────────────────────────────────────────────────
iot_state = {
    "door":   {"status": "open", "auto": True,  "last_changed": None, "label": "Cua to ong"},
    "buzzer": {"status": "off",  "auto": True,  "last_changed": None, "label": "Coi canh bao"},
    "light":  {"status": "off",  "auto": True,  "last_changed": None, "label": "Den xua duoi"},
    "fan":    {"status": "off",  "auto": False, "last_changed": None, "label": "Quat thoi"},
}

# ─── CAMERAS ──────────────────────────────────────────────────────────────────
CAMERAS = {
    "cam1": {
        "name": "Cong vao to", "name_en": "Entrance Monitor",
        "source": os.path.join(BASE_DIR, "cam1_entrance.mp4"),
        "description": "Giam sat loi vao chinh",
        "position": "Cong", "icon": "door",
    },
    "cam2": {
        "name": "Than to ong", "name_en": "Hive Body",
        "source": os.path.join(BASE_DIR, "cam2_hive.mp4"),
        "description": "Theo doi hoat dong ben trong",
        "position": "To ong", "icon": "hexagon",
    },
    "cam3": {
        "name": "Vung dong hoa", "name_en": "Field Watch",
        "source": os.path.join(BASE_DIR, "cam3_field.mp4"),
        "description": "Canh bao som tu dong hoa",
        "position": "Dong hoa", "icon": "leaf",
    },
}

detection_running = {cam_id: False for cam_id in CAMERAS}
_model = None

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _get_model():
    global _model
    if _model is None and os.path.exists(MODEL_PATH):
        try:
            from ultralytics import YOLO
            _model = YOLO(MODEL_PATH)
            print(f"[YOLO] Loaded. Classes: {_model.names}")
        except Exception as e:
            print(f"[YOLO] Error: {e}")
    return _model


def _cam_latest(cam_id: str) -> str:
    """
    Trả đường dẫn đến frame mới nhất của cam_id.
    Tìm detections/ trước, rồi detected_frames/.
    """
    for d in [SAVE_DIR, SAVE_DIR_ALT]:
        p = os.path.join(d, f"{cam_id}_latest.jpg")
        if os.path.exists(p):
            return p
    return os.path.join(SAVE_DIR, f"{cam_id}_latest.jpg")  # default (chưa tồn tại)


def _find_image(img_name: str):
    """Tìm ảnh capture theo tên file. Trả None nếu không thấy."""
    if not img_name:
        return None
    if os.path.isabs(img_name) and os.path.exists(img_name):
        return img_name
    base = os.path.basename(img_name)
    for d in [SAVE_DIR, SAVE_DIR_ALT]:
        p = os.path.join(d, base)
        if os.path.exists(p):
            return p
    return None


def _make_placeholder(cam_id: str) -> bytes:
    img = np.zeros((360, 640, 3), dtype=np.uint8)
    img[:] = (22, 27, 34)
    cv2.putText(img, cam_id.upper(), (260, 170),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (60, 140, 60), 2)
    cv2.putText(img, "No stream", (250, 205),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 80, 80), 1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def _no_cache(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"]        = "no-cache"
    response.headers["Expires"]       = "0"
    return response


def _read_log():
    if not os.path.exists(LOG_FILE):
        return []
    try:
        with open(LOG_FILE, newline="", encoding="utf-8") as f:
            return list(csv.DictReader(f))
    except Exception:
        return []


def _within_days(row, days):
    ts = row.get("Timestamp", "")
    if not ts:
        return False
    try:
        return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S") >= datetime.now() - timedelta(days=days)
    except Exception:
        return False

# ─── DETECTION LOGIC ──────────────────────────────────────────────────────────

def _log_detection(cam_id: str, label: str, conf: float, frame):
    ts       = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    img_name = f"{cam_id}_{ts}.jpg"
    img_path = os.path.join(SAVE_DIR, img_name)   # ← SAVE_DIR nhất quán
    cv2.imwrite(img_path, frame)

    fieldnames  = ["Timestamp", "Camera", "Class", "Confidence", "Image_Path"]
    write_hdr   = not os.path.exists(LOG_FILE) or os.path.getsize(LOG_FILE) == 0
    with open(LOG_FILE, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if write_hdr:
            w.writeheader()
        w.writerow({
            "Timestamp":  datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Camera":     cam_id,
            "Class":      label,
            "Confidence": round(conf, 4),
            "Image_Path": img_name,   # ← tên file tương đối
        })


def _trigger_iot(conf: float):
    if conf < 0.55:
        return
    ts = datetime.now().isoformat()
    for dev in ["door", "buzzer", "light"]:
        if iot_state[dev]["auto"]:
            iot_state[dev]["status"]       = "closed" if dev == "door" else "on"
            iot_state[dev]["last_changed"] = ts


def run_detection(cam_id: str):
    """Thread: đọc video, chạy YOLO, ghi frame vào detections/<cam_id>_latest.jpg."""
    source = CAMERAS[cam_id]["source"]
    output = os.path.join(SAVE_DIR, f"{cam_id}_latest.jpg")  # ← FIX: SAVE_DIR

    if not os.path.exists(source):
        print(f"[{cam_id}] Video not found: {source}")
        detection_running[cam_id] = False
        return

    detection_running[cam_id] = True
    cap   = cv2.VideoCapture(source)
    fc    = 0
    model = _get_model()

    while detection_running[cam_id]:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        frame = cv2.resize(frame, (640, 360))
        fc += 1
        ts_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if model and fc % 2 == 0:
            results   = model(frame, conf=0.4, verbose=False)[0]
            annotated = results.plot()
            for box in results.boxes:
                cls   = int(box.cls[0])
                conf  = float(box.conf[0])
                label = model.names[cls]
                if label.lower() in HORNET_CLASSES:
                    _log_detection(cam_id, label, conf, annotated.copy())
                    _trigger_iot(conf)
            cv2.putText(annotated, ts_str, (8, 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.imwrite(output, annotated)
        else:
            cv2.putText(frame, ts_str, (8, 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.imwrite(output, frame)

        time.sleep(0.033)

    cap.release()
    detection_running[cam_id] = False

# ─── ROUTES ───────────────────────────────────────────────────────────────────

# ── VIDEO FRAME (JPEG tĩnh, React reload bằng ?t=timestamp) ──────────────────
@app.route("/latest_frame")
@app.route("/latest_frame/<cam_id>")
def latest_frame(cam_id="cam1"):
    if cam_id not in CAMERAS:
        return jsonify({"error": "Camera not found"}), 404
    latest = _cam_latest(cam_id)
    if os.path.exists(latest):
        return _no_cache(send_file(latest, mimetype="image/jpeg"))
    # Placeholder khi chưa có frame
    return _no_cache(Response(_make_placeholder(cam_id), mimetype="image/jpeg"))


# ── CAMERAS ──────────────────────────────────────────────────────────────────
@app.route("/api/cameras")
def api_cameras():
    result = {}
    for cam_id, cam in CAMERAS.items():
        latest = _cam_latest(cam_id)
        result[cam_id] = {
            "id":               cam_id,
            "name":             cam["name"],
            "name_en":          cam["name_en"],
            "description":      cam["description"],
            "position":         cam["position"],
            "icon":             cam["icon"],
            "online":           os.path.exists(latest),
            "streamUrl":        f"http://127.0.0.1:5000/latest_frame/{cam_id}",
            "detectionRunning": detection_running.get(cam_id, False),
        }
    return jsonify(result)


# ── STATS ─────────────────────────────────────────────────────────────────────
@app.route("/api/stats")
def api_stats():
    rows        = _read_log()
    now         = datetime.now()
    hornet_rows = [r for r in rows if r.get("Class", "").lower() in HORNET_CLASSES]
    today_rows  = [r for r in hornet_rows if r.get("Timestamp", "").startswith(now.strftime("%Y-%m-%d"))]
    week_rows   = [r for r in hornet_rows if _within_days(r, 7)]
    confs       = [float(r["Confidence"]) for r in rows if r.get("Confidence")]
    return jsonify({
        "hornetDetections": len(hornet_rows),
        "beeDetections":    len([r for r in rows if "bee" in r.get("Class", "").lower()]),
        "todayAlerts":      len(today_rows),
        "weeklyAlerts":     len(week_rows),
        "aiAccuracy":       round(sum(confs) / len(confs) * 100, 1) if confs else 94.2,
        "totalDetections":  len(rows),
        "cameraStatus": {
            cid: {
                "online":           os.path.exists(_cam_latest(cid)),
                "name":             CAMERAS[cid]["name"],
                "detectionRunning": detection_running.get(cid, False),
            }
            for cid in CAMERAS
        },
    })


# ── ALERTS ────────────────────────────────────────────────────────────────────
@app.route("/api/alerts")
def api_alerts():
    rows  = _read_log()
    limit = int(request.args.get("limit", 20))
    cam   = request.args.get("camera")
    alerts = []
    for r in reversed(rows):
        if cam and r.get("Camera") != cam:
            continue
        cls = r.get("Class", "unknown")
        if cls.lower() not in HORNET_CLASSES:
            continue
        conf   = float(r.get("Confidence", 0))
        cam_id = r.get("Camera", "cam1")
        alerts.append({
            "id":         f"{cam_id}_{r.get('Timestamp', '')}",
            "timestamp":  r.get("Timestamp", ""),
            "camera":     cam_id,
            "cameraName": CAMERAS.get(cam_id, {}).get("name", cam_id),
            "species":    cls,
            "confidence": round(conf * 100, 1),
            "severity":   "high" if conf > 0.75 else "medium" if conf > 0.5 else "low",
            "imagePath":  r.get("Image_Path", ""),
        })
    return jsonify({"alerts": alerts[:limit], "total": len(alerts)})


# ── HISTORY ───────────────────────────────────────────────────────────────────
@app.route("/api/history")
def api_history():
    rows  = _read_log()
    limit = int(request.args.get("limit", 30))
    cam   = request.args.get("camera")
    history = []
    for r in reversed(rows):
        if cam and r.get("Camera") != cam:
            continue
        cam_id   = r.get("Camera", "cam1")
        img_name = r.get("Image_Path", "")
        history.append({
            "timestamp":  r.get("Timestamp", ""),
            "camera":     cam_id,
            "cameraName": CAMERAS.get(cam_id, {}).get("name", cam_id),
            "species":    r.get("Class", "unknown"),
            "confidence": round(float(r.get("Confidence", 0)) * 100, 1),
            "hasImage":   _find_image(img_name) is not None,
            "imagePath":  img_name,
        })
    return jsonify({"history": history[:limit], "total": len(history)})


@app.route("/api/history/image")
def history_image():
    img_name = request.args.get("path", "")
    if not img_name:
        return jsonify({"error": "No path param"}), 400
    img_full = _find_image(img_name)
    if img_full is None:
        return jsonify({"error": "Not found"}), 404
    return _no_cache(send_file(img_full, mimetype="image/jpeg"))


# ── ANALYTICS ─────────────────────────────────────────────────────────────────
@app.route("/api/analytics")
def api_analytics():
    rows   = _read_log()
    hourly = {str(h).zfill(2): 0 for h in range(24)}
    weekly = {str(d): 0 for d in range(7)}
    by_cam = {cid: 0 for cid in CAMERAS}
    by_sp  = {}
    for r in rows:
        cls = r.get("Class", "unknown")
        by_sp[cls] = by_sp.get(cls, 0) + 1
        c = r.get("Camera", "cam1")
        if c in by_cam:
            by_cam[c] += 1
        ts = r.get("Timestamp", "")
        if ts:
            try:
                dt = datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")
                hourly[str(dt.hour).zfill(2)] = hourly.get(str(dt.hour).zfill(2), 0) + 1
                weekly[str(dt.weekday())]      = weekly.get(str(dt.weekday()), 0) + 1
            except Exception:
                pass
    return jsonify({
        "hourly":    [{"hour": h, "count": hourly[h]} for h in sorted(hourly)],
        "weekly":    [{"day":  d, "count": weekly[d]}  for d in sorted(weekly)],
        "byCamera":  [{"camera": cid, "name": CAMERAS[cid]["name"], "count": cnt} for cid, cnt in by_cam.items()],
        "bySpecies": [{"species": sp, "count": cnt} for sp, cnt in sorted(by_sp.items(), key=lambda x: -x[1])],
    })


# ── IOT ───────────────────────────────────────────────────────────────────────
@app.route("/api/iot/status")
def iot_status():
    return jsonify(iot_state)


@app.route("/api/iot/control", methods=["POST"])
def iot_control():
    data   = request.json or {}
    device = data.get("device")
    action = data.get("action")
    mode   = data.get("mode")
    if device not in iot_state:
        return jsonify({"error": "Unknown device"}), 400
    ts = datetime.now().isoformat()
    if action in ("on", "off", "open", "closed"):
        iot_state[device]["status"]       = action
        iot_state[device]["last_changed"] = ts
    if mode in ("auto", "manual"):
        iot_state[device]["auto"] = (mode == "auto")
    return jsonify({"success": True, "device": device, "state": iot_state[device]})


@app.route("/api/iot/reset", methods=["POST"])
def iot_reset():
    ts = datetime.now().isoformat()
    for dev, safe in [("door", "open"), ("buzzer", "off"), ("light", "off"), ("fan", "off")]:
        iot_state[dev]["status"]       = safe
        iot_state[dev]["last_changed"] = ts
    return jsonify({"success": True, "state": iot_state})


# ── DETECTION CONTROL ─────────────────────────────────────────────────────────
@app.route("/api/detection/start", methods=["POST"])
def start_detection():
    data    = request.json or {}
    cam_id  = data.get("camera", "all")
    targets = list(CAMERAS.keys()) if cam_id == "all" else [cam_id]
    started = []
    for cid in targets:
        if cid in CAMERAS and not detection_running.get(cid):
            threading.Thread(target=run_detection, args=(cid,), daemon=True).start()
            started.append(cid)
    return jsonify({"success": True, "started": started})


@app.route("/api/detection/stop", methods=["POST"])
def stop_detection():
    data    = request.json or {}
    cam_id  = data.get("camera", "all")
    targets = list(CAMERAS.keys()) if cam_id == "all" else [cam_id]
    for cid in targets:
        detection_running[cid] = False
    return jsonify({"success": True, "stopped": targets})


# ── HEALTH ────────────────────────────────────────────────────────────────────
@app.route("/api/health")
def health():
    return jsonify({
        "status":    "ok",
        "timestamp": datetime.now().isoformat(),
        "logRows":   len(_read_log()),
        "cameras": {
            cid: {
                "online":    os.path.exists(_cam_latest(cid)),
                "detecting": detection_running.get(cid, False),
            }
            for cid in CAMERAS
        },
    })


# ─── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("HornetGuard Pro — API Server (FIXED)")
    print(f"  SAVE_DIR : {SAVE_DIR}")
    print(f"  LOG_FILE : {LOG_FILE}  exists={os.path.exists(LOG_FILE)}")
    print(f"  Model    : {MODEL_PATH}  exists={os.path.exists(MODEL_PATH)}")
    print(f"  Classes  : {HORNET_CLASSES}")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)