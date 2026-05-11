"""
HornetGuard Pro - API Server
Hệ thống giám sát tổ ong thông minh - 3 camera + IoT
"""

import os, time, json, csv, threading
from datetime import datetime, timedelta
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import numpy as np

app = Flask(__name__)
CORS(app)

# ─── CẤU HÌNH ────────────────────────────────────────────────────────────────

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
SAVE_DIR    = os.path.join(BASE_DIR, "detected_frames")
LOG_FILE    = os.path.join(BASE_DIR, "log.csv")
HISTORY_DIR = os.path.join(BASE_DIR, "detection_history")
MODEL_PATH  = os.path.join(BASE_DIR, "best.pt")

os.makedirs(SAVE_DIR,    exist_ok=True)
os.makedirs(HISTORY_DIR, exist_ok=True)

# ─── IOT STATE ───────────────────────────────────────────────────────────────

iot_state = {
    "door":   {"status": "open", "auto": True,  "last_changed": None, "label": "Cửa tổ ong"},
    "buzzer": {"status": "off",  "auto": True,  "last_changed": None, "label": "Còi cảnh báo"},
    "light":  {"status": "off",  "auto": True,  "last_changed": None, "label": "Đèn xua đuổi"},
    "fan":    {"status": "off",  "auto": False, "last_changed": None, "label": "Quạt thổi"},
}

# ─── CAMERA CONFIG ───────────────────────────────────────────────────────────
# Đặt tên video: cam1_entrance.mp4 | cam2_hive.mp4 | cam3_field.mp4

CAMERAS = {
    "cam1": {
        "name": "Cổng vào tổ",
        "name_en": "Entrance Monitor",
        "source": os.path.join(BASE_DIR, "cam1_entrance.mp4"),
        "latest_jpg": os.path.join(SAVE_DIR, "cam1_latest.jpg"),
        "description": "Giám sát lối vào chính của tổ",
        "position": "Cổng",
        "icon": "door",
    },
    "cam2": {
        "name": "Thân tổ ong",
        "name_en": "Hive Body",
        "source": os.path.join(BASE_DIR, "cam2_hive.mp4"),
        "latest_jpg": os.path.join(SAVE_DIR, "cam2_latest.jpg"),
        "description": "Theo dõi hoạt động bên trong tổ",
        "position": "Tổ ong",
        "icon": "hexagon",
    },
    "cam3": {
        "name": "Vùng đồng hoa",
        "name_en": "Field Watch",
        "source": os.path.join(BASE_DIR, "cam3_field.mp4"),
        "latest_jpg": os.path.join(SAVE_DIR, "cam3_latest.jpg"),
        "description": "Cảnh báo sớm từ khu vực đồng hoa",
        "position": "Đồng hoa",
        "icon": "leaf",
    },
}

# ─── DETECTION THREADS ───────────────────────────────────────────────────────

detection_running = {cam_id: False for cam_id in CAMERAS}
_model = None

def _get_model():
    global _model
    if _model is None and os.path.exists(MODEL_PATH):
        try:
            from ultralytics import YOLO
            _model = YOLO(MODEL_PATH)
        except Exception as e:
            print(f"[YOLO] Failed to load: {e}")
    return _model

def run_detection(cam_id: str):
    """YOLO detection thread riêng cho mỗi camera."""
    cam = CAMERAS[cam_id]
    source = cam["source"]
    output = cam["latest_jpg"]

    if not os.path.exists(source):
        print(f"[{cam_id}] Video not found: {source}")
        return

    detection_running[cam_id] = True
    cap = cv2.VideoCapture(source)
    frame_count = 0
    model = _get_model()

    while detection_running[cam_id]:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        frame = cv2.resize(frame, (640, 360))
        frame_count += 1

        if model and frame_count % 2 == 0:
            results = model(frame, conf=0.4, verbose=False)[0]
            annotated = results.plot()
            for box in results.boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                label = model.names[cls]
                if label.lower() in ("hornet", "vespa", "ong_bap_cay"):
                    _log_detection(cam_id, label, conf, annotated.copy())
                    _trigger_iot(cam_id, conf)
            cv2.imwrite(output, annotated)
        else:
            cv2.imwrite(output, frame)

        time.sleep(0.033)

    cap.release()
    detection_running[cam_id] = False

