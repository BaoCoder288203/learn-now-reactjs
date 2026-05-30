import React, { useState, useEffect } from "react";
import { Clipboard, CheckCircle, Flame, Star, Trash2, Filter, AlertCircle, HelpCircle } from "lucide-react";
import { UserVocabulary } from "../types.js";
import { apiUrl, authFetch } from "../lib/api.js";

interface VocabularyBookProps {
  token: string;
}

export default function VocabularyBook({ token }: VocabularyBookProps) {
  const [vocab, setVocab] = useState<UserVocabulary[]>([]);
  const [filteredVocab, setFilteredVocab] = useState<UserVocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterState, setFilterState] = useState<"all" | "new" | "learning" | "mastered">("all");
  
  const [statusLoadMap, setStatusLoadMap] = useState<Record<string, boolean>>({});

  const fetchVocabList = async () => {
    try {
      const response = await authFetch(apiUrl("/api/vocab"), token);
      if (!response.ok) throw new Error("Không thể tải sổ từ vựng.");
      const data = await response.json();
      setVocab(data);
    } catch (err: any) {
      setError(err.message || "Tải danh sách từ vựng thất bại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVocabList();
  }, [token]);

  useEffect(() => {
    if (filterState === "all") {
      setFilteredVocab(vocab);
    } else {
      setFilteredVocab(vocab.filter(v => v.status === filterState));
    }
  }, [vocab, filterState]);

  const handleUpdateStatus = async (vocabId: string, newStatus: "new" | "learning" | "mastered") => {
    setStatusLoadMap(prev => ({ ...prev, [vocabId]: true }));
    try {
      const response = await authFetch(apiUrl(`/api/vocab/${vocabId}/status`), token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error("Không thể cập nhật trạng thái.");
      
      setVocab(prev => prev.map(item => item.id === vocabId ? { ...item, status: newStatus } : item));
    } catch (err: any) {
      alert(err.message || "Lỗi khi thay đổi trạng thái.");
    } finally {
      setStatusLoadMap(prev => ({ ...prev, [vocabId]: false }));
    }
  };

  const handleDeleteVocab = async (vocabId: string, word: string) => {
    const confirmDel = window.confirm(`Xóa vĩnh viễn "${word}" khỏi danh sách ôn tập?`);
    if (!confirmDel) return;

    try {
      const response = await authFetch(apiUrl(`/api/vocab/${vocabId}`), token, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Không thể xóa từ này.");

      setVocab(prev => prev.filter(item => item.id !== vocabId));
    } catch (err: any) {
      alert(err.message || "Xóa thất bại.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium font-sans">Đang tải sổ từ vựng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm justify-center flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>Lỗi: {error}</span>
        </div>
      </div>
    );
  }

  const totalCount = vocab.length;
  const newCount = vocab.filter(v => v.status === "new").length;
  const learningCount = vocab.filter(v => v.status === "learning").length;
  const masteredCount = vocab.filter(v => v.status === "mastered").length;

  const statusLabel = (s: string) => {
    if (s === "new") return "Mới";
    if (s === "learning") return "Đang học";
    if (s === "mastered") return "Đã thuộc";
    return s;
  };

  return (
    <div id="vocabulary-notebook-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight sm:text-3xl">
          Sổ Từ vựng
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-xl">
          Ôn tập các từ vựng đã lưu trong quá trình làm bài thi. Theo dõi trạng thái học để củng cố khả năng đọc hiểu.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-gray-100">
        <button
          onClick={() => setFilterState("all")}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
            filterState === "all"
              ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-gray-200"
              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="block text-3xs font-mono uppercase tracking-widest font-bold opacity-60">
            TỔNG CỘNG
          </span>
          <span className="block text-2xl font-bold font-sans mt-1">{totalCount} từ</span>
        </button>

        <button
          onClick={() => setFilterState("new")}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
            filterState === "new"
              ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-10/10"
              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="block text-3xs font-mono uppercase tracking-widest font-bold opacity-70">
            🆕 TỪ MỚI
          </span>
          <span className="block text-2xl font-bold font-sans mt-1">{newCount} từ</span>
        </button>

        <button
          onClick={() => setFilterState("learning")}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
            filterState === "learning"
              ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-10/10"
              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="block text-3xs font-mono uppercase tracking-widest font-bold opacity-70">
            🔥 ĐANG HỌC
          </span>
          <span className="block text-2xl font-bold font-sans mt-1">{learningCount} từ</span>
        </button>

        <button
          onClick={() => setFilterState("mastered")}
          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
            filterState === "mastered"
              ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-10/10"
              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
          }`}
        >
          <span className="block text-3xs font-mono uppercase tracking-widest font-bold opacity-70">
            🎯 ĐÃ THUỘC
          </span>
          <span className="block text-2xl font-bold font-sans mt-1">{masteredCount} từ</span>
        </button>
      </div>

      {filteredVocab.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-150 rounded-2xl shadow-3xs">
          <Clipboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Không có từ vựng nào trong mục này.</p>
          <p className="text-xs text-gray-400 mt-1">
            {filterState === "all"
              ? "Hãy làm bài thi Part 5-7 và bôi chọn các từ chưa biết để lưu lại."
              : `Thay đổi bộ lọc hoặc bôi chọn thêm từ để thêm vào mục "${statusLabel(filterState)}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="vocabulary-study-grid">
          {filteredVocab.map((item) => {
            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-xl font-bold text-gray-950 font-sans tracking-tight">
                        {item.word}
                      </span>
                      {item.partNumber && (
                        <span className="inline-block ml-2 px-2 py-0.5 rounded text-4xs font-bold bg-blue-50 text-blue-700 font-mono border border-blue-100/30">
                          PART {item.partNumber}
                        </span>
                      )}
                    </div>

                    <span className={`px-2 py-0.5 rounded text-4xs uppercase tracking-widest font-mono font-bold leading-tight ${
                      item.status === "new"
                        ? "bg-blue-50 text-blue-700"
                        : item.status === "learning"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-emerald-50 text-emerald-800"
                    }`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  {item.sentenceContext ? (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                      <span className="text-4xs text-gray-400 font-mono block uppercase tracking-widest mb-1 select-none">
                        Ngữ cảnh:
                      </span>
                      <p className="text-xs text-gray-600 italic leading-relaxed font-sans">
                        "{item.sentenceContext}"
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic mt-3">Lưu không kèm câu ngữ cảnh.</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-4xs font-mono uppercase tracking-wider text-gray-400">Trạng thái:</span>
                    <button
                      disabled={statusLoadMap[item.id]}
                      onClick={() => handleUpdateStatus(item.id, "new")}
                      className={`px-2 py-1 rounded text-3xs font-semibold cursor-pointer transition-colors ${
                        item.status === "new"
                          ? "bg-blue-600 text-white font-bold"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      Mới
                    </button>
                    <button
                      disabled={statusLoadMap[item.id]}
                      onClick={() => handleUpdateStatus(item.id, "learning")}
                      className={`px-2 py-1 rounded text-3xs font-semibold cursor-pointer transition-colors ${
                        item.status === "learning"
                          ? "bg-amber-600 text-white font-bold"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-250/60"
                      }`}
                    >
                      Đang học
                    </button>
                    <button
                      disabled={statusLoadMap[item.id]}
                      onClick={() => handleUpdateStatus(item.id, "mastered")}
                      className={`px-2 py-1 rounded text-3xs font-semibold cursor-pointer transition-colors ${
                        item.status === "mastered"
                          ? "bg-emerald-600 text-white font-bold"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-250/60"
                      }`}
                    >
                      Đã thuộc
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteVocab(item.id, item.word)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Xóa vĩnh viễn khỏi sổ từ vựng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
