import React, { useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { User } from "./types.js";
import Navigation from "./components/Navigation.js";
import LoginRegister from "./components/LoginRegister.js";
import TestSelection from "./components/TestSelection.js";
import TestDoing from "./components/TestDoing.js";
import TestResult from "./components/TestResult.js";
import VocabularyBook from "./components/VocabularyBook.js";
import AdminDashboard from "./components/AdminDashboard.js";
import HistoryPage from "./components/HistoryPage.js";
import Footer from "./components/Footer.js";

function AuthLayout({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col justify-between">
      <div>
        <Navigation user={user} onLogout={onLogout} />
        <main className="animate-fade-in duration-300">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("toeic_token"));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("toeic_user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleAuthSuccess = (accessToken: string, loggedUser: User) => {
    localStorage.setItem("toeic_token", accessToken);
    localStorage.setItem("toeic_user", JSON.stringify(loggedUser));
    setToken(accessToken);
    setUser(loggedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("toeic_token");
    localStorage.removeItem("toeic_user");
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginRegister onSuccess={handleAuthSuccess} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/tests" replace />} />

      <Route path="/test/:testId" element={<TestDoing token={token} />} />

      <Route element={<AuthLayout user={user} onLogout={handleLogout} />}>
        <Route path="/tests" element={<TestSelection token={token} />} />
        <Route path="/result/:attemptId" element={<TestResult token={token} />} />
        <Route path="/vocab" element={<VocabularyBook token={token} />} />
        <Route path="/history" element={<HistoryPage token={token} />} />
        {user.role === "ADMIN" && (
          <Route path="/admin" element={<AdminDashboard token={token} />} />
        )}
        <Route path="/" element={<Navigate to="/tests" replace />} />
        <Route path="*" element={<Navigate to="/tests" replace />} />
      </Route>
    </Routes>
  );
}
