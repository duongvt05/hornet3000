"""
HornetGuard Pro — API Server (FINAL)
======================================
Fix so với phiên bản cũ:
  1. Thêm /api/detections alias → RecentDetections.tsx cũ vẫn hoạt động
  2. /api/stats trả đủ camerasOnline, totalCameras cho HornetMetrics
  3. /api/alerts trả {alerts:[...], total:N} — không phải array thô
  4. /api/history trả {history:[...], total:N}
  5. /latest_frame/<cam_id> trả JPEG tĩnh + Cache-Control: no-cache
  6. CORS mở toàn bộ
  7. _read_log() đọc được cả CSV format cũ lẫn mới
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
SAVE_DIR     = os.path.join(BASE_DIR, "detections")
SAVE_DIR_ALT = os.path.join(BASE_DIR, "detected_frames")
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
        "source": os.path.join(BASE_DIR, "test_hornet_result.mp4"),
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
            print(f"[YOLO] Loaded: {_model.names}")
        except Exception as e:
            print(f"[YOLO] Error: {e}")
    return _model


def _cam_latest(cam_id: str) -> str:
    for d in [SAVE_DIR, SAVE_DIR_ALT]:
        p = os.path.join(d, f"{cam_id}_latest.jpg")
        if os.path.exists(p):
            return p
    return os.path.join(SAVE_DIR, f"{cam_id}_latest.jpg")


def _find_image(img_name: str):
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
    cv2.putText(img, "No stream - run main_controller.py", (80, 205),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 80, 80), 1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


def _no_cache(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"]        = "no-cache"
    response.headers["Expires"]       = "0"
    return response


def _read_log():
    """
    Đọc log.csv — xử lý được cả 2 format:
      OLD: Timestamp, Class, Confidence, Camera, Image_Path  (main_controller cũ)
      NEW: Timestamp, Camera, Class, Confidence, Image_Path  (api_server mới)
    """
    if not os.path.exists(LOG_FILE):
        return []
    try:
        rows = []
        with open(LOG_FILE, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Normalize keys: bất kể thứ tự cột
                normalized = {
                    "Timestamp":  row.get("Timestamp") or row.get("timestamp") or "",
                    "Camera":     row.get("Camera")    or row.get("camera")    or "cam1",
                    "Class":      row.get("Class")     or row.get("class")     or "unknown",
                    "Confidence": row.get("Confidence")or row.get("confidence")or "0",
                    "Image_Path": row.get("Image_Path")or row.get("image_path")or "",
                }
                rows.append(normalized)
        return rows
    except Exception as e:
        print(f"[LOG] Read error: {e}")
        return []


def _within_days(row, days):
    ts = row.get("Timestamp", "")
    if not ts:
        return False
    try:
        return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S") >= datetime.now() - timedelta(days=days)
    except Exception:
        return False

# ─── DETECTION THREAD ─────────────────────────────────────────────────────────

def _log_detection(cam_id, label, conf, frame):
    ts       = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    img_name = f"{cam_id}_{ts}.jpg"
    cv2.imwrite(os.path.join(SAVE_DIR, img_name), frame)
    fieldnames = ["Timestamp", "Camera", "Class", "Confidence", "Image_Path"]
    write_hdr  = not os.path.exists(LOG_FILE) or os.path.getsize(LOG_FILE) == 0
    with open(LOG_FILE, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        if write_hdr:
            w.writeheader()
        w.writerow({
            "Timestamp":  datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Camera":     cam_id,
            "Class":      label,
            "Confidence": round(conf, 4),
            "Image_Path": img_name,
        })


def _trigger_iot(conf):
    if conf < 0.55:
        return
    ts = datetime.now().isoformat()
    for dev in ["door", "buzzer", "light"]:
        if iot_state[dev]["auto"]:
            iot_state[dev]["status"]       = "closed" if dev == "door" else "on"
            iot_state[dev]["last_changed"] = ts


def run_detection(cam_id):
    source = CAMERAS[cam_id]["source"]
    output = os.path.join(SAVE_DIR, f"{cam_id}_latest.jpg")
    if not os.path.exists(source):
        print(f"[{cam_id}] Video not found: {source}")
        detection_running[cam_id] = False
        return
    detection_running[cam_id] = True
    cap = cv2.VideoCapture(source)
    fc  = 0
    model = _get_model()
    while detection_running[cam_id]:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue
        frame  = cv2.resize(frame, (640, 360))
        fc    += 1
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
            cv2.putText(annotated, ts_str, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)
            cv2.imwrite(output, annotated)
        else:
            cv2.putText(frame, ts_str, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)
            cv2.imwrite(output, frame)
        time.sleep(0.033)
    cap.release()
    detection_running[cam_id] = False

# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.route("/latest_frame")
@app.route("/latest_frame/<cam_id>")
def latest_frame(cam_id="cam1"):
    if cam_id not in CAMERAS:
        return jsonify({"error": "Camera not found"}), 404
    latest = _cam_latest(cam_id)
    if os.path.exists(latest):
        return _no_cache(send_file(latest, mimetype="image/jpeg"))
    return _no_cache(Response(_make_placeholder(cam_id), mimetype="image/jpeg"))


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


@app.route("/api/stats")
def api_stats():
    rows        = _read_log()
    now         = datetime.now()
    hornet_rows = [r for r in rows if r.get("Class", "").lower() in HORNET_CLASSES]
    today_rows  = [r for r in hornet_rows if r.get("Timestamp", "").startswith(now.strftime("%Y-%m-%d"))]
    week_rows   = [r for r in hornet_rows if _within_days(r, 7)]
    confs       = []
    for r in rows:
        try:
            confs.append(float(r["Confidence"]))
        except Exception:
            pass
    cam_statuses = {
        cid: {
            "online":           os.path.exists(_cam_latest(cid)),
            "name":             CAMERAS[cid]["name"],
            "detectionRunning": detection_running.get(cid, False),
        }
        for cid in CAMERAS
    }
    cameras_online = sum(1 for v in cam_statuses.values() if v["online"])
    return jsonify({
        "hornetDetections": len(hornet_rows),
        "beeDetections":    len([r for r in rows if "bee" in r.get("Class","").lower()]),
        "todayAlerts":      len(today_rows),
        "weeklyAlerts":     len(week_rows),
        "aiAccuracy":       round(sum(confs) / len(confs) * 100, 1) if confs else 0,
        "totalDetections":  len(rows),
        "camerasOnline":    cameras_online,     # ← HornetMetrics cần field này
        "totalCameras":     len(CAMERAS),       # ← HornetMetrics cần field này
        "cameraStatus":     cam_statuses,
    })


def _build_alert(r, cam_id):
    conf = 0.0
    try:
        conf = float(r.get("Confidence", 0))
    except Exception:
        pass
    conf_pct = round(conf * 100, 1) if conf <= 1 else round(conf, 1)
    return {
        "id":         f"{cam_id}_{r.get('Timestamp','')}",
        "timestamp":  r.get("Timestamp", ""),
        "camera":     cam_id,
        "cameraName": CAMERAS.get(cam_id, {}).get("name", cam_id),
        "species":    r.get("Class", "unknown"),
        "confidence": conf_pct,
        "severity":   "high" if conf_pct >= 75 else "medium" if conf_pct >= 50 else "low",
        "imagePath":  r.get("Image_Path", ""),
    }


@app.route("/api/alerts")
def api_alerts():
    rows  = _read_log()
    limit = int(request.args.get("limit", 20))
    cam   = request.args.get("camera")
    alerts = []
    for r in reversed(rows):
        if cam and r.get("Camera") != cam:
            continue
        if r.get("Class", "").lower() not in HORNET_CLASSES:
            continue
        cam_id = r.get("Camera", "cam1")
        alerts.append(_build_alert(r, cam_id))
    # FIX: trả {alerts: [...], total: N} — AlertPanel parse đúng
    return jsonify({"alerts": alerts[:limit], "total": len(alerts)})


def _build_history_item(r, cam_id, idx):
    conf = 0.0
    try:
        conf = float(r.get("Confidence", 0))
    except Exception:
        pass
    conf_pct = round(conf * 100, 1) if conf <= 1 else round(conf, 1)
    img_name = r.get("Image_Path", "")
    return {
        "id":         f"{cam_id}_{r.get('Timestamp','')}_{idx}",
        "timestamp":  r.get("Timestamp", ""),
        "camera":     cam_id,
        "cameraName": CAMERAS.get(cam_id, {}).get("name", cam_id),
        "species":    r.get("Class", "unknown"),
        "confidence": conf_pct,
        "hasImage":   _find_image(img_name) is not None,
        "imagePath":  img_name,
        # Thêm các field RecentDetections cần
        "location":   CAMERAS.get(cam_id, {}).get("position", cam_id),
        "action":     "Alert Sent" if conf_pct >= 75 else "Logged",
    }


@app.route("/api/history")
def api_history():
    rows  = _read_log()
    limit = int(request.args.get("limit", 30))
    cam   = request.args.get("camera")
    history = []
    for i, r in enumerate(reversed(rows)):
        if cam and r.get("Camera") != cam:
            continue
        cam_id = r.get("Camera", "cam1")
        history.append(_build_history_item(r, cam_id, i))
    # FIX: trả {history: [...], total: N} — RecentDetections parse đúng
    return jsonify({"history": history[:limit], "total": len(history)})


# ── FIX: alias /api/detections → cùng logic với /api/history ─────────────────
# RecentDetections.tsx cũ gọi /api/detections — redirect về /api/history
@app.route("/api/detections")
def api_detections():
    return api_history()


@app.route("/api/history/image")
def history_image():
    img_name = request.args.get("path", "")
    if not img_name:
        return jsonify({"error": "No path"}), 400
    img_full = _find_image(img_name)
    if img_full is None:
        return jsonify({"error": "Not found"}), 404
    return _no_cache(send_file(img_full, mimetype="image/jpeg"))


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
                hourly[str(dt.hour).zfill(2)] += 1
                weekly[str(dt.weekday())]      += 1
            except Exception:
                pass
    return jsonify({
        "hourly":    [{"hour": h, "count": hourly[h]} for h in sorted(hourly)],
        "weekly":    [{"day":  d, "count": weekly[d]}  for d in sorted(weekly)],
        "byCamera":  [{"camera": cid, "name": CAMERAS[cid]["name"], "count": cnt} for cid, cnt in by_cam.items()],
        "bySpecies": [{"species": sp, "count": cnt} for sp, cnt in sorted(by_sp.items(), key=lambda x: -x[1])],
    })


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
    for dev, safe in [("door","open"),("buzzer","off"),("light","off"),("fan","off")]:
        iot_state[dev]["status"]       = safe
        iot_state[dev]["last_changed"] = ts
    return jsonify({"success": True, "state": iot_state})


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


if __name__ == "__main__":
    print("=" * 60)
    print("HornetGuard Pro — API Server (FINAL)")
    print(f"  SAVE_DIR : {SAVE_DIR}")
    print(f"  LOG_FILE : {LOG_FILE}  exists={os.path.exists(LOG_FILE)}")
    print(f"  Model    : {MODEL_PATH}  exists={os.path.exists(MODEL_PATH)}")
    print(f"  Classes  : {HORNET_CLASSES}")
    print("  Endpoints: /api/alerts  /api/history  /api/detections  /api/stats")
    print("             /api/analytics  /api/iot/*  /latest_frame/<cam_id>")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)