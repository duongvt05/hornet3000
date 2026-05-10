"""
api_server.py — Flask backend cho Hornet AI Dashboard
Kết nối với main_controller.py (YOLO detection)
Chạy: python api_server.py
"""

from flask import Flask, send_file, jsonify, request
from flask_cors import CORS
import os
import csv
import json
from datetime import datetime
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Cho phép React (localhost:5173) gọi API

# ============================================================
# CONFIG — chỉnh theo cấu trúc folder của bạn
# ============================================================
DETECTIONS_DIR = "detections"        # folder chứa ảnh từ YOLO
LOG_FILE = "log.csv"                 # file CSV từ main_controller.py
LATEST_FRAME_DIR = "detections"      # ảnh latest từ mỗi camera
# ============================================================


@app.route("/latest_frame")
def latest_frame():
    """
    Trả về ảnh mới nhất có bounding box từ YOLO.
    React dùng: <img src="http://localhost:5000/latest_frame?cam=1" />
    """
    cam_id = request.args.get("cam", "1")
    
    # Tìm ảnh theo tên camera
    candidates = [
        f"{DETECTIONS_DIR}/cam{cam_id}_latest.jpg",
        f"{DETECTIONS_DIR}/latest_cam{cam_id}.jpg",
        f"{DETECTIONS_DIR}/cam{cam_id}.jpg",
        f"{DETECTIONS_DIR}/latest.jpg",  # fallback
    ]
    
    for path in candidates:
        if os.path.exists(path):
            return send_file(path, mimetype="image/jpeg",
                           max_age=0,  # không cache để luôn fresh
                           last_modified=datetime.now())
    
    # Nếu không có ảnh, trả 404
    return jsonify({"error": "No frame available", "cam": cam_id}), 404


