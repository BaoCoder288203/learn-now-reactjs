import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckSquare, Sparkles, Volume2, HelpCircle, Eye, CornerDownRight } from "lucide-react";
import { Test, Question, TestPart, QuestionGroup } from "../types.js";
import { apiUrl, authFetch } from "../lib/api.js";

interface TestDoingProps {
  token: string;
}

export default function TestDoing({ token }: TestDoingProps) {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const partFocus = searchParams.get("part") ? Number(searchParams.get("part")) : null;
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [parts, setParts] = useState<TestPart[]>([]);
  
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  
  const [highlightedWords, setHighlightedWords] = useState<Record<string, Set<string>>>({});
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notifyText, setNotifyText] = useState("");

  useEffect(() => {
    if (!testId) return;

    const abortController = new AbortController();
    let cancelled = false;

    async function loadTestAndStartAttempt() {
      try {
        const testRes = await authFetch(apiUrl(`/api/tests/${testId}`), token, {
          signal: abortController.signal,
        });
        if (!testRes.ok) throw new Error("Không thể tải chi tiết bài thi.");
        const testData = await testRes.json();
        if (cancelled) return;

        let activeParts: TestPart[] = testData.parts || [];
        if (partFocus !== null) {
          activeParts = activeParts.filter((p) => p.partNumber === partFocus);
        }

        if (activeParts.length === 0) {
          throw new Error(`Bài thi này không có câu hỏi nào cho Part ${partFocus}.`);
        }

        const allQuestions: Question[] = [];
        activeParts.forEach((p) => {
          if (p.questionGroups?.length) {
            const sorted = [...p.questionGroups].sort((a, b) => a.groupOrder - b.groupOrder);
            for (const group of sorted) {
              const groupQs = (group.questions || [])
                .map((q) => ({
                  ...q,
                  passage: q.passage || group.passage,
                  transcript: q.transcript || group.transcript,
                }))
                .sort((a, b) => a.questionNumber - b.questionNumber);
              allQuestions.push(...groupQs);
            }
          } else if (p.questions?.length) {
            allQuestions.push(...[...p.questions].sort((a, b) => a.questionNumber - b.questionNumber));
          }
        });

        if (allQuestions.length === 0) {
          throw new Error("Bài thi này chưa có câu hỏi nào.");
        }

        if (cancelled) return;
        setTest(testData);
        setParts(activeParts);
        setQuestions(allQuestions);

        const attemptRes = await authFetch(apiUrl("/api/tests/attempts"), token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId }),
          signal: abortController.signal,
        });

        if (!attemptRes.ok) throw new Error("Không thể bắt đầu phiên thi.");
        const attemptData = await attemptRes.json();
        if (cancelled) return;

        const resolvedAttemptId = attemptData.attemptId as string;
        setAttemptId(resolvedAttemptId);

        const progressRes = await authFetch(
          apiUrl(`/api/tests/attempts/${resolvedAttemptId}`),
          token,
          { signal: abortController.signal }
        );
        if (progressRes.ok && !cancelled) {
          const progressData = await progressRes.json();
          const saved: Record<string, string> = {};
          progressData.attempt?.answers?.forEach((ans: { questionId: string; selectedOption: string }) => {
            saved[ans.questionId] = ans.selectedOption;
          });
          if (Object.keys(saved).length > 0) {
            setSelectedAnswers(saved);
          }
        }
      } catch (err: unknown) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setError(err instanceof Error ? err.message : "Không thể khởi tạo phiên thi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    setError("");
    setAttemptId(null);
    setSelectedAnswers({});
    loadTestAndStartAttempt();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [testId, token, partFocus]);

  const handleAnswerSelect = async (questionId: string, optionLetter: string) => {
    if (!attemptId) return;

    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionLetter }));

    try {
      await authFetch(apiUrl("/api/tests/answers"), token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId,
          selectedOption: optionLetter
        })
      });
    } catch (err) {
      console.error("Failed to sync answer with cloud db", err);
    }
  };

  const handleWordClick = async (questionId: string, word: string, sentenceText: string, partNumber: number) => {
    if (!attemptId) return;
    
    const cleanedWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"\n]/g, "").trim();
    if (!cleanedWord || cleanedWord.length <= 1) return;

    const currentHighlights = highlightedWords[questionId] ? new Set(highlightedWords[questionId]) : new Set<string>();
    
    if (currentHighlights.has(cleanedWord)) {
      setNotifyText(`"${cleanedWord}" đã có trong danh sách của bạn.`);
      setTimeout(() => setNotifyText(""), 1500);
      return;
    }

    currentHighlights.add(cleanedWord);
    setHighlightedWords(prev => ({
      ...prev,
      [questionId]: currentHighlights
    }));

    try {
      const response = await authFetch(apiUrl("/api/tests/select-word"), token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId,
          word: cleanedWord,
          sentenceContext: sentenceText,
          partNumber
        })
      });

      if (response.ok) {
        setNotifyText(`Đã chọn: "${cleanedWord}" được đánh dấu để ôn tập!`);
        setTimeout(() => setNotifyText(""), 2000);
      }
    } catch (err) {
      console.error("Select word sync error:", err);
    }
  };

  const handleFinish = async () => {
    if (!attemptId) return;
    
    const confirmSubmit = window.confirm("Bạn có chắc muốn kết thúc bài thi và xem điểm?");
    if (!confirmSubmit) return;

    setSubmitting(true);
    try {
      const response = await authFetch(apiUrl("/api/tests/finish"), token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId })
      });

      if (!response.ok) throw new Error("Không thể hoàn tất bài thi.");
      
      navigate(`/result/${attemptId}`, { replace: true });
    } catch (err: any) {
      setError(err.message || "Nộp bài thất bại.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Đang kết nối và chuẩn bị bài thi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl shadow-xs">
          <h4 className="font-bold text-lg">Không thể vào phòng thi</h4>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={() => navigate("/tests")}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 cursor-pointer"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;
  const activePart = parts.find(p => p.questions.some(q => q.id === currentQuestion.id));
  const partNum = activePart?.partNumber || 5;
  const isPartHighlightable = partNum >= 5 && partNum <= 7;
  const isPartTwo = partNum === 2;
  const shouldShowTranscript = !!currentQuestion.transcript && partNum !== 3 && partNum !== 4;

  const renderInteractiveText = (text: string, questionId: string) => {
    const rawWords = text.split(/\s+/);
    return (
      <div className="flex flex-wrap gap-x-1 gap-y-0.5 text-slate-800 leading-relaxed font-sans text-sm md:text-base">
        {rawWords.map((word, wIdx) => {
          const cleaned = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"\n]/g, "").trim();
          const isHighlighted = highlightedWords[questionId]?.has(cleaned);
          
          if (!isPartHighlightable) {
            return <span key={wIdx}>{word}</span>;
          }

          return (
            <span
              key={wIdx}
              onClick={() => handleWordClick(questionId, cleaned, text, partNum)}
              className={`px-1 rounded-sm transition-all duration-100 cursor-pointer ${
                isHighlighted
                  ? "bg-yellow-250 text-slate-905 border-b-2 border-yellow-400 font-medium font-sans shadow-2xs"
                  : "hover:bg-blue-50 hover:text-blue-900 border border-transparent"
              }`}
              title="Nhấn để đánh dấu từ vựng cần ôn"
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div id="active-exam-room" className="bg-gray-50/50 min-h-(screen-16)">
      {notifyText && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{notifyText}</span>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 py-3.5 px-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (window.confirm("Bỏ bài thi hiện tại? Các câu trả lời sẽ không được tính điểm.")) {
                  navigate("/tests");
                }
              }}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Thoát
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                {test?.title}
              </h2>
              {partFocus !== null && (
                <span className="text-2xs font-bold text-blue-600 font-mono">
                  LUYỆN TẬP: PART {partFocus}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-500 font-mono">
                TIẾN ĐỘ:{" "}
                <strong className="text-slate-900">
                  {Object.keys(selectedAnswers).length} / {totalQuestions}
                </strong>{" "}
                đã làm
              </span>
              <div className="w-32 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${(Object.keys(selectedAnswers).length / totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>

            <button
              id="finish-exam-trigger"
              onClick={handleFinish}
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors w-full sm:w-auto text-center"
            >
              {submitting ? "Đang chấm điểm..." : "Kết thúc & Chấm điểm"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-blue-600 text-white font-mono text-xs font-bold rounded uppercase tracking-wider">
                    Part {partNum}
                  </span>
                  <p className="text-xs text-gray-600 font-medium">
                    {activePart?.title}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg px-2.5 py-1 text-2xs text-gray-500 font-mono border border-gray-100">
                  Câu {currentIdx + 1} / {totalQuestions}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl mb-4">
                <p className="text-2xs text-slate-500 font-semibold uppercase font-mono tracking-widest mb-1">
                  Hướng dẫn:
                </p>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {activePart?.instructions || "Xem tài liệu và chọn đáp án đúng."}
                </p>
              </div>

              {isPartHighlightable ? (
                <div className="bg-yellow-50/50 border border-yellow-105 text-yellow-800 p-3 rounded-xl text-2xs flex items-center space-x-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                  <span>
                    <strong>Chế độ Bôi chọn:</strong> Nhấn vào bất kỳ từ vựng nào trong đoạn văn bên dưới để đánh dấu ôn tập sau bài thi!
                  </span>
                </div>
              ) : (
                <div className="bg-blue-50/50 border border-blue-150/50 text-blue-800 p-3 rounded-xl text-[10px] uppercase tracking-wider font-mono font-bold flex items-center space-x-2">
                  <Volume2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>PHẦN NGHE: KHÔNG THỂ CHỌN TỪ VỰNG TRONG PHẦN NÀY.</span>
                </div>
              )}
            </div>

            {!isPartHighlightable && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-widest bg-blue-50 text-blue-700 font-mono mb-4">
                  Phần Nghe
                </span>

                {currentQuestion.image ? (
                  <div className="mb-6 rounded-xl overflow-hidden max-w-sm border border-gray-25 shadow-xs mx-auto">
                    <img
                      src={currentQuestion.image}
                      alt="Hình ảnh câu hỏi"
                      className="w-full object-cover max-h-56"
                    />
                  </div>
                ) : null}

                {activePart?.audioUrl ? (
                  <div className="mb-4">
                    <audio
                      controls
                      className="w-full"
                      src={
                        activePart.audioUrl.startsWith("http")
                          ? activePart.audioUrl
                          : apiUrl(activePart.audioUrl)
                      }
                    >
                      Trình duyệt không hỗ trợ phát audio.
                    </audio>
                  </div>
                ) : (
                  <div className="py-4 px-6 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-800 block">Phần Nghe TOEIC</span>
                        <span className="text-3xs text-gray-500 font-mono uppercase tracking-widest block">
                          Transcript hiển thị bên dưới
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-2xs text-gray-500 italic mt-2">
                  * Trong môi trường thi thật, phần này sẽ được phát bằng âm thanh. Transcript hiển thị để hỗ trợ luyện tập.
                </p>
              </div>
            )}

            {isPartHighlightable && currentQuestion.passage && (
              <div className="bg-amber-50/20 border border-amber-100 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                  <span className="text-2xs font-bold text-amber-800 uppercase tracking-widest font-mono block">
                    📖 Đoạn văn Tham khảo
                  </span>
                  <span className="text-3xs text-amber-500 font-mono">NGỮ CẢNH PART {partNum}</span>
                </div>
                
                <div className="p-4 bg-white border border-amber-100/55 rounded-xl">
                  {currentQuestion.passage.split("\n").map((para, pIdx) => (
                    <div key={pIdx} className="mb-3 last:mb-0">
                      {renderInteractiveText(para, currentQuestion.id)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="space-y-4">
                <span className="text-2xs font-bold text-gray-400 uppercase tracking-widest font-mono block">
                  Nội dung câu hỏi:
                </span>
                
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  {isPartHighlightable ? (
                    renderInteractiveText(currentQuestion.questionText, currentQuestion.id)
                  ) : isPartTwo ? (
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-500 font-mono uppercase tracking-widest">
                        Part 2 - Listen and choose
                      </p>
                      <p className="text-3xs text-gray-400 mt-1">
                        Câu hỏi sẽ được phát qua audio, không hiển thị văn bản trong chế độ thi.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {currentQuestion.questionText}
                      </p>
                      {shouldShowTranscript && (
                        <div className="mt-4 p-3.5 bg-blue-50/20 border border-blue-100/40 rounded-xl space-y-1.5 text-xs text-blue-900 border-dashed">
                          <span className="font-bold font-mono tracking-widest text-[10px] text-blue-700 block uppercase">
                            🎙️ Hội thoại / Bản ghi Âm thanh
                          </span>
                          <p className="whitespace-pre-line leading-relaxed font-mono text-gray-700">
                            {currentQuestion.transcript}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-2xs font-bold text-gray-400 uppercase tracking-widest font-mono block">
                  Chọn đáp án:
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === opt.letter;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswerSelect(currentQuestion.id, opt.letter)}
                        className={`p-4 rounded-xl border text-left flex items-start space-x-3 cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? "bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/10"
                            : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                        } ${isPartTwo ? "justify-center" : ""}`}
                      >
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {opt.letter}
                        </span>
                        {!isPartTwo && (
                          <span className="text-sm text-gray-700 leading-normal font-medium pt-0.5">
                            {opt.text}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(prev => prev - 1)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer border ${
                  currentIdx === 0
                    ? "text-gray-300 border-gray-100 bg-gray-50"
                    : "text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Câu trước</span>
              </button>

              <span className="text-xs text-gray-400 font-mono uppercase tracking-widest font-semibold">
                Câu {currentIdx + 1} / {totalQuestions}
              </span>

              {currentIdx < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 bg-gray-900 border border-transparent hover:bg-gray-800 text-white cursor-pointer transition-colors"
                >
                  <span>Câu tiếp</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              ) : (
                <button
                  id="finish-exam-footer"
                  onClick={handleFinish}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors"
                >
                  <span>Nộp bài</span>
                  <CheckSquare className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
              <div className="pb-3 border-b border-gray-100 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-mono">
                    Bảng câu hỏi
                  </h3>
                  <p className="text-4xs text-gray-400 font-mono">CHUYỂN CÂU NHANH</p>
                </div>
                <span className="text-2xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded px-2 py-0.5 rounded font-mono">
                  {Object.keys(selectedAnswers).length} / {totalQuestions}
                </span>
              </div>

              <div className="space-y-3">
                {parts.map((part) => {
                  const partItems = part.questions
                    .map((q) => ({
                      q,
                      globalIdx: questions.findIndex((item) => item.id === q.id),
                    }))
                    .filter((item) => item.globalIdx >= 0);

                  if (!partItems.length) return null;

                  return (
                    <div key={`part-nav-${part.partNumber}`} className="space-y-1.5">
                      <div className="text-4xs font-mono uppercase tracking-wider text-gray-500">
                        Part {part.partNumber}
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {partItems.map(({ q, globalIdx }) => {
                          const isCurrent = globalIdx === currentIdx;
                          const isAnswered = !!selectedAnswers[q.id];

                          return (
                            <button
                              key={q.id}
                              onClick={() => setCurrentIdx(globalIdx)}
                              className={`h-8 w-full rounded-lg text-2xs font-bold font-mono border transition-all duration-200 cursor-pointer flex flex-col justify-center items-center ${
                                isCurrent
                                  ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-500/15"
                                  : isAnswered
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                              }`}
                              title={`Part ${part.partNumber} Câu ${globalIdx + 1}`}
                            >
                              <span>{globalIdx + 1}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-4xs font-mono uppercase text-gray-400 tracking-wider">
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  <span>Đang làm</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span>Đã trả lời</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-full bg-white border border-gray-200"></div>
                  <span>Chưa trả lời</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-lg space-y-3">
              <h4 className="text-xs font-bold tracking-widest uppercase font-mono text-blue-300 flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                <span>Mẹo Học tập</span>
              </h4>
              <p className="text-3xs text-slate-300 leading-relaxed font-sans font-medium">
                Đừng lo lắng nếu không biết hết từ vựng. Hãy bôi chọn các từ khó để ôn tập sau. Sau khi nộp bài, bạn sẽ nhận được bản ghi chi tiết và phân tích điểm số!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