def _log_detection(cam_id: str, label: str, conf: float, frame: np.ndarray):
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    img_name = f"{cam_id}_{ts}.jpg"
    img_path = os.path.join(HISTORY_DIR, img_name)
    cv2.imwrite(img_path, frame)

    fieldnames = ["Timestamp", "Camera", "Class", "Confidence", "Image_Path"]
    write_header = not os.path.exists(LOG_FILE) or os.path.getsize(LOG_FILE) == 0
    with open(LOG_FILE, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if write_header:
            writer.writeheader()
        writer.writerow({
            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Camera": cam_id,
            "Class": label,
            "Confidence": round(conf, 4),
            "Image_Path": img_path,
        })

def _trigger_iot(cam_id: str, conf: float):
    """Tự động kích hoạt IoT khi phát hiện ong bắp cày đủ tin cậy."""
    if conf < 0.55:
        return
    ts = datetime.now().isoformat()
    # Đóng cửa để ngăn hornet vào tổ
    if iot_state["door"]["auto"]:
        iot_state["door"]["status"] = "closed"
        iot_state["door"]["last_changed"] = ts
    # Bật còi để xua đuổi
    if iot_state["buzzer"]["auto"]:
        iot_state["buzzer"]["status"] = "on"
        iot_state["buzzer"]["last_changed"] = ts
    # Bật đèn tần số cao xua đuổi
    if iot_state["light"]["auto"]:
        iot_state["light"]["status"] = "on"
        iot_state["light"]["last_changed"] = ts

# ─── MJPEG STREAM ────────────────────────────────────────────────────────────

def _generate_stream(cam_id: str):
    latest = CAMERAS[cam_id]["latest_jpg"]
    placeholder = _make_placeholder(cam_id)
    while True:
        if os.path.exists(latest):
            try:
                with open(latest, "rb") as f:
                    frame = f.read()
            except Exception:
                frame = placeholder
        else:
            frame = placeholder
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        )
        time.sleep(0.05)

def _make_placeholder(cam_id: str) -> bytes:
    img = np.zeros((360, 640, 3), dtype=np.uint8)
    img[:] = (22, 27, 34)
    cam = CAMERAS.get(cam_id, {})
    text = cam.get("name", cam_id)
    cv2.putText(img, text, (180, 160),
                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (80, 160, 80), 2)
    cv2.putText(img, "Dang ket noi...", (220, 200),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 100, 100), 1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()

# ─── ROUTES ──────────────────────────────────────────────────────────────────

