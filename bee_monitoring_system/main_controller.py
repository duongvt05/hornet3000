"""
main_controller.py — HornetGuard Pro (FIXED)
============================================
Fix:
  1. PermissionError Windows: dùng cv2.imwrite trực tiếp thay os.replace()
     → ghi atomic bằng cách imwrite vào file tmp rồi dùng shutil.copy2 (không rename)
  2. Hỗ trợ multi-camera: mỗi cam chạy trong thread riêng
  3. Vòng lặp video tự loop khi hết
  4. Telegram cooldown per-camera (không block các cam khác)
"""

import cv2
import datetime
import os
import time
import shutil
import threading
import requests
import pandas as pd
from ultralytics import YOLO

# ─── TELEGRAM CONFIG ──────────────────────────────────────────────────────────
TELEGRAM_TOKEN   = "8676031026:AAHfr0_eLle3eFq0hv1yU26boHB9V3oaMQM"
TELEGRAM_CHAT_ID = "8797482742"
ALERT_COOLDOWN   = 30   # giây giữa 2 lần gửi Telegram (per camera)

def send_telegram_alert(photo_path: str, label: str, conf: float, cam_id: str):
    url     = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto"
    caption = (
        f"⚠️ CẢNH BÁO: Phát hiện {label}!\n"
        f"📷 Camera: {cam_id}\n"
        f"🎯 Độ tin cậy: {conf:.2f}\n"
        f"⏰ Thời gian: {datetime.datetime.now().strftime('%H:%M:%S')}"
    )
    try:
        with open(photo_path, "rb") as photo:
            r = requests.post(
                url,
                data={"chat_id": TELEGRAM_CHAT_ID, "caption": caption},
                files={"photo": photo},
                timeout=10,
            )
        if r.status_code == 200:
            print(f"  ✅ [{cam_id}] Đã gửi Telegram!")
        else:
            print(f"  ❌ [{cam_id}] Telegram lỗi: {r.text[:80]}")
    except Exception as e:
        print(f"  ❌ [{cam_id}] Gửi Telegram thất bại: {e}")

# ─── SYSTEM CONFIG ────────────────────────────────────────────────────────────
MODEL_PATH     = r"yolov8sModel/weights/best.pt"
LOG_FILE       = "log.csv"
SAVE_DIR       = "detections"
CONF_THRESHOLD = 0.8
HORNET_CLASSES = {"vcra", "vespsp"}

# Danh sách camera: thêm/bớt tuỳ ý
# source: đường dẫn video file hoặc số (0 = webcam)
CAMERAS = [
    {"id": "cam1", "source": r"test_hornet_result.mp4"},
    # Bỏ comment 2 dòng dưới khi có video cam2/cam3
    {"id": "cam2", "source": r"cam2_hive.mp4"},
    {"id": "cam3", "source": r"cam3_field.mp4"},
]

os.makedirs(SAVE_DIR, exist_ok=True)

# ─── LOAD MODEL (1 lần duy nhất, dùng chung) ─────────────────────────────────
print("--- ĐANG KHỞI ĐỘNG HỆ THỐNG AI GIÁM SÁT ---")
try:
    model = YOLO(MODEL_PATH)
    print(f"✅ Mô hình AI đã sẵn sàng. Classes: {model.names}")
except Exception as e:
    print(f"❌ Lỗi load model: {e}")
    exit()

log_lock = threading.Lock()   # tránh 2 thread ghi CSV cùng lúc

# ─── GHI FILE AN TOÀN TRÊN WINDOWS ───────────────────────────────────────────
def safe_write_latest(frame, cam_id: str):
    """
    Ghi frame mới nhất vào detections/<cam_id>_latest.jpg một cách an toàn.
    Windows không cho os.replace() khi file đang bị đọc → dùng shutil.copy2().
    """
    latest_path = os.path.join(SAVE_DIR, f"{cam_id}_latest.jpg")
    tmp_path    = os.path.join(SAVE_DIR, f"{cam_id}_latest_tmp.jpg")

    # Bước 1: ghi vào file tmp
    ok = cv2.imwrite(tmp_path, frame)
    if not ok:
        return

    # Bước 2: copy đè (không rename) → Windows không bị PermissionError
    for attempt in range(6):
        try:
            shutil.copy2(tmp_path, latest_path)
            break
        except PermissionError:
            time.sleep(0.02)   # chờ Flask nhả file (~20ms) rồi thử lại

    # Bước 3: xóa tmp (không cần thiết nhưng giữ sạch thư mục)
    try:
        os.remove(tmp_path)
    except Exception:
        pass

