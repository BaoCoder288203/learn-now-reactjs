import React, { useState, useEffect } from "react";
import { Clock, ChevronRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TestAttempt } from "../types.js";
import { apiUrl, authFetch } from "../lib/api.js";

interface HistoryPageProps {
  token: string;
}

export default function HistoryPage({ token }: HistoryPageProps) {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await authFetch(apiUrl("/api/attempts"), token);
        if (response.ok) {
          setAttempts(await response.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight sm:text-3xl">
          Lịch sử Điểm số
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Xem điểm và phân tích kết quả các bài thi đã làm.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-xs text-gray-400 mt-2 font-mono">ĐANG TẢI DỮ LIỆU...</p>
        </div>
      ) : attempts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-150 rounded-2xl">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Chưa có lượt thi nào.</p>
          <button
            onClick={() => navigate("/tests")}
            className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline cursor-pointer"
          >
            Làm bài thi TOEIC đầu tiên ngay
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
                      MÃ: {att.id.substring(0, 8)}...
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-4xs font-bold font-mono ${
                        isCompleted ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isCompleted ? "HOÀN THÀNH" : "ĐANG LÀM"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 line-clamp-2">
                    {att.test?.title || "Bài thi TOEIC"}
                  </h3>
                  <span className="block text-3xs text-gray-400 mt-1 font-mono">
                    Bắt đầu: {new Date(att.startedAt).toLocaleString("vi-VN")}
                  </span>

                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div>
                      <span className="text-4xs text-gray-400 uppercase font-mono block">Điểm số</span>
                      {isCompleted ? (
                        <strong className="text-2xl font-extrabold text-blue-600 block">
                          {att.score}{" "}
                          <span className="text-xs font-normal text-gray-500 font-mono">/ 990 tối đa</span>
                        </strong>
                      ) : (
                        <span className="text-xs text-amber-700 font-bold block animate-pulse">
                          Đang làm bài
                        </span>
                      )}
                    </div>

                    {isCompleted ? (
                      <button
                        onClick={() => navigate(`/result/${att.id}`)}
                        className="px-3.5 py-1.5 bg-gray-950 text-white rounded-lg text-3xs font-bold hover:bg-gray-800 transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <span>Xem chi tiết</span>
                        <ChevronRight className="w-3 h-3 shrink-0" />
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/test/${att.testId}`)}
                        className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-3xs font-bold hover:bg-blue-700 transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3 shrink-0" />
                        <span>Làm tiếp</span>
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
  );
}
