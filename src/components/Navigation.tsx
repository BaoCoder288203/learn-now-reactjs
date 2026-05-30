import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, ShieldAlert } from "lucide-react";
import { User } from "../types.js";

interface NavigationProps {
  user: User;
  onLogout: () => void;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded text-xs font-bold uppercase tracking-tight transition-all duration-150 ${
    isActive
      ? "bg-blue-500 text-white shadow-xs"
      : "text-slate-300 hover:text-white hover:bg-slate-800"
  }`;

const adminLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded text-xs font-extrabold uppercase tracking-tight transition-all duration-150 flex items-center space-x-1.5 ${
    isActive
      ? "bg-red-500 text-white"
      : "text-red-400 hover:text-red-300 hover:bg-red-950/40"
  }`;

export default function Navigation({ user, onLogout }: NavigationProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  return (
    <header className="bg-[#1e293b] text-white h-14 sticky top-0 z-50 shadow-md flex items-center justify-between px-6 shrink-0 border-b border-slate-750">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        <NavLink to="/tests" className="flex items-center shrink-0">
          <img
            src="/logos/logo_3.png"
            alt="Learn Now"
            className="h-12 w-auto object-contain"
          />
        </NavLink>

        <nav className="hidden md:flex space-x-1">
          <NavLink to="/tests" className={navLinkClass}>
            Đề thi
          </NavLink>
          <NavLink to="/vocab" className={navLinkClass}>
            Sổ từ vựng
          </NavLink>
          <NavLink to="/history" className={navLinkClass}>
            Lịch sử
          </NavLink>
          {user.role === "ADMIN" && (
            <NavLink to="/admin" className={adminLinkClass}>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Quản trị</span>
            </NavLink>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="block text-xs font-bold text-white">{user.name}</span>
            <div className="flex items-center justify-end space-x-1.5">
              {user.role === "ADMIN" ? (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#ef4444]/25 text-red-400 uppercase tracking-widest font-mono">
                  QUẢN TRỊ
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#22c55e]/25 text-emerald-400 uppercase tracking-widest font-mono">
                  HỌC VIÊN
                </span>
              )}
              <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">{user.email}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