# ─── VÒNG LẶP MỖI CAMERA ─────────────────────────────────────────────────────
def run_camera(cam_cfg: dict):
    cam_id = cam_cfg["id"]
    source = cam_cfg["source"]

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"❌ [{cam_id}] Không mở được: {source}")
        return

    print(f"🎬 [{cam_id}] Bắt đầu giám sát từ: {source}")
    frame_count     = 0
    last_alert_time = 0   # cooldown Telegram riêng cho từng cam

    while True:
        ret, frame = cap.read()
        if not ret:
            # Hết video → lặp lại từ đầu
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        frame_count += 1
        results = model(frame, conf=0.5, verbose=False)[0]
        detected_hornet = False

        for box in results.boxes:
            cls_id = int(box.cls[0])
            label  = model.names[cls_id]
            conf   = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            if label in HORNET_CLASSES and conf >= CONF_THRESHOLD:
                detected_hornet = True
                now       = datetime.datetime.now()
                timestamp = now.strftime("%Y-%m-%d %H:%M:%S")
                time_str  = now.strftime("%Y%m%d_%H%M%S_%f")

                # Vẽ khung ĐỎ cảnh báo
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 4)
                cv2.putText(
                    frame, f"WARNING: {label} {conf:.2f}",
                    (x1, y1 - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2
                )

                # Lưu ảnh bằng chứng
                img_filename = f"alert_{cam_id}_{time_str}.jpg"
                img_path     = os.path.join(SAVE_DIR, img_filename)
                cv2.imwrite(img_path, frame)

                # Telegram (cooldown per camera)
                current_time = time.time()
                if current_time - last_alert_time > ALERT_COOLDOWN:
                    last_alert_time = current_time
                    threading.Thread(
                        target=send_telegram_alert,
                        args=(img_path, label, conf, cam_id),
                        daemon=True,
                    ).start()

                # Ghi log CSV (thread-safe)
                log_entry = pd.DataFrame([{
                    "Timestamp":  timestamp,
                    "Camera":     cam_id,
                    "Class":      label,
                    "Confidence": round(conf, 2),
                    "Image_Path": img_filename,
                }])
                with log_lock:
                    write_header = not os.path.exists(LOG_FILE) or os.path.getsize(LOG_FILE) == 0
                    log_entry.to_csv(LOG_FILE, mode="a", index=False, header=write_header)

                print(f"⚠️  [{timestamp}] [{cam_id}] PHÁT HIỆN {label} ({conf:.2f})")

            else:
                # Vẽ khung XANH bình thường
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(
                    frame, f"{label} {conf:.2f}",
                    (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1
                )

        # Timestamp lên góc frame
        ts_text = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, f"[{cam_id}] {ts_text}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)

        # Cập nhật frame stream mỗi 3 frame — AN TOÀN TRÊN WINDOWS
        if frame_count % 3 == 0:
            safe_write_latest(frame, cam_id)

        # Lưu riêng frame alert mới nhất
        if detected_hornet:
            cv2.imwrite(os.path.join(SAVE_DIR, f"{cam_id}_alert_latest.jpg"), frame)

        # Bỏ comment nếu muốn xem cửa sổ video khi chạy
        # cv2.imshow(f"[{cam_id}] AI Hornet Monitoring", cv2.resize(frame, (800, 450)))
        # if cv2.waitKey(1) & 0xFF == ord("q"):
        #     break

    cap.release()

# ─── MAIN: khởi chạy tất cả camera song song ─────────────────────────────────
if __name__ == "__main__":
    if len(CAMERAS) == 1:
        # 1 camera → chạy thẳng, không cần thread
        run_camera(CAMERAS[0])
    else:
        # Nhiều camera → mỗi cam 1 thread
        threads = []
        for cam_cfg in CAMERAS:
            t = threading.Thread(target=run_camera, args=(cam_cfg,), daemon=True)
            t.start()
            threads.append(t)
            print(f"🚀 Đã khởi động thread: {cam_cfg['id']}")

        print("✅ Tất cả camera đang chạy. Nhấn Ctrl+C để dừng.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Đã dừng hệ thống.")

    cv2.destroyAllWindows()