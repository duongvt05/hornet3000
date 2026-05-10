# 🐝 Hornet AI Dashboard — Hướng dẫn setup

## Cấu trúc files đã sửa/tạo

```
hornet-ai/
├── src/
│   ├── App.tsx                          ← ĐÃ SỬA: routes mới
│   ├── layout/
│   │   └── AppSidebar.tsx               ← ĐÃ SỬA: menu Hornet AI
│   ├── pages/
│   │   ├── Dashboard/Home.tsx           ← ĐÃ SỬA: dashboard chính
│   │   ├── Monitoring/index.tsx         ← MỚI: live camera YOLO
│   │   ├── Analytics/index.tsx          ← MỚI: charts + trends
│   │   ├── AlertsCenter/index.tsx       ← MỚI: quản lý alerts
│   │   └── Settings/index.tsx           ← MỚI: cài đặt hệ thống
│   └── components/hornet/
│       ├── HornetMetrics.tsx            ← MỚI: 4 stats cards
│       ├── DetectionChart.tsx           ← MỚI: bar chart detection
│       ├── AlertPanel.tsx               ← MỚI: alert sidebar
│       └── RecentDetections.tsx         ← MỚI: bảng detections
└── api_server.py                        ← MỚI: Flask backend
```

## Bước 1 — Cài thêm flask-cors cho Python

```bash
pip install flask flask-cors
```

## Bước 2 — Chạy Flask API

```bash
# Đặt api_server.py cùng thư mục với main_controller.py và log.csv
python api_server.py
```

API sẽ chạy tại: http://localhost:5000

## Bước 3 — Chạy React Dashboard

```bash
cd hornet-ai
npm install
npm run dev
```

Dashboard tại: http://localhost:5173

## Bước 4 — Kết nối với YOLO của bạn

### Yêu cầu từ main_controller.py:

**1. Lưu ảnh latest frame:**
```python
# Thêm vào main_controller.py sau mỗi lần detect
import cv2
cv2.imwrite("detections/cam1_latest.jpg", frame_with_boxes)
```

**2. Log CSV cần có các cột:**
```csv
timestamp,species,confidence,camera,location,image_file
2025-05-10 14:32:01,Asian Hornet,0.982,Camera 1,North Hive,cam1_20250510_143201.jpg
2025-05-10 14:28:45,Honey Bee,0.957,Camera 2,East Field,cam2_20250510_142845.jpg
```

## Luồng dữ liệu hoàn chỉnh

```
Camera
  ↓
YOLOv8 (main_controller.py)
  ↓ lưu ảnh          ↓ ghi log
detections/           log.csv
cam1_latest.jpg
  ↓
Flask API (api_server.py)
  ↓
React Dashboard (TailAdmin)
  ├── Dashboard: Stats cards
  ├── Monitoring: Live camera feed
  ├── Analytics: Charts
  └── Alerts: Alert management
```

## API Endpoints

| Endpoint | Mô tả |
|----------|-------|
| `GET /latest_frame?cam=1` | Ảnh mới nhất có bounding box |
| `GET /api/stats` | Số liệu tổng hợp (hornet count, accuracy...) |
| `GET /api/detections?limit=20` | Danh sách detection events |
| `GET /api/alerts` | Danh sách alerts |
| `GET /api/daily_chart` | Dữ liệu chart 7 ngày |