@app.route("/latest_frame/<cam_id>")
def latest_frame(cam_id: str):
    if cam_id not in CAMERAS:
        return jsonify({"error": "Camera not found"}), 404
    return Response(
        _generate_stream(cam_id),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

@app.route("/latest_frame")
def latest_frame_default():
    return latest_frame("cam1")

@app.route("/api/cameras")
def api_cameras():
    result = {}
    for cam_id, cam in CAMERAS.items():
        result[cam_id] = {
            "id": cam_id,
            "name": cam["name"],
            "name_en": cam["name_en"],
            "description": cam["description"],
            "position": cam["position"],
            "icon": cam["icon"],
            "online": os.path.exists(cam["latest_jpg"]),
            "streamUrl": f"http://127.0.0.1:5000/latest_frame/{cam_id}",
        }
    return jsonify(result)

@app.route("/api/stats")
def api_stats():
    rows = _read_log()
    now = datetime.now()
    hornet_rows = [r for r in rows
                   if any(k in r.get("Class", "").lower()
                          for k in ("hornet", "vespa", "ong_bap_cay"))]
    bee_rows = [r for r in rows if "bee" in r.get("Class", "").lower()]
    today = [r for r in hornet_rows
             if r.get("Timestamp", "").startswith(now.strftime("%Y-%m-%d"))]
    week = [r for r in hornet_rows if _within_days(r, 7)]
    confs = [float(r["Confidence"]) for r in rows if r.get("Confidence")]
    ai_accuracy = round(sum(confs) / len(confs) * 100, 1) if confs else 94.2
    return jsonify({
        "hornetDetections": len(hornet_rows),
        "beeDetections": len(bee_rows),
        "todayAlerts": len(today),
        "weeklyAlerts": len(week),
        "aiAccuracy": ai_accuracy,
        "totalDetections": len(rows),
        "cameraStatus": {
            cid: {"online": os.path.exists(CAMERAS[cid]["latest_jpg"]),
                  "name": CAMERAS[cid]["name"]}
            for cid in CAMERAS
        },
    })

@app.route("/api/alerts")
def api_alerts():
    rows = _read_log()
    limit = int(request.args.get("limit", 20))
    cam = request.args.get("camera")
    alerts = []
    for r in reversed(rows):
        if cam and r.get("Camera") != cam:
            continue
        conf = float(r.get("Confidence", 0))
        cam_id = r.get("Camera", "cam1")
        cls = r.get("Class", "unknown")
        if not any(k in cls.lower() for k in ("hornet", "vespa", "ong_bap_cay")):
            continue  # chỉ alert cho hornet
        alerts.append({
            "id": f"{cam_id}_{r.get('Timestamp','')}",
            "timestamp": r.get("Timestamp", ""),
            "camera": cam_id,
            "cameraName": CAMERAS.get(cam_id, {}).get("name", cam_id),
            "species": cls,
            "confidence": round(conf * 100, 1),
            "severity": "high" if conf > 0.75 else "medium" if conf > 0.5 else "low",
            "imagePath": r.get("Image_Path", ""),
        })
    return jsonify({"alerts": alerts[:limit], "total": len(alerts)})

@app.route("/api/detections")
def api_detections():
    rows = _read_log()
    limit = int(request.args.get("limit", 50))
    detections = []
    for r in reversed(rows):
        conf = float(r.get("Confidence", 0))
        cam_id = r.get("Camera", "cam1")
        detections.append({
            "id": f"{cam_id}_{r.get('Timestamp','')}",
            "timestamp": r.get("Timestamp", ""),
            "camera": cam_id,
            "cameraName": CAMERAS.get(cam_id, {}).get("name", cam_id),
            "species": r.get("Class", "unknown"),
            "confidence": round(conf * 100, 1),
            "imagePath": r.get("Image_Path", ""),
        })
    return jsonify({"detections": detections[:limit], "total": len(detections)})

@app.route("/api/history")
def api_history():
    rows = _read_log()
    limit = int(request.args.get("limit", 30))
    cam = request.args.get("camera")
    history = []
    for r in reversed(rows):
        if cam and r.get("Camera") != cam:
            continue
        cam_id = r.get("Camera", "cam1")
        img_path = r.get("Image_Path", "")
        history.append({
            "timestamp": r.get("Timestamp", ""),
            "camera": cam_id,
            "cameraName": CAMERAS.get(cam_id, {}).get("name", cam_id),
            "species": r.get("Class", "unknown"),
            "confidence": round(float(r.get("Confidence", 0)) * 100, 1),
            "hasImage": os.path.exists(img_path) if img_path else False,
            "imagePath": img_path,
        })
    return jsonify({"history": history[:limit], "total": len(history)})

@app.route("/api/analytics")
def api_analytics():
    rows = _read_log()
    hourly = {str(h).zfill(2): 0 for h in range(24)}
    weekly = {str(d): 0 for d in range(7)}
    by_camera = {cam_id: 0 for cam_id in CAMERAS}
    by_species = {}
    for r in rows:
        cls = r.get("Class", "unknown")
        by_species[cls] = by_species.get(cls, 0) + 1
        cam = r.get("Camera", "cam1")
        if cam in by_camera:
            by_camera[cam] += 1
        ts = r.get("Timestamp", "")
        if ts:
            try:
                dt = datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")
                h = str(dt.hour).zfill(2)
                d = str(dt.weekday())
                hourly[h] = hourly.get(h, 0) + 1
                weekly[d] = weekly.get(d, 0) + 1
            except Exception:
                pass
    return jsonify({
        "hourly": [{"hour": h, "count": hourly[h]} for h in sorted(hourly)],
        "weekly": [{"day": d, "count": weekly[d]} for d in sorted(weekly)],
        "byCamera": [
            {"camera": cid, "name": CAMERAS[cid]["name"], "count": cnt}
            for cid, cnt in by_camera.items()
        ],
        "bySpecies": [
            {"species": sp, "count": cnt}
            for sp, cnt in sorted(by_species.items(), key=lambda x: -x[1])
        ],
    })

@app.route("/api/iot/status")
def iot_status():
    return jsonify(iot_state)

@app.route("/api/iot/control", methods=["POST"])
def iot_control():
    data = request.json or {}
    device = data.get("device")
    action = data.get("action")
    mode = data.get("mode")
    if device not in iot_state:
        return jsonify({"error": "Unknown device"}), 400
    ts = datetime.now().isoformat()
    if action in ("on", "off", "open", "closed"):
        iot_state[device]["status"] = action
        iot_state[device]["last_changed"] = ts
    if mode in ("auto", "manual"):
        iot_state[device]["auto"] = (mode == "auto")
    return jsonify({"success": True, "device": device, "state": iot_state[device]})

@app.route("/api/iot/reset", methods=["POST"])
def iot_reset():
    ts = datetime.now().isoformat()
    for dev, safe in [("door", "open"), ("buzzer", "off"), ("light", "off"), ("fan", "off")]:
        iot_state[dev]["status"] = safe
        iot_state[dev]["last_changed"] = ts
    return jsonify({"success": True, "state": iot_state})

@app.route("/api/detection/start", methods=["POST"])
def start_detection():
    data = request.json or {}
    cam_id = data.get("camera", "all")
    targets = list(CAMERAS.keys()) if cam_id == "all" else [cam_id]
    for cid in targets:
        if not detection_running.get(cid):
            t = threading.Thread(target=run_detection, args=(cid,), daemon=True)
            t.start()
    return jsonify({"success": True, "started": targets})

@app.route("/api/detection/stop", methods=["POST"])
def stop_detection():
    data = request.json or {}
    cam_id = data.get("camera", "all")
    targets = list(CAMERAS.keys()) if cam_id == "all" else [cam_id]
    for cid in targets:
        detection_running[cid] = False
    return jsonify({"success": True, "stopped": targets})

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def _read_log():
    if not os.path.exists(LOG_FILE):
        return []
    rows = []
    with open(LOG_FILE, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows

def _within_days(row, days: int) -> bool:
    ts = row.get("Timestamp", "")
    if not ts:
        return False
    try:
        dt = datetime.strptime(ts, "%Y-%m-%d %H:%M:%S")
        return dt >= datetime.now() - timedelta(days=days)
    except Exception:
        return False

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)