@app.route("/api/stats")
def get_stats():
    """
    Thống kê tổng hợp cho Dashboard metrics cards.
    Đọc từ log.csv của main_controller.py
    """
    stats = {
        "hornetDetections": 0,
        "beeDetections": 0,
        "aiAccuracy": 96.4,
        "camerasOnline": 3,
        "totalCameras": 4,
        "todayAlerts": 0,
        "lastUpdated": datetime.now().isoformat(),
    }
    
    if os.path.exists(LOG_FILE):
        today = datetime.now().strftime("%Y-%m-%d")
        hornet_confs = []
        
        try:
            with open(LOG_FILE, "r", newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Bỏ qua row không phải hôm nay
                    row_date = row.get("timestamp", row.get("time", ""))[:10]
                    if row_date != today:
                        continue
                    
                    species = row.get("species", row.get("class", "")).lower()
                    confidence = float(row.get("confidence", row.get("conf", 0)) or 0)
                    
                    if "hornet" in species:
                        stats["hornetDetections"] += 1
                        stats["todayAlerts"] += 1
                        hornet_confs.append(confidence)
                    elif "bee" in species:
                        stats["beeDetections"] += 1
                    
            if hornet_confs:
                stats["aiAccuracy"] = round(sum(hornet_confs) / len(hornet_confs) * 100, 1)
        except Exception as e:
            print(f"Error reading log.csv: {e}")
    
    return jsonify(stats)


@app.route("/api/detections")
def get_detections():
    """
    Danh sách detection events — cho bảng RecentDetections.
    Query params:
      - limit: số lượng record (default 20)
      - camera: lọc theo camera ID
    """
    limit = int(request.args.get("limit", 20))
    camera_filter = request.args.get("camera", None)
    
    detections = []
    
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r", newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            # Mới nhất trước
            rows.reverse()
            
            for i, row in enumerate(rows):
                if len(detections) >= limit:
                    break
                
                camera = row.get("camera", row.get("cam", f"Camera {(i % 3) + 1}"))
                
                if camera_filter and camera_filter not in camera:
                    continue
                
                species = row.get("species", row.get("class", "Unknown"))
                confidence = float(row.get("confidence", row.get("conf", 0)) or 0)
                timestamp = row.get("timestamp", row.get("time", datetime.now().isoformat()))
                
                detections.append({
                    "id": i + 1,
                    "species": species,
                    "confidence": round(confidence * 100 if confidence <= 1 else confidence, 1),
                    "camera": camera,
                    "location": row.get("location", "Unknown"),
                    "timestamp": timestamp,
                    "action": "Alert Sent" if "hornet" in species.lower() else "Logged",
                    "imageFile": row.get("image_file", row.get("image", "")),
                })
        except Exception as e:
            print(f"Error reading detections: {e}")
    
    # Mock data nếu không có log file (để dev)
    if not detections:
        detections = [
            {"id": 1, "species": "Asian Hornet", "confidence": 98.2, "camera": "Camera 1", "location": "North Hive", "timestamp": "2025-05-10 14:32:01", "action": "Alert Sent"},
            {"id": 2, "species": "Honey Bee", "confidence": 95.7, "camera": "Camera 2", "location": "East Field", "timestamp": "2025-05-10 14:28:45", "action": "Logged"},
        ]
    
    return jsonify(detections)


@app.route("/api/alerts")
def get_alerts():
    """
    Danh sách alerts — cho AlertPanel và AlertsCenter.
    """
    alerts = []
    
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r", newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                rows = list(reader)
            
            rows.reverse()
            
            for i, row in enumerate(rows[:50]):
                species = row.get("species", row.get("class", "")).lower()
                if "hornet" not in species:
                    continue
                
                confidence = float(row.get("confidence", row.get("conf", 0)) or 0)
                conf_pct = round(confidence * 100 if confidence <= 1 else confidence, 1)
                timestamp = row.get("timestamp", row.get("time", ""))
                camera = row.get("camera", row.get("cam", f"Camera {(i % 3) + 1}"))
                
                alerts.append({
                    "id": i + 1,
                    "type": "hornet",
                    "message": f"Asian Hornet detected ({conf_pct}%)",
                    "camera": camera,
                    "time": timestamp,
                    "severity": "high" if conf_pct >= 90 else "medium",
                })
        except Exception as e:
            print(f"Error reading alerts: {e}")
    
    return jsonify(alerts)


@app.route("/api/daily_chart")
def get_daily_chart():
    """
    Dữ liệu biểu đồ 7 ngày cho Analytics page.
    """
    from collections import defaultdict
    
    daily = defaultdict(lambda: {"hornet": 0, "bee": 0})
    
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r", newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    ts = row.get("timestamp", row.get("time", ""))[:10]
                    species = row.get("species", row.get("class", "")).lower()
                    if "hornet" in species:
                        daily[ts]["hornet"] += 1
                    elif "bee" in species:
                        daily[ts]["bee"] += 1
        except Exception as e:
            print(f"Error: {e}")
    
    # Sort và lấy 7 ngày gần nhất
    sorted_days = sorted(daily.keys())[-7:]
    
    return jsonify({
        "labels": sorted_days,
        "hornet": [daily[d]["hornet"] for d in sorted_days],
        "bee": [daily[d]["bee"] for d in sorted_days],
    })


@app.route("/health")
def health():
    return jsonify({"status": "ok", "time": datetime.now().isoformat()})


if __name__ == "__main__":
    # Tạo folder detections nếu chưa có
    Path(DETECTIONS_DIR).mkdir(exist_ok=True)
    
    print("=" * 50)
    print("🐝 Hornet AI Flask API Server")
    print("=" * 50)
    print(f"Running on: http://localhost:5000")
    print(f"Detections dir: {DETECTIONS_DIR}/")
    print(f"Log file: {LOG_FILE}")
    print()
    print("Endpoints:")
    print("  GET /latest_frame?cam=1  → camera frame")
    print("  GET /api/stats           → dashboard metrics")
    print("  GET /api/detections      → detection log")
    print("  GET /api/alerts          → alert list")
    print("  GET /api/daily_chart     → chart data")
    print("=" * 50)
    
    app.run(host="0.0.0.0", port=5000, debug=True)
