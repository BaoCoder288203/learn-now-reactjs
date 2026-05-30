import React from "react";
import { NavLink } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#1e293b] text-slate-400 mt-12 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div className="flex flex-col items-center md:items-start space-y-3">
            <img
              src="/logos/logo_2.png"
              alt="Learn Now"
              className="h-14 w-auto object-contain brightness-110"
            />
            <p className="text-xs text-slate-500 max-w-xs text-center md:text-left leading-relaxed">
              Nền tảng luyện thi TOEIC trực tuyến với hệ thống AI thông minh, giúp bạn chinh phục mục tiêu điểm số.
            </p>
          </div>

          <div className="flex space-x-12 text-xs">
            <div className="space-y-2">
              <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-3">Luyện tập</h4>
              <NavLink to="/tests" className="block hover:text-white transition-colors">Đề thi</NavLink>
              <NavLink to="/vocab" className="block hover:text-white transition-colors">Sổ từ vựng</NavLink>
              <NavLink to="/history" className="block hover:text-white transition-colors">Lịch sử</NavLink>
            </div>
            <div className="space-y-2">
              <h4 className="text-slate-300 font-bold text-xs uppercase tracking-wider mb-3">Hỗ trợ</h4>
              <span className="block">Liên hệ</span>
              <span className="block">Hướng dẫn</span>
              <span className="block">Điều khoản</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-3xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} Learn Now. All rights reserved.</span>
          <span>Học TOEIC - Chinh Phục Tương Lai</span>
        </div>
      </div>
    </footer>
  );
}
