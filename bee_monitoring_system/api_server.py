from flask import Flask, jsonify, send_from_directory, Response, request
from flask_cors import CORS
import pandas as pd
import os
import time

app = Flask(__name__)

# Cho phép React truy cập API
CORS(app)

LOG_FILE = r'E:\chuyennganh1\hornet3000\bee_monitoring_system\log.csv'

SAVE_DIR = r'E:\chuyennganh1\hornet3000\bee_monitoring_system\detections'

# =========================
# DASHBOARD STATS API
# =========================
@app.route('/api/stats', methods=['GET'])
def get_stats():

    if not os.path.exists(LOG_FILE):
        return jsonify({
            "total_alerts": 0,
            "recent": []
        })

    try:
        df = pd.read_csv(LOG_FILE)

        recent_records = df.tail(15).to_dict('records')
        recent_records.reverse()

        return jsonify({
            "total_alerts": len(df),
            "recent": recent_records
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# VIDEO STREAM GENERATOR
# =========================
def generate_video_stream():

    latest_path = os.path.join(SAVE_DIR, "cam1_latest.jpg")

    while True:

        if os.path.exists(latest_path):

            try:
                with open(latest_path, "rb") as f:
                    frame = f.read()

                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' +
                    frame +
                    b'\r\n'
                )

            except Exception as e:
                print("Video stream error:", e)

        time.sleep(0.08)

@app.route('/api/detections')
def get_detections():

    limit = 10

    try:
        limit = int(request.args.get('limit', 10))
    except:
        pass

    if not os.path.exists(LOG_FILE):
        return jsonify([])

    try:

        df = pd.read_csv(LOG_FILE)

        recent = df.tail(limit).to_dict('records')
        recent.reverse()

        return jsonify(recent)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
# =========================
# MAIN VIDEO API
# =========================
@app.route('/api/video_feed')
def video_feed():

    return Response(
        generate_video_stream(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


# =========================
# FIX FOR REACT DASHBOARD
# =========================
@app.route('/latest_frame')
def latest_frame():

    return Response(
        generate_video_stream(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


# =========================
# IMAGE API
# =========================
@app.route('/api/images/<filename>')
def get_image(filename):

    return send_from_directory(SAVE_DIR, filename)


# =========================
# ROOT TEST
# =========================
@app.route('/')
def home():

    return jsonify({
        "status": "Hornet AI API Running",
        "video_feed": "http://127.0.0.1:5000/latest_frame"
    })


# =========================
# START SERVER
# =========================
if __name__ == '__main__':

    os.makedirs(SAVE_DIR, exist_ok=True)

    print("🚀 API Server đang chạy tại:")
    print("👉 http://127.0.0.1:5000")
    print("👉 Video Feed:")
    print("👉 http://127.0.0.1:5000/latest_frame")

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=False,
        threaded=True
    )