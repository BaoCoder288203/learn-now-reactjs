import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, ClipboardCheck, BookOpen, Layers, Sparkles, Filter } from "lucide-react";
import { Test } from "../types.js";
import { apiUrl, authFetch } from "../lib/api.js";

interface TestSelectionProps {
  token: string;
}

export default function TestSelection({ token }: TestSelectionProps) {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partFilter, setPartFilter] = useState<number | null>(null);
  const [inProgressByTestId, setInProgressByTestId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadTests() {
      try {
        const [testsRes, attemptsRes] = await Promise.all([
          authFetch(apiUrl("/api/tests"), token),
          authFetch(apiUrl("/api/attempts"), token),
        ]);

        if (!testsRes.ok) {
          throw new Error("Không thể tải danh sách đề thi.");
        }
        setTests(await testsRes.json());

        if (attemptsRes.ok) {
          const attempts = await attemptsRes.json();
          const inProgress: Record<string, boolean> = {};
          for (const att of attempts) {
            if (att.status === "STARTED") {
              inProgress[att.testId] = true;
            }
          }
          setInProgressByTestId(inProgress);
        }
      } catch (err: any) {
        setError(err.message || "Lỗi kết nối khi tải đề thi.");
      } finally {
        setLoading(false);
      }
    }
    loadTests();
  }, [token]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Đang tải danh sách đề thi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div id="test-selection-panel" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-950 text-white p-8 rounded-2xl border border-slate-800 shadow-lg mb-10">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-blue-500/20 text-blue-300 font-mono text-2xs uppercase tracking-widest px-2.5 py-1 rounded-full font-bold border border-blue-500/30">
            Cổng Luyện thi Tương tác
          </span>
          <h1 className="mt-4 text-3xl md:text-4xl font-sans font-bold tracking-tight">
            Nâng cao Trình độ: Luyện thi TOEIC Tương tác
          </h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Làm bài thi đầy đủ hoặc luyện từng phần riêng.
            Trong Part 5, 6 và 7, bạn có thể bôi chọn từ vựng để thêm vào sổ ôn tập.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-blue-500/5 to-transparent pointer-events-none"></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Thư viện Đề thi</h2>
          <p className="text-sm text-gray-500">Chọn đề thi bên dưới và chế độ luyện tập.</p>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-gray-400 flex items-center space-x-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Chế độ:</span>
          </span>
          <button
            onClick={() => setPartFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${
              partFilter === null
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Toàn bộ
          </button>
          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
            <button
              key={num}
              onClick={() => setPartFilter(num)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${
                partFilter === num
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Chỉ Part {num}
            </button>
          ))}
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Hiện chưa có đề thi nào.</p>
          <p className="text-sm text-gray-400">Nếu bạn là quản trị viên, hãy vào trang Quản trị để nhập hoặc tạo đề thi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            const totalQs = test.parts?.reduce((sum, p) => sum + (p._count?.questions || 0), 0) || 0;
            const hasFocusPart = partFilter !== null ? test.parts?.some(p => p.partNumber === partFilter && (p._count?.questions || 0) > 0) : true;
            const hasInProgress = !!inProgressByTestId[test.id];

            return (
              <div
                key={test.id}
                className={`bg-white border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between ${
                  hasFocusPart
                    ? "border-gray-200 hover:border-blue-200 hover:shadow-md"
                    : "opacity-40 border-gray-100 pointer-events-none"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2.5 py-0.5 rounded text-3xs font-bold uppercase tracking-widest bg-gray-100 text-gray-600 font-mono">
                      TOEIC CHUẨN
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      {hasInProgress && (
                        <span className="px-2.5 py-0.5 rounded text-3xs font-bold bg-amber-50 text-amber-700 font-mono border border-amber-100">
                          ĐANG LÀM
                        </span>
                      )}
                      {partFilter !== null && (
                        <span className="px-2.5 py-0.5 rounded text-3xs font-bold bg-blue-50 text-blue-700 font-mono">
                          CHỈ PART {partFilter}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2">
                    {test.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                    {test.description || "Làm bài thi chuẩn để đánh giá ngữ pháp, phân tích hội thoại và kỹ năng từ vựng."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-700 text-2xs rounded font-mono border border-slate-100">
                      📝 {totalQs} Câu hỏi
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-700 text-2xs rounded font-mono border border-slate-100">
                      ⏳ Tính giờ
                    </span>
                  </div>

                  <div className="mt-5 border-t border-gray-50 pt-4">
                    <span className="block text-2xs font-semibold text-gray-400 uppercase tracking-widest font-mono mb-2">
                      Chi tiết đề thi:
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                        const targetPart = test.parts?.find(p => p.partNumber === num);
                        const count = targetPart?._count?.questions || 0;
                        const isSelectedPart = partFilter === num;

                        return (
                          <div
                            key={num}
                            className={`p-1.5 rounded border text-2xs font-mono transition-colors ${
                              isSelectedPart
                                ? "bg-blue-600 border-blue-600 text-white font-bold"
                                : count > 0
                                ? "bg-gray-50 border-gray-100 text-gray-700"
                                : "bg-gray-100/40 border-transparent text-gray-300"
                            }`}
                            title={`Part ${num}: ${count} Câu hỏi`}
                          >
                            <span>Part {num}</span>
                            {/* <span className="block text-3xs font-sans opacity-80">{count}c</span> */}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    id={`start-test-${test.id}`}
                    onClick={() => navigate(`/test/${test.id}${partFilter !== null ? `?part=${partFilter}` : ""}`)}
                    className={`w-full text-white text-sm font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-all duration-200 ${
                      hasInProgress
                        ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span>
                      {hasInProgress
                        ? "Làm tiếp"
                        : partFilter === null
                          ? "Bắt đầu Thi"
                          : `Luyện Part ${partFilter}`}
                    </span>
                  </button>
                  <p className="text-4xs text-center text-gray-400 mt-2 font-mono uppercase tracking-widest">
                    TIẾN TRÌNH ĐƯỢC LƯU TỰ ĐỘNG
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
