import React, { useState, useEffect } from "react";
import {
  Sparkles,
  FolderPlus,
  UploadCloud,
  CheckCircle,
  Edit,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react";
import { Test, Question } from "../types.js";
import { apiUrl, authFetch } from "../lib/api.js";

interface AdminDashboardProps {
  token: string;
}

interface ImportResult {
  totalQuestions: number;
  partsSummary: { partNumber: number; questionCount: number }[];
}

interface IngestionFileAssignment {
  fileId: string;
  fileName: string;
  role: "EXAM_DOC" | "LISTENING_KEY_DOC" | "READING_KEY_IMAGE" | "AUDIO_FILE" | "UNKNOWN";
}

interface ImportJobState {
  id: string;
  status:
    | "QUEUED"
    | "EXTRACTING"
    | "CLASSIFYING"
    | "REVIEW_REQUIRED"
    | "IMPORTING"
    | "DONE"
    | "FAILED";
  reviewRequired: boolean;
  errorMessage?: string;
}

const PROCESSING_STEPS = [
  "Upload file lên S3",
  "MinerU trích xuất nội dung",
  "AI phân loại vai trò file",
  "Review mapping (nếu cần)",
  "Gemini phân tích Part 1-7",
  "Lưu vào cơ sở dữ liệu",
];

export default function AdminDashboard({ token }: AdminDashboardProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState<{ summary: any; attempts: any[] } | null>(null);
  const [activeTab, setActiveTab] = useState<"manage" | "stats">("manage");
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState("");

  // Create test form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newExamType, setNewExamType] = useState("TOEIC");
  const [manualCreating, setManualCreating] = useState(false);

  // AI Import state
  const [importTestId, setImportTestId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState(-1);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [importJob, setImportJob] = useState<ImportJobState | null>(null);
  const [reviewAssignments, setReviewAssignments] = useState<IngestionFileAssignment[]>([]);

  // Question editing
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editQText, setEditQText] = useState("");
  const [editQPassage, setEditQPassage] = useState("");
  const [editQTranscript, setEditQTranscript] = useState("");
  const [editQCorrect, setEditQCorrect] = useState("A");
  const [editQOptions, setEditQOptions] = useState<{ letter: string; text: string }[]>([]);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Test detail expansion
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [expandedTestData, setExpandedTestData] = useState<any>(null);

  // ---- Data Loading ----
  const loadData = async () => {
    setLoading(true);
    try {
      const testsRes = await authFetch(apiUrl("/api/tests"), token);
      if (testsRes.ok) setTests(await testsRes.json());

      const statsRes = await authFetch(apiUrl("/api/admin/stats"), token);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // ---- Test Management ----
  const handleExpandTest = async (testId: string) => {
    if (expandedTestId === testId) {
      setExpandedTestId(null);
      setExpandedTestData(null);
      return;
    }
    try {
      const res = await authFetch(apiUrl(`/api/tests/${testId}`), token);
      if (res.ok) {
        setExpandedTestData(await res.json());
        setExpandedTestId(testId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePublish = async (testId: string, currentPublished: boolean) => {
    try {
      const response = await authFetch(apiUrl(`/api/admin/tests/${testId}/publish`), token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !currentPublished }),
      });
      if (!response.ok) throw new Error("Không thể thay đổi trạng thái xuất bản.");
      setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, published: !currentPublished } : t)));
      setSuccessMsg("Cập nhật trạng thái đề thi thành công.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTestManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setManualCreating(true);
    try {
      const response = await authFetch(apiUrl("/api/admin/tests/manual"), token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          examType: newExamType,
        }),
      });
      if (!response.ok) throw new Error("Không thể tạo khung đề thi.");
      setNewTitle("");
      setNewDesc("");
      loadData();
      setSuccessMsg("Đã tạo khung đề thi với Part 1-7. Sẵn sàng nhập câu hỏi!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setManualCreating(false);
    }
  };

  // ---- Question Editing ----
  const handleStartEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setEditQText(q.questionText);
    setEditQPassage(q.passage || "");
    setEditQTranscript(q.transcript || "");
    setEditQCorrect(q.correctAnswer);
    setEditQOptions(q.options.map((o) => ({ letter: o.letter, text: o.text })));
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setSavingQuestion(true);
    try {
      const response = await authFetch(apiUrl(`/api/admin/questions/${editingQuestion.id}`), token, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: editQText,
          passage: editQPassage || null,
          transcript: editQTranscript || null,
          correctAnswer: editQCorrect,
          options: editQOptions,
        }),
      });
      if (!response.ok) throw new Error("Không thể chỉnh sửa câu hỏi.");
      setEditingQuestion(null);
      if (expandedTestId) {
        const res = await authFetch(apiUrl(`/api/tests/${expandedTestId}`), token);
        if (res.ok) setExpandedTestData(await res.json());
      }
      setSuccessMsg("Chỉnh sửa câu hỏi thành công.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingQuestion(false);
    }
  };

  // ---- AI File Import ----
  const validateBatchFiles = (files: File[]) => {
    const invalid = files.find(
      (f) => f.type !== "application/pdf" && f.type !== "audio/mpeg" && f.type !== "audio/mp3"
    );
    if (invalid) {
      return `File "${invalid.name}" không hợp lệ. Chỉ hỗ trợ PDF và MP3. Nếu là ảnh, hãy chuyển thành PDF trước khi upload.`;
    }
    const pdfCount = files.filter((f) => f.type === "application/pdf").length;
    const mp3Count = files.filter((f) => f.type === "audio/mpeg" || f.type === "audio/mp3").length;
    if (pdfCount < 2) return "Cần ít nhất 2 file PDF (đề thi + đáp án/key).";
    if (mp3Count < 1) return "Cần ít nhất 1 file MP3 cho Part 1-4.";
    return "";
  };

  const handlePickedFiles = (files: File[]) => {
    setSelectedFiles(files);
    const validationError = validateBatchFiles(files);
    if (validationError) setImportError(validationError);
    else setImportError("");
  };

  const handleDropFiles = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    if (importing) return;
    const files = Array.from(e.dataTransfer.files || []) as File[];
    handlePickedFiles(files);
  };

  const canSubmitImport = () => {
    if (!importTestId) return false;
    if (!selectedFiles.length) return false;
    return !validateBatchFiles(selectedFiles);
  };

  const fetchImportJob = async (jobId: string) => {
    const response = await authFetch(apiUrl(`/api/admin/import-jobs/${jobId}`), token);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Không thể tải trạng thái import.");
    }

    const nextState: ImportJobState = {
      id: data.id,
      status: data.status,
      reviewRequired: data.reviewRequired,
      errorMessage: data.errorMessage || undefined,
    };
    setImportJob(nextState);

    if (data.status === "REVIEW_REQUIRED") {
      setReviewAssignments(
        (data.files || []).map((f: any) => ({
          fileId: f.id,
          fileName: f.originalName,
          role: f.detectedRole || "UNKNOWN",
        }))
      );
      setImporting(false);
    } else if (data.status === "DONE") {
      const parsedResult = data.draft?.parsedToeicJson?.result;
      if (parsedResult) {
        setImportResult({
          totalQuestions: parsedResult.totalQuestions || 0,
          partsSummary: parsedResult.partsSummary || [],
        });
        setSuccessMsg(`Import thành công! ${parsedResult.totalQuestions || 0} câu hỏi đã được thêm.`);
        setTimeout(() => setSuccessMsg(""), 5000);
      }
      setImporting(false);
      setSelectedFiles([]);
      loadData();
    } else if (data.status === "FAILED") {
      setImporting(false);
      setImportError(data.errorMessage || "Import thất bại.");
    }
  };

  const handleAiImport = async () => {
    if (!canSubmitImport()) return;
    setImporting(true);
    setImportStep(0);
    setImportError("");
    setImportResult(null);
    setImportJob(null);
    setReviewAssignments([]);

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      setImportStep(1);

      const response = await authFetch(
        apiUrl(`/api/admin/tests/${importTestId}/import-jobs`),
        token,
        { method: "POST", body: formData }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Xử lý đề thi thất bại.");
      }

      setImportJob({
        id: data.jobId,
        status: data.status,
        reviewRequired: data.reviewRequired,
      });
      await fetchImportJob(data.jobId);
    } catch (err: any) {
      setImportError(err.message || "Đã xảy ra lỗi.");
      setImporting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!importJob) return;
    setImporting(true);
    setImportError("");
    try {
      const response = await authFetch(
        apiUrl(`/api/admin/import-jobs/${importJob.id}/review-submit`),
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignments: reviewAssignments }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Không thể xác nhận review.");
      }
      await fetchImportJob(importJob.id);
    } catch (err: any) {
      setImportError(err.message || "Lỗi khi xác nhận review.");
      setImporting(false);
    }
  };

  useEffect(() => {
    if (!importJob) return;
    if (!["QUEUED", "EXTRACTING", "CLASSIFYING", "IMPORTING"].includes(importJob.status)) return;

    const timer = setInterval(() => {
      fetchImportJob(importJob.id).catch((err) => {
        setImportError(err.message || "Không thể đồng bộ trạng thái import.");
        setImporting(false);
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [importJob?.id, importJob?.status]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ---- Render ----
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-150">
        <div>
          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-3xs font-bold uppercase font-mono rounded tracking-widest block w-fit mb-1 border border-blue-100/30">
            Bảng điều khiển Quản trị
          </span>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight sm:text-3xl">Trung tâm Quản trị</h1>
          <p className="text-sm text-gray-500">
            Quản lý đề thi, upload file & phân tích tự động bằng Gemini AI.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs font-semibold">Đồng bộ</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl text-xs font-semibold flex items-center">
          <CheckCircle className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-100 pb-px">
        <button
          onClick={() => setActiveTab("manage")}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all duration-150 cursor-pointer ${
            activeTab === "manage"
              ? "border-blue-600 text-blue-700 font-extrabold"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200"
          }`}
        >
          Quản lý Đề thi & Import AI
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all duration-150 cursor-pointer ${
            activeTab === "stats"
              ? "border-blue-600 text-blue-700 font-extrabold"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200"
          }`}
        >
          Thống kê Học viên
        </button>
      </div>

      {activeTab === "manage" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Test list + create */}
          <div className="lg:col-span-2 space-y-8">
            {/* Create Test */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-widest flex items-center space-x-1.5">
                <FolderPlus className="w-4 h-4 text-blue-500" />
                <span>Tạo Khung Đề thi</span>
              </h3>
              <form onSubmit={handleCreateTestManually} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-3xs font-mono uppercase text-gray-400 mb-1">Loại đề</label>
                    <select
                      value={newExamType}
                      onChange={(e) => setNewExamType(e.target.value)}
                      className="block w-full p-2 border border-gray-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="TOEIC">TOEIC</option>
                      <option value="IELTS" disabled>IELTS (sắp ra mắt)</option>
                      <option value="TOEFL" disabled>TOEFL (sắp ra mắt)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-3xs font-mono uppercase text-gray-400 mb-1">Tên Đề thi</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Đề thi TOEIC ETS 2024 #1"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-mono uppercase text-gray-400 mb-1">Mô tả ngắn</label>
                    <input
                      type="text"
                      placeholder="VD: Đề thi thực hành Part 1-7"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={manualCreating}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                >
                  {manualCreating ? "Đang tạo..." : "Tạo Khung Đề thi (Part 1-7)"}
                </button>
              </form>
            </div>

            {/* Test List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-widest">
                Danh sách Đề thi ({tests.length})
              </h3>

              {tests.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Chưa có đề thi nào.</p>
              ) : (
                <div className="space-y-4">
                  {tests.map((test) => {
                    const isExpanded = expandedTestId === test.id;
                    return (
                      <div key={test.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-gray-900 text-base">{test.title}</span>
                              {test.examType && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-100/30">
                                  {test.examType}
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                                  test.published ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                                }`}
                              >
                                {test.published ? "ĐÃ XUẤT BẢN" : "BẢN NHÁP"}
                              </span>
                            </div>
                            <p className="text-2xs text-gray-400 mt-1 font-mono">{test.id}</p>
                          </div>
                          <div className="flex items-center space-x-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleTogglePublish(test.id, test.published)}
                              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                                test.published
                                  ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                                  : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {test.published ? "Hủy xuất bản" : "Xuất bản"}
                            </button>
                            <button
                              onClick={() => handleExpandTest(test.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                            >
                              {isExpanded ? "Thu gọn" : "Quản lý câu hỏi"}
                            </button>
                          </div>
                        </div>

                        {isExpanded && expandedTestData && (
                          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                            <span className="block text-2xs font-bold text-gray-400 uppercase tracking-widest font-mono">
                              Danh sách Câu hỏi (Chọn để chỉnh sửa)
                            </span>
                            <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-2">
                              {expandedTestData.parts?.map((part: any) => (
                                <div key={part.id} className="space-y-2">
                                  <div className="p-2 bg-blue-50/40 text-blue-900 border border-blue-100/30 rounded-lg text-2xs font-bold">
                                    Part {part.partNumber}: {part.title} ({part.questions?.length || 0} câu)
                                  </div>
                                  {part.questionGroups?.length > 0
                                    ? part.questionGroups.map((group: any) => (
                                        <div key={group.id} className="ml-2 border-l-2 border-blue-100 pl-3 space-y-1.5">
                                          {group.passage && (
                                            <p className="text-3xs text-gray-400 font-mono truncate max-w-md">
                                              Đoạn văn: {group.passage.slice(0, 100)}...
                                            </p>
                                          )}
                                          {group.transcript && (
                                            <p className="text-3xs text-gray-400 font-mono truncate max-w-md">
                                              Transcript: {group.transcript.slice(0, 100)}...
                                            </p>
                                          )}
                                          {group.questions?.map((q: any) => (
                                            <QuestionRow key={q.id} q={q} onEdit={handleStartEditQuestion} />
                                          ))}
                                        </div>
                                      ))
                                    : part.questions?.map((q: any) => (
                                        <QuestionRow key={q.id} q={q} onEdit={handleStartEditQuestion} />
                                      ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: AI Import + Question Editor */}
          <div className="space-y-8">
            {/* AI Import Panel */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="space-y-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-3xs font-bold font-mono uppercase tracking-wider border border-blue-100/30">
                  <Sparkles className="w-2.5 h-2.5 text-blue-600 mr-1 shrink-0" />
                  Import tự động bằng AI
                </span>
                <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-widest">
                  Upload & Phân tích Đề thi
                </h3>
              </div>

              <p className="text-3xs text-gray-500 leading-relaxed">
                Chọn nhiều file một lần: đề + key ở dạng PDF và audio MP3 cho Part 1-4. Nếu bạn có ảnh, hãy chuyển ảnh sang PDF trước khi upload.
              </p>

              {/* Step 1: Select test */}
              <div>
                <label className="block text-3xs font-mono uppercase text-gray-400 mb-1">1. Chọn Đề thi đích</label>
                <select
                  value={importTestId}
                  onChange={(e) => setImportTestId(e.target.value)}
                  disabled={importing}
                  className="block w-full p-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Chọn Đề thi --</option>
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Upload files */}
              <div className="space-y-3">
                <label className="block text-3xs font-mono uppercase text-gray-400">
                  2. Upload nhiều file (1 lần)
                </label>
                <label
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (!importing) setIsDraggingFiles(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!importing) setIsDraggingFiles(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDraggingFiles(false);
                  }}
                  onDrop={handleDropFiles}
                  className={`w-full border-2 border-dashed rounded-lg px-3 py-4 text-center transition-colors cursor-pointer block ${
                    isDraggingFiles
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30"
                  }`}
                >
                  <UploadCloud className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                  <span className="text-3xs text-gray-400">
                    {isDraggingFiles
                      ? "Thả file vào đây..."
                      : "Kéo-thả hoặc chọn file: ít nhất 2 PDF (exam + key) và 1 MP3 (audio Part 1-4)"}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.mp3,audio/mpeg"
                    className="hidden"
                    disabled={importing}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []) as File[];
                      handlePickedFiles(files);
                    }}
                  />
                </label>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-green-800 truncate">{file.name}</p>
                          <p className="text-3xs text-green-600 font-mono">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      className="text-3xs text-gray-500 underline cursor-pointer"
                    >
                      Xóa danh sách file
                    </button>
                  </div>
                )}
              </div>

              {importJob && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div>
                    <span className="font-semibold">Job ID:</span> {importJob.id}
                  </div>
                  <div>
                    <span className="font-semibold">Trạng thái:</span> {importJob.status}
                  </div>
                </div>
              )}

              {importJob?.status === "REVIEW_REQUIRED" && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <div className="text-xs font-semibold text-amber-800">
                    Cần review mapping file trước khi import.
                  </div>
                  {reviewAssignments.map((item, idx) => (
                    <div key={item.fileId} className="grid grid-cols-1 gap-2">
                      <div className="text-3xs text-gray-700 truncate">{item.fileName}</div>
                      <select
                        value={item.role}
                        onChange={(e) => {
                          const next = [...reviewAssignments];
                          next[idx] = {
                            ...next[idx]!,
                            role: e.target.value as IngestionFileAssignment["role"],
                          };
                          setReviewAssignments(next);
                        }}
                        className="block w-full p-2 border border-gray-200 rounded-xl text-xs bg-white"
                      >
                        <option value="EXAM_DOC">Exam document</option>
                        <option value="LISTENING_KEY_DOC">Listening key/transcript</option>
                        <option value="READING_KEY_IMAGE">Reading key image</option>
                        <option value="AUDIO_FILE">Audio file</option>
                        <option value="UNKNOWN">Unknown</option>
                      </select>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={importing}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl"
                  >
                    Confirm & Import
                  </button>
                </div>
              )}

              {/* Progress */}
              {importing && (
                <div className="space-y-2 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <div className="flex items-center space-x-2 mb-3">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-xs font-bold text-blue-800">Đang xử lý...</span>
                  </div>
                  {PROCESSING_STEPS.map((step, i) => (
                    <div key={i} className="flex items-center space-x-2 text-3xs">
                      {i < importStep ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      ) : i === importStep ? (
                        <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
                      )}
                      <span className={i <= importStep ? "text-gray-800 font-semibold" : "text-gray-400"}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <strong>Lỗi:</strong> {importError}
                </div>
              )}

              {/* Result */}
              {importResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800">
                      Import thành công! {importResult.totalQuestions} câu hỏi
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {importResult.partsSummary.map((p) => (
                      <div key={p.partNumber} className="text-3xs font-mono text-emerald-700">
                        Part {p.partNumber}: {p.questionCount} câu
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleAiImport}
                disabled={importing || !canSubmitImport()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{importing ? "Đang xử lý..." : "Upload & Phân tích bằng AI"}</span>
              </button>
            </div>

            {/* Question Editor */}
            {editingQuestion && (
              <div className="bg-amber-50/50 border border-amber-250 p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-amber-250/50">
                  <span className="text-xs font-bold text-amber-900 uppercase font-mono flex items-center space-x-1">
                    <Edit className="w-3.5 h-3.5" />
                    <span>Chỉnh sửa Câu {editingQuestion.questionNumber}</span>
                  </span>
                  <button onClick={() => setEditingQuestion(null)} className="p-1 hover:bg-amber-100 rounded text-amber-900 cursor-pointer">
                    Hủy
                  </button>
                </div>
                <form onSubmit={handleSaveQuestion} className="space-y-4">
                  <div>
                    <label className="block text-4xs font-mono uppercase text-gray-500 mb-1">Đoạn văn (Part 6/7)</label>
                    <textarea
                      rows={3}
                      value={editQPassage}
                      onChange={(e) => setEditQPassage(e.target.value)}
                      className="block w-full p-2 border border-amber-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      placeholder="Nội dung đoạn văn..."
                    />
                  </div>
                  <div>
                    <label className="block text-4xs font-mono uppercase text-gray-500 mb-1">Transcript (Part 1-4)</label>
                    <textarea
                      rows={3}
                      value={editQTranscript}
                      onChange={(e) => setEditQTranscript(e.target.value)}
                      className="block w-full p-2 border border-amber-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      placeholder="Nội dung hội thoại..."
                    />
                  </div>
                  <div>
                    <label className="block text-4xs font-mono uppercase text-gray-500 mb-1">Nội dung Câu hỏi</label>
                    <input
                      type="text"
                      required
                      value={editQText}
                      onChange={(e) => setEditQText(e.target.value)}
                      className="block w-full px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>
                  <div className="space-y-3">
                    <span className="block text-4xs font-mono uppercase text-gray-500">Các đáp án:</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {editQOptions.map((opt, oIdx) => (
                        <div key={opt.letter} className="flex items-center space-x-1.5 p-1 bg-white border border-amber-100 rounded-lg">
                          <span className="font-bold font-mono text-amber-900 w-4 block text-center uppercase">{opt.letter}</span>
                          <input
                            type="text"
                            required
                            value={opt.text}
                            onChange={(e) => {
                              const u = [...editQOptions];
                              u[oIdx]!.text = e.target.value;
                              setEditQOptions(u);
                            }}
                            className="bg-transparent border-none p-1 text-xs w-full focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-mono text-4xs uppercase tracking-wide text-gray-500">Đáp án đúng:</span>
                      <select
                        value={editQCorrect}
                        onChange={(e) => setEditQCorrect(e.target.value)}
                        className="p-1 rounded border border-gray-200 bg-white font-bold"
                      >
                        {["A", "B", "C", "D"].map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={savingQuestion}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {savingQuestion ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Stats Tab */
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label="Tổng số Lượt thi" value={stats?.summary?.totalAttempts || 0} sub="TỪ KHI KHỞI TẠO" color="text-slate-900" />
            <StatCard label="Lượt thi Hoàn thành" value={stats?.summary?.completedAttempts || 0} sub="CÓ ĐIỂM SỐ" color="text-emerald-600" />
            <StatCard label="Điểm Trung bình" value={`${stats?.summary?.avgScore || 0} / 990`} sub="MỨC CƠ SỞ" color="text-blue-600" />
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider">Lịch sử Thi</h3>
              <span className="text-3xs text-gray-400 font-mono">SẮP XẾP THEO THỜI GIAN</span>
            </div>
            {stats?.attempts && stats.attempts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-150 text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 uppercase font-mono tracking-widest text-4xs text-gray-400">
                    <tr>
                      <th className="px-6 py-3.5">Học viên</th>
                      <th className="px-6 py-3.5">Đề thi</th>
                      <th className="px-6 py-3.5">Trạng thái</th>
                      <th className="px-6 py-3.5">Điểm số</th>
                      <th className="px-6 py-3.5">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {stats.attempts.map((att: any) => (
                      <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="block font-semibold text-gray-950">{att.user?.name}</span>
                          <span className="text-3xs font-mono text-gray-400">{att.user?.email}</span>
                        </td>
                        <td className="px-6 py-4 truncate max-w-xs">
                          <span className="text-gray-800 font-medium">{att.test?.title}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-4xs font-bold uppercase font-mono ${
                              att.status === "COMPLETED" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {att.status === "COMPLETED" ? "HOÀN THÀNH" : "ĐANG LÀM"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <strong className="text-sm font-semibold text-gray-950">
                            {att.status === "COMPLETED" ? att.score : "Đang làm"}
                          </strong>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-3xs font-mono text-gray-400">
                          <span className="block">Bắt đầu: {new Date(att.startedAt).toLocaleString("vi-VN")}</span>
                          {att.completedAt && (
                            <span className="block text-green-600">
                              Kết thúc: {new Date(att.completedAt).toLocaleString("vi-VN")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 italic">Chưa có dữ liệu thống kê.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionRow({ q, onEdit }: { q: any; onEdit: (q: Question) => void; key?: string }) {
  return (
    <div className="p-3.5 bg-white border border-gray-100 rounded-xl hover:border-blue-250 transition-colors flex items-center justify-between gap-4 text-xs">
      <div className="space-y-1 min-w-0">
        <span className="font-bold text-gray-800 block">
          Câu {q.questionNumber}: {q.questionText}
        </span>
        {q.passage && (
          <span className="text-3xs text-gray-400 font-mono block truncate">Đoạn văn: {q.passage}</span>
        )}
        <span className="text-3xs font-mono text-emerald-600 block uppercase">Đáp án đúng: {q.correctAnswer}</span>
      </div>
      <button
        onClick={() => onEdit(q)}
        className="p-1 px-2.5 bg-gray-50 text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-150 text-3xs font-semibold rounded-md cursor-pointer flex items-center space-x-1"
      >
        <Edit className="w-3 h-3" />
        <span>Sửa</span>
      </button>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: any; sub: string; color: string }) {
  return (
    <div className="bg-white border border-gray-150 p-6 rounded-2xl text-center shadow-3xs space-y-1">
      <span className="block text-3xs font-mono uppercase tracking-widest text-gray-400">{label}</span>
      <strong className={`block text-4xl font-extrabold ${color}`}>{value}</strong>
      <span className="text-4xs text-gray-400 font-mono">{sub}</span>
    </div>
  );
}
