import React, { useState, useEffect } from "react";
import { Award, Layers, Clock, AlertTriangle, Sparkles, LogIn, ChevronRight, ClipboardList } from "lucide-react";
import { User, TestAttempt } from "./types.js";
import Navigation from "./components/Navigation.js";
import LoginRegister from "./components/LoginRegister.js";
import TestSelection from "./components/TestSelection.js";
import TestDoing from "./components/TestDoing.js";
import TestResult from "./components/TestResult.js";
import VocabularyBook from "./components/VocabularyBook.js";
import AdminDashboard from "./components/AdminDashboard.js";

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("toeic_token"));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("toeic_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [activeTab, setActiveTab] = useState<string>("tests");
  
  // Test doing flow states
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [activePartFocus, setActivePartFocus] = useState<number | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [showResultAttemptId, setShowResultAttemptId] = useState<string | null>(null);

  // History states
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Synchronize credentials to LocalStorage
  const handleAuthSuccess = (accessToken: string, loggedUser: User) => {
    localStorage.setItem("toeic_token", accessToken);
    localStorage.setItem("toeic_user", JSON.stringify(loggedUser));
    setToken(accessToken);
    setUser(loggedUser);
    
    // Default switch
    if (loggedUser.role === "ADMIN") {
      setActiveTab("admin");
    } else {
      setActiveTab("tests");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("toeic_token");
    localStorage.removeItem("toeic_user");
    setToken(null);
    setUser(null);
    setActiveTab("tests");
    setActiveTestId(null);
    setActiveAttemptId(null);
    setShowResultAttemptId(null);
  };

  // Load user attempts history
  const loadUserAttemptHistory = async () => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/attempts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttempts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "attempts" && token) {
      loadUserAttemptHistory();
    }
  }, [activeTab, token]);

  if (!token || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
        <LoginRegister onSuccess={handleAuthSuccess} />
        <footer className="py-6 border-t border-gray-100 bg-white text-center text-4xs text-gray-400 uppercase tracking-widest font-mono">
          TOEIC Practice Applet • Secure Fullstack sandboxed environment • 2026
        </footer>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // ACTIVE STUDY AND DRILL SCREEN BRANCHES
  // ------------------------------------------------------------------------
  // If active testing taking is triggered:
  if (activeTestId) {
    return (
      <TestDoing
        token={token}
        testId={activeTestId}
        partFocus={activePartFocus}
        onCancel={() => {
          setActiveTestId(null);
          setActivePartFocus(null);
        }}
        onFinishTest={(attemptId) => {
          setActiveTestId(null);
          setActivePartFocus(null);
          setShowResultAttemptId(attemptId);
        }}
      />
    );
  }

  // If score cards results are triggered:
  if (showResultAttemptId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TestResult
          token={token}
          attemptId={showResultAttemptId}
          onRestart={() => {
            setShowResultAttemptId(null);
            loadUserAttemptHistory();
            setActiveTab("attempts");
          }}
        />
      </div>
    );
  }

  const handleStartExamFlow = (testId: string, partFocus: number | null) => {
    setActiveTestId(testId);
    setActivePartFocus(partFocus);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col justify-between">
      <div>
        <Navigation user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="animate-fade-in duration-300">
          {/* TAB: PRACTICE DRILLS SELECTOR */}
          {activeTab === "tests" && (
            <TestSelection token={token} onStartTest={handleStartExamFlow} />
          )}

          {/* TAB: STUDY NOTEBOOK SYSTEM */}
          {activeTab === "vocab" && (
            <VocabularyBook token={token} />
          )}

          {/* TAB: ATTEMPTS REVIEW LOGS LIST */}
          {activeTab === "attempts" && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6" id="history-logs-tab">
              <div>
                <h1 className="text-2xl font-serif font-extrabold text-gray-900 tracking-tight sm:text-3xl">
                  Historical Score Reports
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  View scores and analyze previous comprehensive logs representing exam metrics.
                </p>
              </div>

              {historyLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs text-gray-400 mt-2 font-mono">SYNCING COMPILATIONS...</p>
                </div>
              ) : attempts.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-150 rounded-2xl">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium font-sans">No test attempts registered yet.</p>
                  <button
                    onClick={() => setActiveTab("tests")}
                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline cursor-pointer"
                  >
                    Take your first TOEIC diagnostic quiz now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {attempts.map((att) => {
                    const isCompleted = att.status === "COMPLETED";

                    return (
                      <div
                        key={att.id}
                        className="bg-white border border-gray-250/70 p-6 rounded-2xl hover:border-gray-300 transition-all shadow-3xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-4xs font-mono uppercase tracking-widest text-gray-400">
                              METRICS ID: {att.id.substring(0, 8)}...
                            </span>
                            <span className={`px-2 py-0.5 rounded text-4xs font-bold font-mono ${
                              isCompleted
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}>
                              {att.status}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-gray-900 line-clamp-2">
                            {att.test?.title || "TOEIC Diagnostic Session"}
                          </h3>
                          <span className="block text-3xs text-gray-400 mt-1 font-mono">
                            📅 Started on: {new Date(att.startedAt).toLocaleString()}
                          </span>

                          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                            <div>
                              <span className="text-4xs text-gray-400 uppercase font-mono block">Scoring Grade</span>
                              {isCompleted ? (
                                <strong className="text-2xl font-extrabold text-blue-600 font-sans block">
                                  {att.score} <span className="text-xs font-normal text-gray-500 font-mono">/ 990 max</span>
                                </strong>
                              ) : (
                                <span className="text-xs text-amber-700 font-bold block animate-pulse">
                                  ⚡ Answer In Progress
                                </span>
                              )}
                            </div>

                            {isCompleted && (
                              <button
                                onClick={() => setShowResultAttemptId(att.id)}
                                className="px-3.5 py-1.5 bg-gray-950 text-white rounded-lg text-3xs font-bold hover:bg-gray-800 transition-colors cursor-pointer flex items-center space-x-1"
                              >
                                <span>Analyze Answers</span>
                                <ChevronRight className="w-3 h-3 shrink-0" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: ADMIN DASHBOARD CONTROL */}
          {activeTab === "admin" && user.role === "ADMIN" && (
            <AdminDashboard token={token} />
          )}
        </main>
      </div>

      <footer className="py-6 border-t border-gray-100 bg-white text-center text-4xs text-gray-400 uppercase tracking-widest font-mono mt-12 select-none">
        TOEIC Study Portal • Handcrafted Full-Stack Portal • Secure Sandboxed SQLite db
      </footer>
    </div>
  );
}
