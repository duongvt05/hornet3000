import streamlit as st
import pandas as pd
import plotly.express as px
import os
import glob
import time
from datetime import datetime
from streamlit_autorefresh import st_autorefresh

# ── CẤU HÌNH ──────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Trang trại ong Nguyễn Văn An",
    layout="wide",
    initial_sidebar_state="expanded",
    page_icon="🐝",
)
st_autorefresh(interval=1000, key="refresh")  # làm mới mỗi 1 giây

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, [class*="css"] { font-family: 'Be Vietnam Pro', sans-serif !important; }
#MainMenu, footer, header { visibility: hidden; height: 0; }
.stApp { background: #F5F0E8 !important; }
.block-container {
    padding-top: 0 !important;
    padding-left: 1.5rem !important;
    padding-right: 1.5rem !important;
    max-width: 100% !important;
}
.topbar {
    display: flex; align-items: center; justify-content: space-between;
    background: #fff; border-bottom: 1px solid #E8E0D0;
    padding: 12px 24px; margin: 0 -1.5rem 1.5rem -1.5rem;
}
.tb-left { display: flex; align-items: center; gap: 12px; }
.tb-logo {
    width: 42px; height: 42px; background: #BA7517; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-size: 22px;
}
.tb-name { font-size: 16px; font-weight: 600; color: #1a1a1a; }
.tb-sub  { font-size: 12px; color: #999; margin-top: 2px; }
.tb-right { display: flex; align-items: center; gap: 10px; }
.bdg-warn {
    background: #FAEEDA; color: #854F0B; font-size: 12px; font-weight: 500;
    padding: 5px 14px; border-radius: 20px; border: 1px solid #EF9F27;
}
.bdg-ok {
    background: #EAF3DE; color: #3B6D11; font-size: 12px; font-weight: 500;
    padding: 5px 14px; border-radius: 20px; border: 1px solid #97C459;
}
.tb-avatar {
    width: 36px; height: 36px; border-radius: 50%; background: #FAEEDA;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 600; color: #633806;
}
.stat-grid {
    display: grid; grid-template-columns: repeat(4, minmax(0,1fr));
    gap: 12px; margin-bottom: 24px;
}
.stat-card {
    background: #fff; border-radius: 14px; padding: 16px 20px;
    border: 1px solid #EDE5D8;
}
.s-label {
    font-size: 11px; color: #999; font-weight: 500;
    text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px;
}
.s-val { font-size: 30px; font-weight: 600; line-height: 1; }
.s-sub { font-size: 12px; color: #bbb; margin-top: 6px; }
.c-red   { color: #C0392B; }
.c-green { color: #3B6D11; }
.c-amber { color: #854F0B; }
.c-dark  { color: #1a1a1a; }
.sec-lbl {
    font-size: 11px; font-weight: 600; color: #aaa;
    text-transform: uppercase; letter-spacing: .08em; margin-bottom: 12px;
}
.cam-label {
    font-size: 13px; font-weight: 600; color: #222;
    padding: 8px 0 6px 0;
}
.cam-label-alert { color: #A32D2D; }
.status-ok   { font-size: 11px; color: #639922; font-weight: 500; }
.status-warn { font-size: 11px; color: #A32D2D; font-weight: 700; }
.status-off  { font-size: 11px; color: #bbb; }
.r-card {
    background: #fff; border-radius: 14px;
    border: 1px solid #EDE5D8; padding: 16px; margin-bottom: 14px;
}
.r-title {
    font-size: 11px; font-weight: 600; color: #aaa;
    text-transform: uppercase; letter-spacing: .07em; margin-bottom: 12px;
}
.log-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 7px 0; border-bottom: 1px solid #F5EFE6;
}
.log-row:last-child { border-bottom: none; }
.log-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.log-text { font-size: 12px; color: #333; line-height: 1.5; }
.log-time { font-size: 10px; color: #bbb; margin-top: 2px; }
.bar-bg   { height: 5px; border-radius: 3px; background: #EDE5D8; margin-top: 6px; }
.bar-fill { height: 100%; border-radius: 3px; }
.sys-box  {
    background: #F5F0E8; border: 1px solid #EDE5D8; border-radius: 14px;
    padding: 14px; text-align: center; font-size: 11px; color: #999; line-height: 2;
}
.iot-lbl {
    font-size: 10px; font-weight: 600; color: #bbb;
    text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px;
}
.dev-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 7px 0; font-size: 13px; color: #444;
}
.tog-on {
    display: inline-block; width: 36px; height: 20px;
    background: #639922; border-radius: 10px; position: relative; flex-shrink: 0;
}
.tog-on::after {
    content: ''; position: absolute;
    width: 16px; height: 16px; background: #fff;
    border-radius: 50%; top: 2px; right: 2px;
}
.tog-off {
    display: inline-block; width: 36px; height: 20px;
    background: #C0BAB0; border-radius: 10px; position: relative; flex-shrink: 0;
}
.tog-off::after {
    content: ''; position: absolute;
    width: 16px; height: 16px; background: #fff;
    border-radius: 50%; top: 2px; left: 2px;
}
section[data-testid='stSidebar'] > div:first-child {
    background: #FDFAF5 !important;
    border-right: 1px solid #EDE5D8 !important;
}
</style>
""", unsafe_allow_html=True)

# ── ĐƯỜNG DẪN ─────────────────────────────────────────────────────────────────
LOG_PATH      = "log.csv"
DETECTION_DIR = "detections"
ALERT_SEC     = 10  # ảnh dưới 10 giây = đang cảnh báo

# ── ĐỌC LOG ───────────────────────────────────────────────────────────────────
df = None
total_ev = vcra_n = vespsp_n = 0
if os.path.exists(LOG_PATH):
    try:
        df = pd.read_csv(LOG_PATH)
        if not df.empty:
            total_ev = len(df)
            if "Class" in df.columns:
                vcra_n   = int((df["Class"] == "vcra").sum())
                vespsp_n = int((df["Class"] == "vespsp").sum())
    except Exception:
        pass

# ── KIỂM TRA TRẠNG THÁI CAMERA ────────────────────────────────────────────────
latest_path = os.path.join(DETECTION_DIR, "cam1_latest.jpg")
alert_path  = os.path.join(DETECTION_DIR, "cam1_alert_latest.jpg")

cam_online = os.path.exists(latest_path)
cam_age    = (time.time() - os.path.getmtime(latest_path)) if cam_online else 999

# Camera online nếu file được cập nhật trong vòng 5 giây
is_online = cam_online and cam_age < 5

# Đang cảnh báo nếu có file alert cập nhật trong vòng ALERT_SEC giây
is_alert = (
    os.path.exists(alert_path) and
    (time.time() - os.path.getmtime(alert_path)) < ALERT_SEC
)

n_online  = 1 if is_online else 0
n_alerts  = 1 if is_alert else 0

# ── SIDEBAR ───────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown(
        '<div style="padding:16px 16px 14px;border-bottom:1px solid #EDE5D8;margin-bottom:10px;">'
        '  <div style="display:flex;align-items:center;gap:10px;">'
        '    <div style="width:36px;height:36px;background:#BA7517;border-radius:9px;'
        '         display:flex;align-items:center;justify-content:center;font-size:18px;">🐝</div>'
        '    <div>'
        '      <div style="font-size:14px;font-weight:600;color:#1a1a1a;">Trang trại ong</div>'
        '      <div style="font-size:11px;color:#aaa;">Nguyễn Văn An</div>'
        '    </div>'
        '  </div>'
        '</div>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<div class="iot-lbl">Thiết bị IoT</div>'
        '<div class="dev-row"><span>📱 Telegram Bot</span><span class="tog-on"></span></div>'
        '<div class="dev-row"><span>🔊 Loa xua đuổi</span><span class="tog-on"></span></div>'
        '<div class="dev-row"><span>💡 Đèn flash</span><span class="tog-off"></span></div>',
        unsafe_allow_html=True,
    )
    st.markdown("---")
    now_str = datetime.now().strftime("%H:%M:%S")
    st.markdown(
        f'<div style="font-size:11px;color:#bbb;text-align:center;line-height:2;">'
        f'Cập nhật: {now_str}<br>Tự động làm mới mỗi 1 giây'
        f'</div>',
        unsafe_allow_html=True,
    )

# ── TOPBAR ────────────────────────────────────────────────────────────────────
warn_html = f'<span class="bdg-warn">⚠️ {n_alerts} cảnh báo</span>' if n_alerts else ''
st.markdown(
    f'<div class="topbar">'
    f'  <div class="tb-left">'
    f'    <div class="tb-logo">🐝</div>'
    f'    <div>'
    f'      <div class="tb-name">Trang trại ong Nguyễn Văn An</div>'
    f'      <div class="tb-sub">Hệ thống AI & IoT giám sát tự động</div>'
    f'    </div>'
    f'  </div>'
    f'  <div class="tb-right">'
    f'    {warn_html}'
    f'    <span class="bdg-ok">Hệ thống ổn định</span>'
    f'    <div class="tb-avatar">AN</div>'
    f'  </div>'
    f'</div>',
    unsafe_allow_html=True,
)

# ── STAT CARDS ────────────────────────────────────────────────────────────────
last_detect = "Chưa có"
if df is not None and not df.empty and 'Timestamp' in df.columns:
    last_detect = str(df['Timestamp'].iloc[-1])[-8:]  # lấy HH:MM:SS

st.markdown(
    f'<div class="stat-grid">'
    f'  <div class="stat-card">'
    f'    <div class="s-label">Sự kiện hôm nay</div>'
    f'    <div class="s-val c-red">{total_ev}</div>'
    f'    <div class="s-sub">Tổng phát hiện</div>'
    f'  </div>'
    f'  <div class="stat-card">'
    f'    <div class="s-label">Camera hoạt động</div>'
    f'    <div class="s-val c-green">{n_online}/1</div>'
    f'    <div class="s-sub">{"Đang trực tuyến" if is_online else "Ngoại tuyến"}</div>'
    f'  </div>'
    f'  <div class="stat-card">'
    f'    <div class="s-label">Phát hiện gần nhất</div>'
    f'    <div class="s-val c-amber" style="font-size:20px;">{last_detect}</div>'
    f'    <div class="s-sub">Thời gian</div>'
    f'  </div>'
    f'  <div class="stat-card">'
    f'    <div class="s-label">Phản hồi AI</div>'
    f'    <div class="s-val c-dark">~125ms</div>'
    f'    <div class="s-sub">Mỗi frame</div>'
    f'  </div>'
    f'</div>',
    unsafe_allow_html=True,
)

# ── LAYOUT CHÍNH ──────────────────────────────────────────────────────────────
col_cam, col_right = st.columns([2, 1])

# ── CAMERA REALTIME ───────────────────────────────────────────────────────────
with col_cam:
    st.markdown('<div class="sec-lbl">📹 Camera 01 — Tổ A (Realtime)</div>', unsafe_allow_html=True)

    if is_alert:
        st.error("🚨 CẢNH BÁO: Phát hiện ong bắp cày xâm nhập! Đã kích hoạt loa xua đuổi + Telegram!")
        st.image(alert_path, use_container_width=True, caption="⚠️ Frame cảnh báo — bounding box đỏ")
    elif is_online:
        st.success("✅ Camera đang hoạt động — Không phát hiện mối nguy")
        st.image(latest_path, use_container_width=True,
                 caption=f"🔴 LIVE — Cập nhật: {datetime.now().strftime('%H:%M:%S')}")
    else:
        st.warning("⏳ Đang chờ kết nối... Hãy chạy main_controller.py")
        st.markdown(
            '<div style="background:#0f0f0f;height:300px;border-radius:12px;'
            'display:flex;align-items:center;justify-content:center;color:#333;font-size:14px;">'
            'Chưa có tín hiệu camera'
            '</div>',
            unsafe_allow_html=True,
        )

    # Ảnh detect gần nhất
    if os.path.exists(DETECTION_DIR):
        alert_files = sorted(
            glob.glob(os.path.join(DETECTION_DIR, "alert_cam1_*.jpg")),
            key=os.path.getctime, reverse=True
        )
        if alert_files:
            st.markdown('<br><div class="sec-lbl">📸 Ảnh phát hiện gần nhất</div>', unsafe_allow_html=True)
            cols = st.columns(min(3, len(alert_files)))
            for i, f in enumerate(alert_files[:3]):
                t = datetime.fromtimestamp(os.path.getctime(f)).strftime("%H:%M:%S")
                cols[i].image(f, caption=f"🐝 {t}", use_container_width=True)

# ── CỘT PHẢI ──────────────────────────────────────────────────────────────────
with col_right:

    # Nhật ký gần nhất
    rows_html = ''
    if df is not None and not df.empty:
        for _, row in df.tail(6).iloc[::-1].iterrows():
            cls   = str(row.get('Class', ''))
            dot_c = '#E24B4A' if cls == 'vcra' else ('#EF9F27' if cls == 'vespsp' else '#639922')
            ts_v  = str(row.get('Timestamp', ''))
            conf_v = str(row.get('Confidence', ''))
            rows_html += (
                f'<div class="log-row">'
                f'  <div class="log-dot" style="background:{dot_c};margin-top:5px;"></div>'
                f'  <div>'
                f'    <div class="log-text">Phát hiện <b>{cls}</b> ({conf_v})</div>'
                f'    <div class="log-time">{ts_v}</div>'
                f'  </div>'
                f'</div>'
            )
    else:
        rows_html = '<div style="font-size:12px;color:#bbb;padding:6px 0;">Chưa có sự kiện nào...</div>'

    st.markdown(
        f'<div class="r-card">'
        f'  <div class="r-title">📋 Nhật ký gần nhất</div>'
        f'{rows_html}'
        f'</div>',
        unsafe_allow_html=True,
    )

    # Thống kê theo loài
    vcra_pct   = int(vcra_n   / max(total_ev, 1) * 100)
    vespsp_pct = int(vespsp_n / max(total_ev, 1) * 100)

    st.markdown(
        f'<div class="r-card">'
        f'  <div class="r-title">📊 Hôm nay theo loài</div>'
        f'  <div style="margin-bottom:14px;">'
        f'    <div style="display:flex;justify-content:space-between;font-size:13px;color:#333;">'
        f'      <span>Ong vò vẽ (vcra)</span>'
        f'      <span style="color:#A32D2D;font-weight:600;">{vcra_n}</span>'
        f'    </div>'
        f'    <div class="bar-bg">'
        f'      <div class="bar-fill" style="width:{vcra_pct}%;background:#E24B4A;"></div>'
        f'    </div>'
        f'  </div>'
        f'  <div>'
        f'    <div style="display:flex;justify-content:space-between;font-size:13px;color:#333;">'
        f'      <span>Ong bắp cày (vespsp)</span>'
        f'      <span style="color:#854F0B;font-weight:600;">{vespsp_n}</span>'
        f'    </div>'
        f'    <div class="bar-bg">'
        f'      <div class="bar-fill" style="width:{vespsp_pct}%;background:#EF9F27;"></div>'
        f'    </div>'
        f'  </div>'
        f'</div>',
        unsafe_allow_html=True,
    )

    # Trạng thái hệ thống
    pi_dot    = '🟢' if is_online else '🔴'
    pi_status = 'Trực tuyến' if is_online else 'Ngoại tuyến'
    st.markdown(
        f'<div class="sys-box">'
        f'{pi_dot} AI Controller — {pi_status}<br>'
        f'🤖 YOLOv8s — ~125ms/frame<br>'
        f'📱 Telegram Bot — Hoạt động<br>'
        f'🔄 Cập nhật mỗi 1 giây'
        f'</div>',
        unsafe_allow_html=True,
    )

    # Biểu đồ
    if df is not None and not df.empty and 'Class' in df.columns:
        st.markdown('<br>', unsafe_allow_html=True)
        counts = df['Class'].value_counts().reset_index()
        counts.columns = ['Loài', 'Số lần']
        fig = px.bar(
            counts, x='Loài', y='Số lần', color='Loài',
            color_discrete_map={'vcra': '#E24B4A', 'vespsp': '#EF9F27'},
            title='Tần suất theo loài',
        )
        fig.update_layout(
            height=220, margin=dict(t=36, b=10, l=0, r=0),
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            showlegend=False,
            font=dict(family='Be Vietnam Pro', size=11, color='#888'),
        )
        fig.update_traces(marker_line_width=0)
        st.plotly_chart(fig, use_container_width=True)

# ── BẢNG LOG ĐẦY ĐỦ ──────────────────────────────────────────────────────────
if df is not None and not df.empty:
    st.markdown('<br><div class="sec-lbl">📄 Toàn bộ nhật ký sự kiện</div>', unsafe_allow_html=True)
    st.dataframe(
        df.tail(20).iloc[::-1].reset_index(drop=True),
        use_container_width=True, height=260,
    )
    st.download_button(
        label='⬇ Tải xuống nhật ký CSV',
        data=df.to_csv(index=False).encode('utf-8'),
        file_name=f'log_ong_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv',
        mime='text/csv',
    )