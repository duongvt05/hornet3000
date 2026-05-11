from flask import Flask, jsonify, send_from_directory, Response, request
from flask_cors import CORS
import pandas as pd
import os
import time
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# =====================================================
# ⚙️  CẤU HÌNH - Chỉnh đường dẫn cho phù hợp máy bạn
# =====================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(BASE_DIR, 'log.csv')
SAVE_DIR = os.path.join(BASE_DIR, 'detections')

# Cột trong log.csv: Timestamp, Class, Confidence, Camera, Image_Path
# =====================================================


# =========================
# HELPERS
# =========================
def load_log():
    if not os.path.exists(LOG_FILE):
        return pd.DataFrame(columns=['Timestamp', 'Class', 'Confidence', 'Camera', 'Image_Path'])
    try:
        df = pd.read_csv(LOG_FILE)
        # Chuẩn hóa tên cột (đề phòng khoảng trắng)
        df.columns = [c.strip() for c in df.columns]
        return df
    except Exception:
        return pd.DataFrame(columns=['Timestamp', 'Class', 'Confidence', 'Camera', 'Image_Path'])


# =========================
# VIDEO STREAM
# =========================
def generate_video_stream():
    """Đọc file ảnh mới nhất và stream MJPEG liên tục"""
    latest_path = os.path.join(SAVE_DIR, 'cam1_latest.jpg')
    while True:
        if os.path.exists(latest_path):
            try:
                with open(latest_path, 'rb') as f:
                    frame = f.read()
                yield (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' +
                    frame +
                    b'\r\n'
                )
            except Exception as e:
                print('Stream error:', e)
        else:
            # Khi chưa có frame, trả về ảnh placeholder nhỏ (1x1 JPEG đen)
            placeholder = (
                b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
                b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
                b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
                b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e\xb6'
                b'\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4'
                b'\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00'
                b'\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b'
                b'\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05'
                b'\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06'
                b'\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br'
                b'\x82\t\n\x16\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJSTUVWXYZ'
                b'cdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94'
                b'\x95\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa'
                b'\xb2\xb3\xb4\xb5\xb6\xb7\xb8\xb9\xba\xc2\xc3\xc4\xc5\xc6\xc7'
                b'\xc8\xc9\xca\xd2\xd3\xd4\xd5\xd6\xd7\xd8\xd9\xda\xe1\xe2\xe3'
                b'\xe4\xe5\xe6\xe7\xe8\xe9\xea\xf1\xf2\xf3\xf4\xf5\xf6\xf7\xf8'
                b'\xf9\xfa\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd4P\x00\x00'
                b'\x00\x1f\xff\xd9'
            )
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' +
                placeholder +
                b'\r\n'
            )
        time.sleep(0.08)


