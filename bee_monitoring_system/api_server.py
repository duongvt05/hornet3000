from flask import Flask, jsonify, send_from_directory, Response
from flask_cors import CORS
import pandas as pd
import os
import time

app = Flask(__name__)
# Cho phép web React (chạy cổng 5173/3000) truy cập API mà không bị lỗi CORS
CORS(app) 

LOG_FILE = r'E:\chuyende1\hornet3000\log.csv'
SAVE_DIR = r'E:\chuyende1\hornet3000\detections'

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Trả về dữ liệu thống kê từ file CSV để làm bảng điều khiển (Dashboard)"""
    if not os.path.exists(LOG_FILE):
        return jsonify({"total_alerts": 0, "recent": []})
    
    try:
        df = pd.read_csv(LOG_FILE)
        # Lấy 15 cảnh báo gần nhất, đảo ngược thứ tự (mới nhất lên đầu)
        recent_records = df.tail(15).to_dict('records')
        recent_records.reverse()
        
        return jsonify({
            "total_alerts": len(df),
            "recent": recent_records
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def generate_video_stream():
    """Đọc liên tục ảnh latest do AI xuất ra để giả lập luồng video live"""
    latest_path = os.path.join(SAVE_DIR, "cam1_latest.jpg")
    while True:
        if os.path.exists(latest_path):
            try:
                with open(latest_path, "rb") as f:
                    frame = f.read()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            except Exception:
                pass
        time.sleep(0.1) # Duy trì stream khoảng 10-15 fps

@app.route('/api/video_feed')
def video_feed():
    """API cho tab Monitoring hiển thị Camera trực tiếp"""
    return Response(generate_video_stream(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/images/<filename>')
def get_image(filename):
    """API để web tải hình ảnh bằng chứng (các file alert_cam1_xxx.jpg)"""
    return send_from_directory(SAVE_DIR, filename)

if __name__ == '__main__':
    os.makedirs(SAVE_DIR, exist_ok=True)
    print("🚀 API Server đang chạy tại http://127.0.0.1:5000")
    print("👉 Hãy đảm bảo bạn đã mở ứng dụng Web React (TailAdmin)")
    app.run(host='0.0.0.0', port=5000, debug=False)