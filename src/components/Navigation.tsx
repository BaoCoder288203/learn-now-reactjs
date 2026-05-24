import React from "react";
import { BookOpen, LogOut, Award, ShieldAlert, Layers } from "lucide-react";
import { User } from "../types.js";

interface NavigationProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navigation({ user, onLogout, activeTab, setActiveTab }: NavigationProps) {
  return (
    <header id="app-nav-header" className="bg-[#1e293b] text-white h-14 sticky top-0 z-50 shadow-md flex items-center justify-between px-6 shrink-0 border-b border-slate-750">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
        {/* Logo & Platform Name */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("tests")}>
          <div className="bg-blue-500 text-white p-1.5 rounded flex items-center justify-center">
            <BookOpen className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-sans font-bold text-base tracking-tight text-white block leading-tight">
              TOEIC Master <span className="font-normal text-slate-400">v2.0</span>
            </span>
            <span className="text-[9px] text-slate-400 font-mono tracking-widest block uppercase">
              High-Density OCR System
            </span>
          </div>
        </div>

        {/* Tab Options */}
        <nav className="hidden md:flex space-x-1">
          <button
            id="nav-tests"
            onClick={() => setActiveTab("tests")}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-tight transition-all duration-150 cursor-pointer ${
              activeTab === "tests"
                ? "bg-blue-500 text-white shadow-xs"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            Practice Tests
          </button>
          <button
            id="nav-vocab"
            onClick={() => setActiveTab("vocab")}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-tight transition-all duration-150 cursor-pointer ${
              activeTab === "vocab"
                ? "bg-blue-500 text-white shadow-xs"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            Vocabulary Notebook
          </button>
          <button
            id="nav-attempts"
            onClick={() => setActiveTab("attempts")}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-tight transition-all duration-150 cursor-pointer ${
              activeTab === "attempts"
                ? "bg-blue-500 text-white shadow-xs"
                : "text-slate-300 hover:text-white hover:bg-slate-800"
            }`}
          >
            Score History
          </button>
          {user.role === "ADMIN" && (
            <button
              id="nav-admin"
              onClick={() => setActiveTab("admin")}
              className={`px-3 py-1.5 rounded text-xs font-extrabold uppercase tracking-tight transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
                activeTab === "admin"
                  ? "bg-red-500 text-white"
                  : "text-red-400 hover:text-red-300 hover:bg-red-950/40"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Director</span>
            </button>
          )}
        </nav>

        {/* User Section */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="block text-xs font-bold text-white">{user.name}</span>
            <div className="flex items-center justify-end space-x-1.5">
              {user.role === "ADMIN" ? (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#ef4444]/25 text-red-400 uppercase tracking-widest font-mono">
                  ADMIN
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-[#22c55e]/25 text-emerald-400 uppercase tracking-widest font-mono">
                  LEARNER
                </span>
              )}
              <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">{user.email}</span>
            </div>
          </div>

          <button
            id="btn-logout"
            onClick={onLogout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Logout from Account"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