@app.route('/latest_frame')
@app.route('/api/video_feed')
def latest_frame():
    """
    MJPEG stream - dùng <img src="..."> trong React, KHÔNG dùng <video> hay fetch.
    """
    return Response(
        generate_video_stream(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


# =========================
# DASHBOARD STATS API  ← Fix format để React đọc đúng
# =========================
@app.route('/api/stats')
def get_stats():
    df = load_log()

    if df.empty:
        return jsonify({
            'hornetDetections': 0,
            'beeDetections': 0,
            'aiAccuracy': 0.0,
            'camerasOnline': 1,
            'totalCameras': 1,
            'todayAlerts': 0,
            'totalDetections': 0,
        })

    try:
        today = datetime.now().strftime('%Y-%m-%d')
        df_today = df[df['Timestamp'].astype(str).str.startswith(today)] if 'Timestamp' in df.columns else df

        # Phân loại: nếu Class chứa 'hornet' → hornet, còn lại → bee/other
        is_hornet = df_today['Class'].astype(str).str.lower().str.contains('hornet') if 'Class' in df_today.columns else pd.Series([], dtype=bool)
        hornet_count = int(is_hornet.sum())
        bee_count = int(len(df_today) - hornet_count)

        avg_conf = float(df_today['Confidence'].astype(float).mean() * 100) if 'Confidence' in df_today.columns and len(df_today) > 0 else 0.0

        return jsonify({
            'hornetDetections': hornet_count,
            'beeDetections': bee_count,
            'aiAccuracy': round(avg_conf, 1),
            'camerasOnline': 1,
            'totalCameras': 1,
            'todayAlerts': hornet_count,  # Mỗi hornet = 1 alert
            'totalDetections': int(len(df_today)),
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =========================
# DETECTIONS API  ← Fix column mapping
# =========================
@app.route('/api/detections')
def get_detections():
    limit = int(request.args.get('limit', 20))
    df = load_log()

    if df.empty:
        return jsonify([])

    try:
        recent = df.tail(limit).copy()
        recent = recent.iloc[::-1]  # Mới nhất lên đầu

        results = []
        for i, row in recent.iterrows():
            cls = str(row.get('Class', 'Unknown'))
            conf = float(row.get('Confidence', 0))
            cam = str(row.get('Camera', 'cam1'))
            ts = str(row.get('Timestamp', ''))
            img = str(row.get('Image_Path', ''))

            is_hornet = 'hornet' in cls.lower()
            results.append({
                'id': i,
                'species': cls,
                'confidence': round(conf * 100, 1) if conf <= 1.0 else round(conf, 1),
                'camera': cam.upper() if not cam.lower().startswith('camera') else cam,
                'location': 'Hive Entrance',
                'timestamp': ts,
                'action': 'Alert Sent' if is_hornet else 'Logged',
                'imageUrl': f'/api/images/{img}' if img else None,
            })

        return jsonify(results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =========================
# ALERTS API  ← Endpoint bị thiếu, thêm vào
# =========================
@app.route('/api/alerts')
def get_alerts():
    df = load_log()

    if df.empty:
        return jsonify([])

    try:
        # Chỉ lấy hornet alerts (cái quan trọng nhất)
        recent = df.tail(50).copy()
        recent = recent.iloc[::-1]

        alerts = []
        for i, row in recent.iterrows():
            cls = str(row.get('Class', ''))
            conf = float(row.get('Confidence', 0))
            cam = str(row.get('Camera', 'cam1'))
            ts = str(row.get('Timestamp', ''))

            is_hornet = 'hornet' in cls.lower()
            conf_pct = round(conf * 100, 1) if conf <= 1.0 else round(conf, 1)

            alerts.append({
                'id': i,
                'type': 'hornet' if is_hornet else 'bee',
                'severity': 'high' if is_hornet and conf_pct >= 85 else 'medium' if is_hornet else 'low',
                'message': f'{"⚠ Hornet" if is_hornet else "Bee"} detected - {cls} ({conf_pct}%)',
                'camera': cam.upper(),
                'time': ts.split(' ')[1][:5] if ' ' in ts else ts,
                'confidence': conf_pct,
            })

        return jsonify(alerts[:20])

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =========================
# ANALYTICS API  ← Tính từ log.csv thật
# =========================
@app.route('/api/analytics')
def get_analytics():
    df = load_log()

    if df.empty:
        return jsonify({'weekly': [], 'species': [], 'hourly': [0] * 24})

    try:
        df['Timestamp'] = pd.to_datetime(df['Timestamp'], errors='coerce')
        df = df.dropna(subset=['Timestamp'])

        # Hourly pattern (24h)
        hourly = [0] * 24
        today = datetime.now().date()
        df_today = df[df['Timestamp'].dt.date == today]
        if not df_today.empty:
            for h, grp in df_today.groupby(df_today['Timestamp'].dt.hour):
                if 0 <= h < 24:
                    hourly[h] = len(grp)

        # Weekly (7 ngày gần nhất)
        weekly = []
        for d in range(6, -1, -1):
            day = today - timedelta(days=d)
            df_day = df[df['Timestamp'].dt.date == day]
            day_name = day.strftime('%a')
            hornet_n = int(df_day['Class'].astype(str).str.lower().str.contains('hornet').sum()) if not df_day.empty else 0
            bee_n = int(len(df_day) - hornet_n)
            weekly.append({'day': day_name, 'hornet': hornet_n, 'bee': bee_n})

        # Species distribution
        species_counts = df['Class'].value_counts().head(5)
        total = len(df)
        species = [
            {
                'name': cls,
                'count': int(cnt),
                'pct': round(cnt / total * 100),
                'isHornet': 'hornet' in cls.lower()
            }
            for cls, cnt in species_counts.items()
        ]

        return jsonify({
            'weekly': weekly,
            'species': species,
            'hourly': hourly,
            'totalDetections': total,
            'totalHornets': int(df['Class'].astype(str).str.lower().str.contains('hornet').sum()),
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =========================
# IMAGES
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
        'status': '🚀 Hornet AI API Running',
        'endpoints': {
            'stream': 'GET /latest_frame  (dùng <img src> trong React)',
            'stats': 'GET /api/stats',
            'detections': 'GET /api/detections?limit=20',
            'alerts': 'GET /api/alerts',
            'analytics': 'GET /api/analytics',
        }
    })


# =========================
# START
# =========================
if __name__ == '__main__':
    os.makedirs(SAVE_DIR, exist_ok=True)
    print('\n🚀 Hornet AI API Server')
    print('=' * 40)
    print('👉 http://127.0.0.1:5000')
    print('👉 Stream: http://127.0.0.1:5000/latest_frame')
    print('👉 Stats:  http://127.0.0.1:5000/api/stats')
    print('👉 Alerts: http://127.0.0.1:5000/api/alerts')
    print('=' * 40)
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)