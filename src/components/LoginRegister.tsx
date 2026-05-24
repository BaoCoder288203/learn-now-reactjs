import React, { useState } from "react";
import { LogIn, UserPlus, KeyRound, Mail, User, ShieldCheck } from "lucide-react";

interface LoginRegisterProps {
  onSuccess: (token: string, user: any) => void;
}

export default function LoginRegister({ onSuccess }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);

    const path = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body = isLogin ? { email, password } : { email, password, name, role };

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication operation failed");
      }

      if (isLogin) {
        onSuccess(data.accessToken, data.user);
      } else {
        setMsg("Account registered successfully! Switching to login...");
        setTimeout(() => {
          setIsLogin(true);
          setPassword("");
        }, 1500);
      }
    } catch (error: any) {
      setErr(error.message || "Something went wrong. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (type: "USER" | "ADMIN") => {
    if (type === "USER") {
      setEmail("user@toeic.com");
      setPassword("user123");
    } else {
      setEmail("admin@toeic.com");
      setPassword("admin123");
    }
    setIsLogin(true);
    setErr("");
  };

  return (
    <div id="auth-container" className="min-h-(screen-16) flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50/50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-150">
            <KeyRound className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-sans font-bold tracking-tight text-gray-900">
          {isLogin ? "Sign in to study" : "Register new account"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <button
            id="auth-toggle-btn"
            onClick={() => {
              setIsLogin(!isLogin);
              setErr("");
              setMsg("");
            }}
            className="font-medium text-blue-600 hover:text-blue-500 underline cursor-pointer"
          >
            {isLogin ? "create a new account" : "sign in to existing account"}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-2xl sm:px-10 border border-gray-100">
          {/* Quick Fills */}
          {isLogin && (
            <div id="quick-fill-box" className="mb-6 p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
              <span className="block text-xs font-bold text-blue-850 uppercase tracking-widest font-mono mb-2">
                ⚡ Demo Quick Accounts
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="fill-user-btn"
                  type="button"
                  onClick={() => handleQuickFill("USER")}
                  className="px-3 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-100/50 cursor-pointer text-left transition-colors"
                >
                  <strong className="block">Student Mode</strong>
                  user@toeic.com / user123
                </button>
                <button
                  id="fill-admin-btn"
                  type="button"
                  onClick={() => handleQuickFill("ADMIN")}
                  className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-250 rounded-lg hover:bg-gray-100/50 cursor-pointer text-left transition-colors"
                >
                  <strong className="block text-gray-800">Admin Mode</strong>
                  admin@toeic.com / admin123
                </button>
              </div>
            </div>
          )}

          {err && (
            <div id="auth-error" className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm font-medium">
              {err}
            </div>
          )}

          {msg && (
            <div id="auth-success" className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium">
              {msg}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Full Name
                </label>
                <div className="relative rounded-md shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="input-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. David Beckham"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="input-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="name@domain.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  id="input-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
                  <ShieldCheck className="w-4 h-4 text-blue-500 mr-1" />
                  Account Intent Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("USER")}
                    className={`px-4 py-2 text-sm font-medium rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                      role === "USER"
                        ? "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    🚀 Regular Learner
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("ADMIN")}
                    className={`px-4 py-2 text-sm font-medium rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                      role === "ADMIN"
                        ? "bg-slate-50 border-slate-500 text-slate-700 ring-2 ring-slate-500/20"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    🛠️ Portal Admin
                  </button>
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-xs text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
            >
              {loading ? (
                "Processing request..."
              ) : isLogin ? (
                <span className="flex items-center space-x-2">
                  <LogIn className="w-4 h-4" />
                  <span>Log Into Portal</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Register Account</span>
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
