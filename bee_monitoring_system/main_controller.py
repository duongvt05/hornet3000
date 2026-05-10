import cv2
import datetime
import pandas as pd
from ultralytics import YOLO
import os
import requests
import time

# --- TELEGRAM CONFIG ---
TELEGRAM_TOKEN = "8676031026:AAHfr0_eLle3eFq0hv1yU26boHB9V3oaMQM"
TELEGRAM_CHAT_ID = "8797482742"
ALERT_COOLDOWN = 30
last_alert_time = 0

def send_telegram_alert(photo_path, label, conf):
    global last_alert_time
    current_time = time.time()
    if current_time - last_alert_time > ALERT_COOLDOWN:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto"
        caption = (
            f"⚠️ CẢNH BÁO: Phát hiện {label}!\n"
            f"🎯 Độ tin cậy: {conf:.2f}\n"
            f"⏰ Thời gian: {datetime.datetime.now().strftime('%H:%M:%S')}"
        )
        try:
            with open(photo_path, 'rb') as photo:
                response = requests.post(
                    url,
                    data={'chat_id': TELEGRAM_CHAT_ID, 'caption': caption},
                    files={'photo': photo}
                )
                if response.status_code == 200:
                    last_alert_time = current_time
                    print("✅ Đã gửi cảnh báo Telegram!")
                else:
                    print(f"❌ Lỗi Telegram: {response.text}")
        except Exception as e:
            print(f"❌ Lỗi gửi Telegram: {e}")

# --- SYSTEM CONFIG ---
MODEL_PATH   = r'yolov8sModel/weights/best.pt' # Đảm bảo đường dẫn model đúng
VIDEO_SOURCE = r'test_hornet_result.mp4'       # Có thể đổi thành 0 nếu dùng Webcam
LOG_FILE     = 'log.csv'
SAVE_DIR     = 'detections'
CONF_THRESHOLD = 0.8

os.makedirs(SAVE_DIR, exist_ok=True)

# --- KHỞI TẠO ---
print("--- ĐANG KHỞI ĐỘNG HỆ THỐNG AI GIÁM SÁT ---")
try:
    model = YOLO(MODEL_PATH)
    print("✅ Mô hình AI đã sẵn sàng.")
except Exception as e:
    print(f"❌ Lỗi load model: {e}")
    exit()

cap = cv2.VideoCapture(VIDEO_SOURCE)
if not cap.isOpened():
    print(f"❌ Không mở được video/camera: {VIDEO_SOURCE}")
    exit()

print("🎬 Bắt đầu giám sát... (Nhấn 'q' trên cửa sổ để thoát)")
frame_count = 0

# --- VÒNG LẶP CHÍNH ---
while True:
    ret, frame = cap.read()
    if not ret:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # Hết video thì lặp lại
        continue
    
    frame_count += 1
    results = model(frame, conf=0.5, verbose=False)[0]
    detected_hornet = False

    for box in results.boxes:
        cls_id = int(box.cls[0])
        label  = model.names[cls_id]
        conf   = float(box.conf[0])
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        if label in ['vcra', 'vespsp'] and conf >= CONF_THRESHOLD:
            detected_hornet = True
            now       = datetime.datetime.now()
            timestamp = now.strftime("%Y-%m-%d %H:%M:%S")
            time_str  = now.strftime('%Y%m%d_%H%M%S_%f')

            # Vẽ khung ĐỎ cảnh báo
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 4)
            cv2.putText(frame, f"WARNING: {label} {conf:.2f}",
                        (x1, y1 - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            # Lưu ảnh bằng chứng
            img_filename = f"alert_cam1_{time_str}.jpg"
            img_path = os.path.join(SAVE_DIR, img_filename)
            cv2.imwrite(img_path, frame)

            send_telegram_alert(img_path, label, conf)

            # Ghi log CSV
            log_entry = pd.DataFrame([{
                'Timestamp':  timestamp,
                'Class':      label,
                'Confidence': round(conf, 2),
                'Camera':     'cam1',
                'Image_Path': img_filename, # Chỉ lưu tên file để Web dễ đọc
            }])
            write_header = not os.path.exists(LOG_FILE)
            log_entry.to_csv(LOG_FILE, mode='a', index=False, header=write_header)
            
            print(f"⚠️  [{timestamp}] PHÁT HIỆN {label} ({conf:.2f})")
        else:
            # Vẽ khung XANH bình thường
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"{label} {conf:.2f}",
                        (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

    # Thêm thời gian lên góc
    ts_text = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(frame, ts_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    # TỐI ƯU: Cập nhật hình ảnh luồng trực tiếp mỗi 3 frame để giảm tải ổ cứng
    if frame_count % 3 == 0:
        latest_path = os.path.join(SAVE_DIR, "cam1_latest.jpg")
        temp_path = os.path.join(SAVE_DIR, "cam1_latest_temp.jpg")
        cv2.imwrite(temp_path, frame)
        os.replace(temp_path, latest_path) # Đổi tên nhanh tránh lỗi đọc file một nửa

    if detected_hornet:
        cv2.imwrite(os.path.join(SAVE_DIR, "cam1_alert_latest.jpg"), frame)

    # Bỏ comment 3 dòng dưới nếu muốn hiện cửa sổ video lúc chạy AI
    # cv2.imshow("AI Hornet Monitoring", cv2.resize(frame, (1024, 768)))
    # if cv2.waitKey(1) & 0xFF == ord('q'):
    #     break

cap.release()
cv2.destroyAllWindows()