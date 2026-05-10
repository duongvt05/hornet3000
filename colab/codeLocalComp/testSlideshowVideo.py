import cv2
import torch
from ultralytics import YOLO  # Đổi từ YOLOv10 sang YOLO để chạy với v8

# 1. Load mô hình YOLOv8 từ thư mục của bạn
# Sử dụng 'r' trước chuỗi để tránh lỗi đường dẫn Windows
model_path = r'yolov8sModel/weights/best.pt'
model = YOLO(model_path)

# 2. Cập nhật đường dẫn video đầu vào và đầu ra
input_video_path = r'test/video.mp4' # File video trong thư mục test của bạn
output_video_path = 'test_hornet_result.mp4'

# Mở video sử dụng OpenCV
video_capture = cv2.VideoCapture(input_video_path)

if not video_capture.isOpened():
    print(f"Lỗi: Không thể mở file video tại {input_video_path}")
    exit()

# Lấy các thuộc tính của video
frame_width = int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(video_capture.get(cv2.CAP_PROP_FPS))
if fps == 0: fps = 30 # Phòng trường hợp không lấy được fps
total_frames = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))

# Định nghĩa codec và tạo đối tượng ghi video
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out_video = cv2.VideoWriter(output_video_path, fourcc, fps, (frame_width, frame_height))

print(f"Bắt đầu xử lý: {total_frames} frames...")

frame_count = 0
while video_capture.isOpened():
    ret, frame = video_capture.read()
    if not ret:
        break
    
    # 3. Chạy nhận diện (Inference)
    # Chúng ta dùng stream=True để tiết kiệm RAM khi xử lý video dài
    results = model(frame, conf=0.5)[0] 
    
    # Duyệt qua các kết quả nhận diện
    for result in results.boxes.data.tolist():
        x1, y1, x2, y2, conf, cls = result[:6]
        
        # Ngưỡng tin cậy (Threshold) - Bạn có thể điều chỉnh số 0.77 này
        if conf > 0.77: 
            label = f'{model.names[int(cls)]} {conf:.2f}'
            
            # Vẽ Bounding Box (Màu đỏ: 0, 0, 255)
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 3)
            
            # Vẽ nhãn (Màu xanh: 255, 0, 0)
            cv2.putText(frame, label, (int(x1), int(y1 - 10)), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)

    # Ghi frame đã vẽ vào file đầu ra
    out_video.write(frame)
    
    frame_count += 1
    if frame_count % 10 == 0: # Cứ 10 frame in tiến độ 1 lần cho đỡ rác terminal
        print(f'Đang xử lý frame {frame_count}/{total_frames}')

# Giải phóng tài nguyên
video_capture.release()
out_video.release()
cv2.destroyAllWindows()

print(f'Thành công! Video đã lưu tại: {output_video_path}')