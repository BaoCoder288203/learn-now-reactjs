import React, { useState, useEffect } from "react";
import { Sparkles, BarChart2, FolderPlus, UploadCloud, CheckCircle, XCircle, Edit, Trash, Plus, Table, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { Test, Question, Option, TestAttempt } from "../types.js";

interface AdminDashboardProps {
  token: string;
}

export default function AdminDashboard({ token }: AdminDashboardProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState<{ summary: any; attempts: any[] } | null>(null);
  
  const [activeTab, setActiveTab] = useState<"manage" | "stats">("manage");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Test states
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [manualCreating, setManualCreating] = useState(false);

  // AI OCR Import states
  const [selectedTestId, setSelectedTestId] = useState("");
  const [ocrText, setOcrText] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [importing, setImporting] = useState(false);

  // Editing questions states
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editQText, setEditQText] = useState("");
  const [editQPassage, setEditQPassage] = useState("");
  const [editQTranscript, setEditQTranscript] = useState("");
  const [editQCorrect, setEditQCorrect] = useState("A");
  const [editQOptions, setEditQOptions] = useState<{ letter: string; text: string }[]>([]);
  const [savingQuestion, setSavingQuestion] = useState(false);

  // Selected test list expanded
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [expandedTestData, setExpandedTestData] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch tests
      const testsRes = await fetch("/api/tests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!testsRes.ok) throw new Error("Failed to load test lists.");
      const testsData = await testsRes.json();
      setTests(testsData);

      // 2. Fetch stats
      const statsRes = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sync admin datasets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Load question details for expanding test details
  const handleExpandTest = async (testId: string) => {
    if (expandedTestId === testId) {
      setExpandedTestId(null);
      setExpandedTestData(null);
      return;
    }

    try {
      const res = await fetch(`/api/tests/${testId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExpandedTestData(data);
        setExpandedTestId(testId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Publish
  const handleTogglePublish = async (testId: string, currentPublished: boolean) => {
    try {
      const response = await fetch(`/api/admin/tests/${testId}/publish`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ published: !currentPublished })
      });

      if (!response.ok) throw new Error("Could not toggle publish state.");
      
      setTests(prev => prev.map(t => t.id === testId ? { ...t, published: !currentPublished } : t));
      setSuccessMsg(`Test state updated successfully.`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to toggle state.");
    }
  };

  // Create test manually helper
  const handleCreateTestManually = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setManualCreating(true);
    try {
      const response = await fetch("/api/admin/tests/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim()
        })
      });

      if (!response.ok) throw new Error("Failed to create test skeleton.");
      
      setNewTitle("");
      setNewDesc("");
      loadData();
      setSuccessMsg("Test skeleton and Parts 1-7 drafts generated. Ready for import!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setManualCreating(false);
    }
  };

  // Start question editor modal
  const handleStartEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setEditQText(q.questionText);
    setEditQPassage(q.passage || "");
    setEditQTranscript(q.transcript || "");
    setEditQCorrect(q.correctAnswer);
    setEditQOptions(q.options.map(o => ({ letter: o.letter, text: o.text })));
  };

  // Save edited question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    setSavingQuestion(true);
    try {
      const response = await fetch(`/api/admin/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          questionText: editQText,
          passage: editQPassage || null,
          transcript: editQTranscript || null,
          correctAnswer: editQCorrect,
          options: editQOptions
        })
      });

      if (!response.ok) throw new Error("Failed to edit question.");

      setEditingQuestion(null);
      
      // Reload expanded test details to reflect edits
      if (expandedTestId) {
        const res = await fetch(`/api/tests/${expandedTestId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setExpandedTestData(data);
        }
      }

      setSuccessMsg("Question edits applied successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update question.");
    } finally {
      setSavingQuestion(false);
    }
  };

  // AI OCR import triggers
  const handleAiOcrImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestId) {
      alert("Please select a target test to import these questions into.");
      return;
    }
    if (!ocrText && !imageBase64) {
      alert("Please provide raw scan text or select/click a mock image asset below.");
      return;
    }

    setImporting(true);
    setSuccessMsg("");
    try {
      const response = await fetch("/api/admin/tests/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          testId: selectedTestId,
          ocrText,
          imageBase64: imageBase64 || undefined,
          mimeType: imageBase64 ? "image/png" : undefined
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "AI Import parser failed.");
      }

      setSuccessMsg(`AI Parsing Completed! Loaded Part ${data.partNumber} (${data.questionsCount} questions) successfully into database.`);
      setOcrText("");
      setImageBase64("");
      loadData();
      
      // Auto-expand loaded test
      handleExpandTest(selectedTestId);
    } catch (err: any) {
      alert(err.message || "Import operation failed.");
    } finally {
      setImporting(false);
    }
  };

  // Helper template fillers
  const handleLoadSampleOcr = (partNum: number) => {
    if (partNum === 5) {
      setOcrText(`
[TOEIC EXAMINATION SCAN RAW COMPONENT]
PART 5: INCOMPLETE SENTENCES

Question 101.
Mr. Henderson was selected to lead the regional merger committee because of ________ outstanding administrative aptitude in past operations.
(A) he
(B) him
(C) his
(D) himself
Correct Answer: C

Question 102.
The contracting firm agreed to supply the steel bars ________ the deadline originally authorized by key project engineers.
(A) before
(B) until
(C) since
(D) among
Correct Answer: A
      `);
    } else if (partNum === 6) {
      setOcrText(`
[OCR EXAM MANIFEST PART 6 TEXT ENHANCEMENT]
TOEIC Part Number: 6

Passage Content:
Attention Warehouse Personnel,
We will upgrade physical safety grids in all loading yards starting tomorrow. These barriers will ________ accidents during nightly shipping, creating safer layouts for forklift handlers.

Question 151:
(A) reduce
(B) reducing
(C) reduced
(D) reduces
Correct Answer: A
      `);
    }
  };

  return (
    <div id="admin-dashboard-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Title Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-150">
        <div>
          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-3xs font-bold uppercase font-mono rounded tracking-widest block w-fit mb-1 border border-blue-100/30">
            Portal Director Console
          </span>
          <h1 className="text-2xl font-serif font-extrabold text-gray-900 tracking-tight sm:text-3xl">
            Powerhouse Administrator Suite
          </h1>
          <p className="text-sm text-gray-500">
            Control test publication parameters, inspect student statistics, or leverage Gemini AI to compile structured questions from raw OCR logs or PDFs.
          </p>
        </div>

        {/* Refresh operations button */}
        <button
          onClick={loadData}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
          title="Sync exam database"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs font-semibold">Sync Data</span>
        </button>
      </div>

      {successMsg && (
        <div id="admin-success-banner" className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl text-xs font-semibold animate-pulse flex items-center">
          <CheckCircle className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TABS CONTROL ROUTE */}
      <div className="flex space-x-1 border-b border-gray-100 pb-px">
        <button
          onClick={() => setActiveTab("manage")}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all duration-150 cursor-pointer ${
            activeTab === "manage"
              ? "border-blue-600 text-blue-700 font-extrabold"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200"
          }`}
        >
          📚 Exams & Gemini OCR Parser
        </button>
        <button
          onClick={() => setActiveTab("stats")}
          className={`pb-3 text-sm font-bold border-b-2 px-4 transition-all duration-150 cursor-pointer ${
            activeTab === "stats"
              ? "border-blue-600 text-blue-700 font-extrabold"
              : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200"
          }`}
        >
          📈 Student Score Statistics
        </button>
      </div>

      {/* VIEW TABS ROUTER */}
      {activeTab === "manage" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMN 1 & 2: MANAGE & SKELETON */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Create Manual Test */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-widest flex items-center space-x-1.5">
                <FolderPlus className="w-4 h-4 text-blue-500" />
                <span>Create Test Skeleton</span>
              </h3>
              
              <form onSubmit={handleCreateTestManually} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-3xs font-mono uppercase text-gray-400 mb-1">
                      Exam Session Title
                    </label>
                    <input
                      id="input-new-test-title"
                      type="text"
                      required
                      placeholder="E.g. TOEIC Advanced Practice #4"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-mono uppercase text-gray-400 mb-1">
                      Brief Description
                    </label>
                    <input
                      id="input-new-test-desc"
                      type="text"
                      placeholder="E.g. Assesses Parts 1 to 7 grammar and context clues"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  id="create-manual-skeleton-btn"
                  type="submit"
                  disabled={manualCreating}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors"
                >
                  {manualCreating ? "Adding Templates..." : "Generate Empty Test skeleton (Part 1-7)"}
                </button>
              </form>
            </div>

            {/* Test List Catalog */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-widest block">
                Exam Database Catalog ({tests.length})
              </h3>

              {tests.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No exams registered. Add a skeleton above to get started.</p>
              ) : (
                <div className="space-y-4" id="admin-tests-list">
                  {tests.map((test) => {
                    const isExpanded = expandedTestId === test.id;
                    return (
                      <div
                        key={test.id}
                        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-gray-900 font-sans text-base">
                                {test.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-4xs font-bold font-mono ${
                                test.published
                                  ? "bg-green-50 text-green-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}>
                                {test.published ? "PUBLISHED" : "DRAFT"}
                              </span>
                            </div>
                            <p className="text-2xs text-gray-400 mt-1">{test.id}</p>
                          </div>

                          <div className="flex items-center space-x-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleTogglePublish(test.id, test.published)}
                              className={`flex-1 sm:flex-none px-3 py-1.5 text-3xs font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                                test.published
                                  ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                                  : "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                              }`}
                            >
                              {test.published ? "Unpublish Test" : "Publish Test"}
                            </button>
                            <button
                              onClick={() => handleExpandTest(test.id)}
                              className="px-3 py-1.5 text-3xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                            >
                              {isExpanded ? "Collapse Questions" : "Manage Questions"}
                            </button>
                          </div>
                        </div>

                        {/* Expandable question editor area */}
                        {isExpanded && expandedTestData && (
                          <div id="expanded-test-edit-view" className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                            <span className="block text-2xs font-bold text-gray-400 uppercase tracking-widest font-mono">
                              📚 Active Questions List (Select to edit content)
                            </span>

                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                              {expandedTestData.parts?.map((part: any) => {
                                return (
                                  <div key={part.id} className="space-y-2">
                                    <div className="p-2 bg-blue-50/40 text-blue-900 border border-blue-100/30 rounded-lg text-2xs font-bold">
                                      Part {part.partNumber} : {part.title} ({part.questions?.length || 0} questions)
                                    </div>

                                    {part.questions?.map((q: any) => {
                                      return (
                                        <div
                                          key={q.id}
                                          className="p-3.5 bg-white border border-gray-100 rounded-xl hover:border-blue-250 transition-colors flex items-center justify-between gap-4 text-xs"
                                        >
                                          <div className="space-y-1 block min-w-0">
                                            <span className="font-bold text-gray-800 block">
                                              Question {q.questionNumber}: {q.questionText}
                                            </span>
                                            {q.passage && (
                                              <span className="text-3xs text-gray-400 font-mono block truncate">
                                                📖 PASSAGE: {q.passage}
                                              </span>
                                            )}
                                            <span className="text-3xs font-mono text-emerald-600 block uppercase">
                                              Correct option: {q.correctAnswer}
                                            </span>
                                          </div>

                                          <button
                                            onClick={() => handleStartEditQuestion(q)}
                                            className="p-1 px-2.5 bg-gray-50 text-blue-600 hover:bg-blue-50 border border-gray-200 hover:border-blue-150 text-3xs font-semibold rounded-md cursor-pointer flex items-center space-x-1"
                                          >
                                            <Edit className="w-3 h-3" />
                                            <span>Edit Item</span>
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
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

          {/* COLUMN 3 SIDEBAR: GEMINI OCR TEST IMPORTER */}
          <div className="space-y-8">
            
            {/* AI OCR Importer Form */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="space-y-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-3xs font-bold font-mono uppercase tracking-wider border border-blue-100/30">
                  <Sparkles className="w-2.5 h-2.5 text-blue-600 mr-1 shrink-0" />
                  Gemini AI Parsing OCR
                </span>
                <h3 className="text-sm font-bold text-gray-900 uppercase font-mono tracking-widest">
                  AI OCR TOEIC Import
                </h3>
              </div>

              <p className="text-3xs text-gray-500 leading-relaxed font-sans">
                Paste raw OCR scraped text from a classroom scanner or PDF, then select a target exam. Gemini will extract structure, identify options/answers and build database rows.
              </p>

              <form onSubmit={handleAiOcrImport} className="space-y-4">
                <div>
                  <label className="block text-3xs font-mono uppercase text-gray-400 mb-1">
                    1. Target Test Skeleton mapping
                  </label>
                  <select
                    id="select-import-target-test"
                    value={selectedTestId}
                    onChange={(e) => setSelectedTestId(e.target.value)}
                    className="block w-full p-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Choose Exam --</option>
                    {tests.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-3xs font-mono uppercase text-gray-400">
                      2. Paste Raw OCR Text or load sample
                    </label>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => handleLoadSampleOcr(5)}
                        className="px-2 py-0.5 text-4xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 cursor-pointer font-bold border border-blue-100/30"
                      >
                        + Part 5 sample
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadSampleOcr(6)}
                        className="px-2 py-0.5 text-4xs bg-teal-50 text-teal-800 rounded hover:bg-teal-100 cursor-pointer font-bold border border-teal-100/30"
                      >
                        + Part 6 sample
                      </button>
                    </div>
                  </div>
                  <textarea
                    id="textarea-ocr-input"
                    rows={8}
                    required
                    placeholder="Paste unformatted OCR diagnostic logs..."
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    className="block w-full p-3 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  id="import-toeic-ocr-btn"
                  type="submit"
                  disabled={importing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>{importing ? "Analyzing Structure & Seeding..." : "Analyze & Import with Gemini AI"}</span>
                </button>
              </form>
            </div>

            {/* Editing Question Modal/Sub-editor */}
            {editingQuestion && (
              <div id="modal-question-editor" className="bg-amber-50/50 border border-amber-250 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in">
                <div className="flex justify-between items-center pb-2 border-b border-amber-250/50">
                  <span className="text-xs font-bold text-amber-900 uppercase font-mono flex items-center space-x-1">
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editing Question {editingQuestion.questionNumber}</span>
                  </span>
                  <button
                    onClick={() => setEditingQuestion(null)}
                    className="p-1 hover:bg-amber-100 rounded text-amber-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSaveQuestion} className="space-y-4">
                  {/* Passage reference context */}
                  <div>
                    <label className="block text-4xs font-mono uppercase text-gray-500 mb-1">
                      Passage Text (for Part 6/7)
                    </label>
                    <textarea
                      id="edit-q-passage"
                      rows={3}
                      value={editQPassage}
                      onChange={(e) => setEditQPassage(e.target.value)}
                      className="block w-full p-2 border border-amber-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      placeholder="Passage context block..."
                    />
                  </div>

                  {/* Transcript for listening */}
                  <div>
                    <label className="block text-4xs font-mono uppercase text-gray-500 mb-1">
                      Listening Audio Transcript (for Part 1-4)
                    </label>
                    <textarea
                      id="edit-q-transcript"
                      rows={3}
                      value={editQTranscript}
                      onChange={(e) => setEditQTranscript(e.target.value)}
                      className="block w-full p-2 border border-amber-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      placeholder="Narrative dialogue transcript..."
                    />
                  </div>

                  {/* Core prompt text */}
                  <div>
                    <label className="block text-4xs font-mono uppercase text-gray-500 mb-1">
                      Core Question Prompt / Statement text
                    </label>
                    <input
                      id="edit-q-text"
                      type="text"
                      required
                      value={editQText}
                      onChange={(e) => setEditQText(e.target.value)}
                      className="block w-full px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                  </div>

                  {/* Options editor */}
                  <div className="space-y-3">
                    <span className="block text-4xs font-mono uppercase text-gray-500">
                      Options keys & texts:
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {editQOptions.map((opt, oIdx) => (
                        <div key={opt.letter} className="flex items-center space-x-1.5 p-1 bg-white border border-amber-100 rounded-lg">
                          <span className="font-bold font-mono text-amber-900 w-4 block text-center uppercase">{opt.letter}</span>
                          <input
                            type="text"
                            required
                            value={opt.text}
                            onChange={(e) => {
                              const updatedOptions = [...editQOptions];
                              updatedOptions[oIdx].text = e.target.value;
                              setEditQOptions(updatedOptions);
                            }}
                            className="bg-transparent border-none p-1 text-xs w-full focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Correct Key Option dropdown */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="font-mono text-4xs uppercase tracking-wide text-gray-500">Correct Answer:</span>
                      <select
                        id="edit-q-correct-letter"
                        value={editQCorrect}
                        onChange={(e) => setEditQCorrect(e.target.value)}
                        className="p-1 rounded border border-gray-25 bg-white font-bold"
                      >
                        {["A", "B", "C", "D"].map(letter => (
                          <option key={letter} value={letter}>{letter}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      id="save-question-edit-btn"
                      type="submit"
                      disabled={savingQuestion}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      {savingQuestion ? "Applying..." : "Apply Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* STATS TAB SELECTION */
        <div className="space-y-8" id="admin-analytics-dashboard">
          
          {/* Summary metrics header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-150 p-6 rounded-2xl text-center shadow-3xs space-y-1">
              <span className="block text-3xs font-mono uppercase tracking-widest text-gray-400">Total Attempts Logged</span>
              <strong className="block text-4xl font-extrabold text-slate-900">{stats?.summary?.totalAttempts || 0}</strong>
              <span className="text-4xs text-gray-400 font-mono">FROM SYSTEM INCEPTION</span>
            </div>

            <div className="bg-white border border-gray-150 p-6 rounded-2xl text-center shadow-3xs space-y-1">
              <span className="block text-3xs font-mono uppercase tracking-widest text-gray-400">Attempts Completed</span>
              <strong className="block text-4xl font-extrabold text-emerald-600">{stats?.summary?.completedAttempts || 0}</strong>
              <span className="text-4xs text-gray-400 font-mono">SCORABLE DATA POINTS</span>
            </div>

            <div className="bg-white border border-gray-150 p-6 rounded-2xl text-center shadow-3xs space-y-1">
              <span className="block text-3xs font-mono uppercase tracking-widest text-gray-400">Class Average Score</span>
              <strong className="block text-4xl font-extrabold text-blue-600">{stats?.summary?.avgScore || 0} / 990</strong>
              <span className="text-4xs text-gray-400 font-mono">BASELINE LEVEL</span>
            </div>
          </div>

          {/* Tabular completions table */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider">
                Full Classroom Attempt Stream
              </h3>
              <span className="text-3xs text-gray-400 font-mono">SORTED RECENCY OVERALL</span>
            </div>

            {stats?.attempts && stats.attempts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-150 text-left text-xs text-gray-600" id="statistics-table">
                  <thead className="bg-gray-50 uppercase font-mono tracking-widest text-4xs text-gray-400">
                    <tr>
                      <th className="px-6 py-3.5">Learner</th>
                      <th className="px-6 py-3.5">Exam Target</th>
                      <th className="px-6 py-3.5">Phase</th>
                      <th className="px-6 py-3.5">Computed Score</th>
                      <th className="px-6 py-3.5">Session Timings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-sans">
                    {stats.attempts.map((att: any) => {
                      return (
                        <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="block font-semibold text-gray-950">{att.user?.name}</span>
                            <span className="text-3xs font-mono text-gray-400">{att.user?.email}</span>
                          </td>
                          <td className="px-6 py-4 truncate max-w-xs">
                            <span className="text-gray-800 font-medium">{att.test?.title}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-4xs font-bold uppercase font-mono ${
                              att.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800 animate-pulse"
                            }`}>
                              {att.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <strong className="text-sm font-semibold text-gray-950">
                              {att.status === "COMPLETED" ? att.score : "In-Progress"}
                            </strong>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-3xs font-mono text-gray-400">
                            <span className="block">Start: {new Date(att.startedAt).toLocaleString()}</span>
                            {att.completedAt && (
                              <span className="block text-green-600">Finish: {new Date(att.completedAt).toLocaleString()}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 p-4 text-gray-400 italic">
                No attempt statistics recorded yet in classroom tables.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
