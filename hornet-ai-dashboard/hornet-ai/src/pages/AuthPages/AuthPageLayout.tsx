import React from "react";
import { Link } from "react-router";
import { Activity, ShieldAlert, Video } from "lucide-react";
import GridShape from "../../components/common/GridShape";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex overflow-hidden font-sans">
      
      {/* NỬA TRÁI: Khu vực chứa Form (SignInForm / SignUpForm) */}
      <div className="flex-1 flex flex-col justify-center w-full lg:w-1/2 relative z-10 bg-gray-950">
        {children}
      </div>

      {/* NỬA PHẢI: Branding & IoT System Showcase (Ẩn trên mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 border-l border-gray-800 relative items-center justify-center">
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
          <GridShape />
        </div>

        {/* Nội dung giới thiệu hệ thống */}
        <div className="relative z-10 flex flex-col items-center max-w-md text-center p-8">
          
          {/* Logo hoặc Icon thay thế */}
          <Link to="/" className="flex items-center justify-center gap-4 mb-8 text-blue-500">
            <Video size={40} className="text-gray-400" />
            <Activity size={48} className="text-blue-500" />
            <ShieldAlert size={40} className="text-red-500" />
          </Link>

          {/* Nếu bạn vẫn muốn dùng file SVG gốc, có thể mở comment đoạn dưới và xoá đoạn icon ở trên: */}
          {/* <Link to="/" className="block mb-6">
            <img width={231} height={48} src="/images/logo/auth-logo.svg" alt="Logo" className="brightness-200" />
          </Link> 
          */}

          <h2 className="text-3xl font-bold text-white mb-3 tracking-wide">
            HORNET<span className="text-blue-500">3000</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Smart Hive AI Monitoring & Real-time Threat Detection System
          </p>

          {/* Các chỉ số trang trí cho giống hệ thống AI thực thụ */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-gray-950/80 backdrop-blur-sm border border-gray-800 p-4 rounded-xl shadow-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Vision Model</p>
              <p className="font-mono text-lg text-green-400 mt-1 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                YOLO Active
              </p>
            </div>
            <div className="bg-gray-950/80 backdrop-blur-sm border border-gray-800 p-4 rounded-xl shadow-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">System Status</p>
              <p className="font-mono text-lg text-blue-400 mt-1 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Secure
              </p>
            </div>
          </div>
          
        </div>

        {/* Hiệu ứng ánh sáng trang trí góc dưới */}
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      </div>

      {/* Đã xoá nút ThemeToggler vì hệ thống giám sát ép dùng Dark Mode để bảo vệ mắt */}
    </div>
  );
}