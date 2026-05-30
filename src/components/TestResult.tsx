import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClipboardCheck, Sparkles, Plus, Check, Award, Eye, Volume2, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { TestAttempt, SelectedWord, UserVocabulary } from "../types.js";
import { apiUrl, authFetch } from "../lib/api.js";

interface TestResultProps {
  token: string;
}

export default function TestResult({ token }: TestResultProps) {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
  const [vocabNotebook, setVocabNotebook] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeReviewTab, setActiveReviewTab] = useState<"words" | "questions">("words");
  
  const [saveLoading, setSaveLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadResultData() {
      try {
        const attemptRes = await authFetch(apiUrl(`/api/tests/attempts/${attemptId}`), token);
        if (!attemptRes.ok) throw new Error("Không thể tải kết quả bài thi.");
        const attemptData = await attemptRes.json();
        setAttempt(attemptData.attempt);

        const wordsRes = await authFetch(apiUrl(`/api/tests/attempts/${attemptId}/words`), token);
        if (wordsRes.ok) {
          const wordsData = await wordsRes.json();
          setSelectedWords(wordsData);
        }

        const vocabRes = await authFetch(apiUrl("/api/vocab"), token);
        if (vocabRes.ok) {
          const vocabData: UserVocabulary[] = await vocabRes.json();
          const vocabMap: Record<string, string> = {};
          vocabData.forEach(item => {
            vocabMap[item.word.toLowerCase()] = item.status;
          });
          setVocabNotebook(vocabMap);
        }

      } catch (err: any) {
        setError(err.message || "Không thể tải tổng kết bài thi");
      } finally {
        setLoading(false);
      }
    }

    loadResultData();
  }, [attemptId, token]);

  const handleSaveToVocab = async (word: string, context: string, partNum: number, targetStatus: "learning" | "mastered") => {
    setSaveLoading(word);
    try {
      const response = await authFetch(apiUrl("/api/vocab"), token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          sentenceContext: context,
          partNumber: partNum,
          status: targetStatus
        })
      });

      if (response.ok) {
        setVocabNotebook(prev => ({
          ...prev,
          [word.toLowerCase()]: targetStatus
        }));
      }
    } catch (err) {
      console.error("Save vocabulary error:", err);
    } finally {
      setSaveLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Đang tính điểm và tổng hợp kết quả...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm justify-center flex items-center">
          <AlertCircle className="w-5 h-5 shrink-0 mr-2" />
          <span>Lỗi khi tổng hợp kết quả: {error}</span>
        </div>
      </div>
    );
  }

  const totalQuestions = attempt.answers?.length || 0;
  const correctCount = attempt.answers?.filter(a => a.isCorrect).length || 0;
  const scorePercentile = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const listeningAnswers = attempt.answers?.filter(a => {
    const partNum = a.question?.testPart?.partNumber || 1;
    return partNum >= 1 && partNum <= 4;
  }) || [];

  const readingAnswers = attempt.answers?.filter(a => {
    const partNum = a.question?.testPart?.partNumber || 5;
    return partNum >= 5 && partNum <= 7;
  }) || [];

  const countCorrect = (arr: typeof attempt.answers) => arr?.filter(x => x.isCorrect).length || 0;

  return (
    <div id="test-result-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-lg">
          <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-2xs rounded-full font-bold font-mono uppercase tracking-widest">
            🏁 Hoàn thành Bài thi
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
            Bảng Điểm
          </h2>
          <p className="text-sm text-gray-500 leading-normal">
            Chúc mừng! Điểm số của bạn được tính dựa trên kết quả phần Nghe và phần Đọc theo thang điểm TOEIC chuẩn.
          </p>

          <div className="mt-4 flex items-center space-x-4">
            <button
              onClick={() => navigate("/history")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Về Thư viện</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-6 shrink-0 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
          <div className="text-center space-y-1">
            <span className="text-3xs text-gray-400 uppercase tracking-widest font-bold block">
              ĐIỂM TOEIC ƯỚC TÍNH
            </span>
            <span className="text-5xl font-sans font-extrabold text-blue-600 tracking-tight block">
              {attempt.score}
            </span>
            <span className="text-3xs text-gray-400 font-mono block uppercase">
              TRÊN TỔNG 990 ĐIỂM
            </span>
          </div>

          <div className="h-16 w-px bg-gray-200"></div>

          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-4xs text-gray-400 uppercase font-mono block">
                🎧 PHẦN NGHE
              </span>
              <span className="text-xs text-gray-800 font-bold block">
                {countCorrect(listeningAnswers)} / {listeningAnswers.length} đúng
              </span>
              <div className="w-24 bg-gray-200 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${listeningAnswers.length > 0 ? (countCorrect(listeningAnswers) / listeningAnswers.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-4xs text-gray-400 uppercase font-mono block">
                📖 PHẦN ĐỌC
              </span>
              <span className="text-xs text-gray-800 font-bold block">
                {countCorrect(readingAnswers)} / {readingAnswers.length} đúng
              </span>
              <div className="w-24 bg-gray-200 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full"
                  style={{ width: `${readingAnswers.length > 0 ? (countCorrect(readingAnswers) / readingAnswers.length) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 p-2 rounded-xl flex space-x-1">
            <button
              onClick={() => setActiveReviewTab("words")}
              className={`flex-1 py-3 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                activeReviewTab === "words"
                  ? "bg-slate-900 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              📖 Từ vựng đã chọn ({selectedWords.length})
            </button>
            <button
              onClick={() => setActiveReviewTab("questions")}
              className={`flex-1 py-3 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                activeReviewTab === "questions"
                  ? "bg-slate-900 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              📝 Xem lại Đáp án & Bản ghi
            </button>
          </div>

          {activeReviewTab === "words" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl text-2xs text-slate-800">
                ⭐ <strong>Hệ thống Bôi chọn:</strong> Tất cả từ vựng bạn đã bôi chọn trong Part 5–7 được tổng hợp tại đây kèm ngữ cảnh. Thêm vào sổ từ vựng bên dưới để ôn tập.
              </div>

              {selectedWords.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                  <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">Không có từ vựng nào được chọn trong lần thi này.</p>
                  <p className="text-4xs text-gray-400 uppercase tracking-widest font-mono mt-1">
                    GỢI Ý: Lần sau, hãy nhấn vào các từ khó trong Part 5, 6 hoặc 7 để lưu lại!
                  </p>
                </div>
              ) : (
                <div className="space-y-4" id="selected-words-review-list">
                  {selectedWords.map((wordObj) => {
                    const wordLower = wordObj.word.toLowerCase();
                    const currentStatus = vocabNotebook[wordLower];
                    const isSaved = !!currentStatus;

                    return (
                      <div
                        key={wordObj.id}
                        className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-base font-bold text-gray-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shadow-3xs">
                              {wordObj.word}
                            </span>
                            <span className="px-2 py-0.5 rounded text-blue-700 text-4xs font-bold font-mono tracking-wider bg-blue-50 border border-blue-100/30">
                              PART {wordObj.partNumber} • C{wordObj.question?.questionNumber || "?"}
                            </span>
                          </div>

                          <div className="p-2.5 bg-gray-50 rounded-lg text-xs border border-gray-100 italic flex space-x-2 text-gray-600">
                            <span className="text-blue-400 shrink-0 font-mono uppercase text-4xs select-none">NGỮ CẢNH:</span>
                            <p className="leading-relaxed">
                              {wordObj.sentenceContext || "Từ trong đoạn văn."}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {isSaved ? (
                            <div className="flex items-center space-x-1 text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg text-2xs font-semibold">
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span className="capitalize">Sổ từ: {currentStatus === "learning" ? "Đang học" : currentStatus === "mastered" ? "Đã thuộc" : currentStatus}</span>
                            </div>
                          ) : (
                            <div className="flex space-x-1">
                              <button
                                disabled={saveLoading === wordObj.word}
                                onClick={() => handleSaveToVocab(wordObj.word, wordObj.sentenceContext, wordObj.partNumber, "learning")}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-2xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                {saveLoading === wordObj.word ? "..." : "+ Đang học"}
                              </button>
                              <button
                                disabled={saveLoading === wordObj.word}
                                onClick={() => handleSaveToVocab(wordObj.word, wordObj.sentenceContext, wordObj.partNumber, "mastered")}
                                className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-2xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                {saveLoading === wordObj.word ? "..." : "✓ Đã thuộc"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeReviewTab === "questions" && (
            <div className="space-y-6" id="test-questions-review-list">
              {attempt.answers?.map((ans, index) => {
                const question = ans.question;
                if (!question) return null;
                const partNum = question.testPart?.partNumber || 1;
                const isListening = partNum >= 1 && partNum <= 4;

                return (
                  <div
                    key={ans.id}
                    className={`bg-white border rounded-2xl p-6 shadow-xs space-y-4 transition-all ${
                      ans.isCorrect
                        ? "border-green-100 hover:border-green-300"
                        : "border-rose-100 hover:border-rose-300"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded text-4xs font-bold font-mono uppercase tracking-widest ${
                          isListening ? "bg-blue-50 text-blue-700 font-bold border border-blue-100/30" : "bg-teal-50 text-teal-800"
                        }`}>
                          {isListening ? "🎧 Phần Nghe" : "📖 Phần Đọc"} {partNum}
                        </span>
                        <span className="text-2xs text-gray-400 font-mono">
                          Câu {index + 1}
                        </span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold ${
                        ans.isCorrect
                          ? "bg-green-100 text-green-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {ans.isCorrect ? "ĐÚNG" : `SAI • Đã chọn: ${ans.selectedOption || "Không"}`}
                      </span>
                    </div>

                    {question.passage && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-3xs font-mono text-gray-400 block mb-1">Đoạn văn Tham khảo:</span>
                        <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed font-sans">
                          {question.passage}
                        </p>
                      </div>
                    )}

                    {isListening && question.transcript && (
                      <div className="p-4 bg-blue-50/25 border border-blue-100/35 rounded-xl space-y-2">
                        <span className="text-3xs font-mono text-blue-700 uppercase tracking-widest font-bold flex items-center space-x-1">
                          <Volume2 className="w-3 h-3 text-blue-500" />
                          <span>Bản ghi Âm thanh / Hội thoại:</span>
                        </span>
                        
                        <div className="text-xs font-mono leading-relaxed text-gray-700 whitespace-pre-line">
                          {question.transcript.split("\n").map((line, lIdx) => {
                            const isAnswerLine = line.toLowerCase().includes(question.options.find(o => o.letter === question.correctAnswer)?.text.toLowerCase() || "") || line.toLowerCase().includes("narrator statement " + question.correctAnswer.toLowerCase());
                            return (
                              <p
                                key={lIdx}
                                className={`py-0.5 px-1 rounded transition-colors ${
                                  isAnswerLine
                                    ? "bg-amber-100 font-bold text-gray-900 border border-amber-250/50 shadow-3xs"
                                    : ""
                                }`}
                              >
                                {line}
                              </p>
                            );
                          })}
                        </div>
                        {question.correctAnswer && (
                          <div className="text-4xs text-amber-900 font-bold tracking-widest uppercase mt-2">
                            ⭐ DÒNG ĐƯỢC TÔ SÁNG LÀ ĐÁP ÁN {question.correctAnswer}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-4xs text-gray-400 uppercase font-mono block">Nội dung câu hỏi:</span>
                      <p className="text-sm font-semibold text-gray-900">
                        {question.questionText}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {question.options.map((opt) => {
                        const isCorrectKey = opt.letter.toUpperCase() === question.correctAnswer.toUpperCase();
                        const isUserSelection = opt.letter.toUpperCase() === ans.selectedOption.toUpperCase();

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
                              isCorrectKey
                                ? "bg-green-50 border-green-200 text-green-950 font-bold"
                                : isUserSelection
                                ? "bg-rose-50 border-rose-200 text-rose-950 font-medium"
                                : "bg-white border-gray-150 text-gray-600"
                            }`}
                          >
                            <span className={`h-5 w-5 rounded-full flex items-center justify-center text-3xs font-bold shrink-0 ${
                              isCorrectKey
                                ? "bg-green-600 text-white"
                                : isUserSelection
                                ? "bg-rose-600 text-white"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {opt.letter}
                            </span>
                            <span className="truncate leading-none">{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold tracking-widest uppercase font-mono text-blue-300">
              📊 Tổng quan Kết quả
            </h3>
            
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center text-gray-300">
                <span>Tỷ lệ đúng:</span>
                <strong className="text-white">{scorePercentile}%</strong>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span>Tổng số câu:</span>
                <strong className="text-white">{totalQuestions} câu hỏi</strong>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span>Số câu đúng:</span>
                <strong className="text-emerald-400 font-bold">{correctCount} câu</strong>
              </div>
            </div>

            <div className="h-px bg-slate-800 my-4"></div>

            <p className="text-3xs text-slate-300 leading-relaxed font-sans italic">
              "Ôn tập thường xuyên các từ vựng chưa quen giúp củng cố trí nhớ. Thêm từ vào sổ từ vựng để ôn tập hiệu quả hơn."
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider">
              Muốn thi lại?
            </h4>
            <p className="text-2xs text-gray-500 leading-relaxed">
              Bạn có thể làm lại bài thi để cải thiện điểm số. Tất cả từ vựng đã thêm vẫn được lưu trong sổ từ vựng!
            </p>
            <button
              onClick={() => navigate("/tests")}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              Làm lại Bài thi
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
