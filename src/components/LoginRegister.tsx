import React, { useState, useEffect, useRef } from "react";
import { Mail, KeyRound, User, Calendar, ChevronRight, ArrowLeft, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { apiUrl } from "../lib/api.js";

interface LoginRegisterProps {
  onSuccess: (token: string, user: any) => void;
}

type RegisterStep = "info" | "otp";

export default function LoginRegister({ onSuccess }: LoginRegisterProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [registerStep, setRegisterStep] = useState<RegisterStep>("info");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setDateOfBirth("");
    setGender("");
    setOtp(["", "", "", "", "", ""]);
    setErr("");
    setMsg("");
    setRegisterStep("info");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const otpValue = otp.join("");

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/\d/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Đăng nhập thất bại");
      onSuccess(data.accessToken, data.user);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (password !== confirmPassword) { setErr("Mật khẩu xác nhận không khớp."); return; }
    if (password.length < 6) { setErr("Mật khẩu phải có ít nhất 6 ký tự."); return; }
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/auth/register/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword, name, dateOfBirth: dateOfBirth || undefined, gender: gender || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gửi OTP thất bại");
      setMsg(data.message);
      setRegisterStep("otp");
      setCountdown(60);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/auth/register/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Xác thực OTP thất bại");
      setMsg("Đăng ký thành công! Đang chuyển sang đăng nhập...");
      setTimeout(() => { resetForm(); setIsLogin(true); }, 1500);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/auth/register/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword, name, dateOfBirth: dateOfBirth || undefined, gender: gender || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gửi lại OTP thất bại");
      setMsg("Mã OTP mới đã được gửi.");
      setCountdown(60);
    } catch (error: any) {
      setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (type: "USER" | "ADMIN") => {
    setEmail(type === "USER" ? "user@toeic.com" : "admin@toeic.com");
    setPassword(type === "USER" ? "user123" : "admin123");
    setIsLogin(true);
    setErr("");
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErr("");
    setMsg("");
    setRegisterStep("info");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          <div>
            <img src="/logos/logo_2.png" alt="Learn Now" className="h-40 w-auto object-contain brightness-110" />
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight">
                Master Your<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                  TOEIC Score
                </span>
              </h1>
              <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-md">
                AI-powered practice platform designed to help you achieve your target TOEIC score with smart analysis and personalized learning paths.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 text-center">
                <div className="text-2xl font-bold text-white">200+</div>
                <div className="text-xs text-slate-400 mt-1">Practice Tests</div>
              </div>
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 text-center">
                <div className="text-2xl font-bold text-white">7</div>
                <div className="text-xs text-slate-400 mt-1">TOEIC Parts</div>
              </div>
              <div className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 text-center">
                <div className="text-2xl font-bold text-white">AI</div>
                <div className="text-xs text-slate-400 mt-1">Smart Analysis</div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex -space-x-2">
              {["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"].map((bg, i) => (
                <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-slate-900 flex items-center justify-center text-white text-[10px] font-bold`}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-400">
              <span className="text-white font-semibold">1,200+</span> learners already joined
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Forms */}
      <div className="flex-1 flex flex-col justify-center bg-white">
        <div className="w-full max-w-[440px] mx-auto px-6 sm:px-8 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logos/logo_1.png" alt="Learn Now" className="h-12 w-auto object-contain" />
          </div>

          {/* Header */}
          {registerStep === "otp" ? (
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Verify your email</h2>
              <p className="mt-2 text-sm text-gray-500">
                We've sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span>
              </p>
            </div>
          ) : (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {isLogin ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {isLogin
                  ? "Enter your credentials to access your dashboard."
                  : "Start your TOEIC journey with a free account."}
              </p>
            </div>
          )}

          {/* Demo accounts (login only) */}
          {isLogin && (
            <div className="mb-6 flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("USER")}
                className="flex-1 px-3 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors text-left"
              >
                <span className="font-semibold text-slate-700 block">Demo Student</span>
                <span className="text-slate-400 text-[11px]">user@toeic.com</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("ADMIN")}
                className="flex-1 px-3 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors text-left"
              >
                <span className="font-semibold text-slate-700 block">Demo Admin</span>
                <span className="text-slate-400 text-[11px]">admin@toeic.com</span>
              </button>
            </div>
          )}

          {/* Register steps indicator */}
          {!isLogin && registerStep === "info" && (
            <div className="mb-6 flex items-center text-xs">
              <div className="flex items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold">1</span>
                <span className="ml-2 font-semibold text-gray-800">Personal Info</span>
              </div>
              <div className="mx-3 h-px flex-1 bg-gray-200" />
              <div className="flex items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-400 text-[11px] font-bold">2</span>
                <span className="ml-2 text-gray-400">Verify Email</span>
              </div>
            </div>
          )}
          {!isLogin && registerStep === "otp" && (
            <div className="mb-6 flex items-center text-xs">
              <div className="flex items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-[11px] font-bold">&#10003;</span>
                <span className="ml-2 text-emerald-600 font-semibold">Personal Info</span>
              </div>
              <div className="mx-3 h-px flex-1 bg-emerald-200" />
              <div className="flex items-center">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold">2</span>
                <span className="ml-2 font-semibold text-gray-800">Verify Email</span>
              </div>
            </div>
          )}

          {/* Error / Success */}
          {err && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-start space-x-2">
              <span className="shrink-0 mt-0.5">&#10007;</span>
              <span>{err}</span>
            </div>
          )}
          {msg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm flex items-start space-x-2">
              <span className="shrink-0 mt-0.5">&#10003;</span>
              <span>{msg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {isLogin && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="Enter your password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/20 cursor-pointer transition-all duration-200 hover:shadow-md hover:shadow-blue-600/25 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </span>
                ) : "Sign in"}
              </button>
            </form>
          )}

          {/* REGISTER FORM - INFO */}
          {!isLogin && registerStep === "info" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name <span className="text-red-400">*</span></label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="e.g. Nguyen Van A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="block w-full pl-11 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="block w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="Min. 6 characters"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="Re-enter your password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl shadow-sm shadow-blue-600/20 cursor-pointer transition-all duration-200 hover:shadow-md hover:shadow-blue-600/25 active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending OTP...</span>
                  </span>
                ) : (
                  <>
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* OTP FORM */}
          {!isLogin && registerStep === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">Enter verification code</label>
                <div className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      className="w-12 h-14 text-center text-xl font-bold font-mono bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpValue.length !== 6}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm cursor-pointer transition-all duration-200 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </span>
                ) : "Verify & Create Account"}
              </button>

              <div className="text-center space-y-3">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 cursor-pointer disabled:cursor-not-allowed font-medium"
                >
                  {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => { setRegisterStep("info"); setOtp(["", "", "", "", "", ""]); setErr(""); setMsg(""); }}
                  className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer inline-flex items-center font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back to edit info
                </button>
              </div>
            </form>
          )}

          {/* Divider + Switch */}
          {registerStep !== "otp" && (
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-gray-400">
                    {isLogin ? "New to Learn Now?" : "Already have an account?"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={switchMode}
                className="mt-4 w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl cursor-pointer transition-all active:scale-[0.98]"
              >
                {isLogin ? "Create a free account" : "Sign in instead"}
              </button>
            </div>
          )}

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-gray-400">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
