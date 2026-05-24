import React, { useState, useEffect } from "react";
import { ClipboardCheck, Sparkles, Plus, Check, Award, Eye, Volume2, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { TestAttempt, SelectedWord, UserVocabulary } from "../types.js";

interface TestResultProps {
  token: string;
  attemptId: string;
  onRestart: () => void;
}

export default function TestResult({ token, attemptId, onRestart }: TestResultProps) {
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
  const [vocabNotebook, setVocabNotebook] = useState<Record<string, string>>({}); // Maps word -> status (saved/learning/etc)
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeReviewTab, setActiveReviewTab] = useState<"words" | "questions">("words");
  
  const [saveLoading, setSaveLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadResultData() {
      try {
        // 1. Load finished test attempt with question correctness states
        const attemptRes = await fetch(`/api/tests/finish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ attemptId })
        });
        if (!attemptRes.ok) throw new Error("Failed to load finished attempt.");
        const attemptData = await attemptRes.json();
        setAttempt(attemptData.attempt || attemptData);

        // 2. Fetch words selected DURING this specific attempt
        const wordsRes = await fetch(`/api/tests/attempts/${attemptId}/words`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (wordsRes.ok) {
          const wordsData = await wordsRes.json();
          setSelectedWords(wordsData);
        }

        // 3. Load user's current vocabulary notebook to match which selected words are already saved
        const vocabRes = await fetch("/api/vocab", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (vocabRes.ok) {
          const vocabData: UserVocabulary[] = await vocabRes.json();
          const vocabMap: Record<string, string> = {};
          vocabData.forEach(item => {
            vocabMap[item.word.toLowerCase()] = item.status;
          });
          setVocabNotebook(vocabMap);
        }

      } catch (err: any) {
        setError(err.message || "Failed to load exam summaries");
      } finally {
        setLoading(false);
      }
    }

    loadResultData();
  }, [attemptId, token]);

  // Save selected word to vocab notebook
  const handleSaveToVocab = async (word: string, context: string, partNum: number, targetStatus: "learning" | "mastered") => {
    setSaveLoading(word);
    try {
      const response = await fetch("/api/vocab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
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
        <p className="text-gray-500 font-medium">Computing performance percentile scores & capturing stats...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm justify-center flex items-center">
          <AlertCircle className="w-5 h-5 shrink-0 mr-2" />
          <span>Error compiling exam metrics: {error}</span>
        </div>
      </div>
    );
  }

  // Aggregate stats
  const totalQuestions = attempt.answers?.length || 0;
  const correctCount = attempt.answers?.filter(a => a.isCorrect).length || 0;
  const scorePercentile = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Split answered questions by listening vs reading for segmented details
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
      {/* Top Banner overall score */}
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-lg">
          <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-2xs rounded-full font-bold font-mono uppercase tracking-widest">
            🏁 Attempt Completed Successfully
          </span>
          <h2 className="text-2xl font-serif md:text-3xl font-bold text-gray-900 leading-tight">
            Diagnostic Score Card
          </h2>
          <p className="text-sm text-gray-500 leading-normal">
            Great efforts! Your diagnostic baseline represents standard TOEIC equivalent scores computed dynamically from Listening and Reading performance indicators.
          </p>

          <div className="mt-4 flex items-center space-x-4">
            <button
               onClick={onRestart}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Back to Library</span>
            </button>
          </div>
        </div>

        {/* Dynamic circular score showcase */}
        <div className="flex items-center space-x-6 shrink-0 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
          <div className="text-center space-y-1">
            <span className="text-3xs text-gray-400 uppercase tracking-widest font-bold block">
              TOEIC ESTIMATE
            </span>
            <span className="text-5xl font-sans font-extrabold text-blue-600 tracking-tight block">
              {attempt.score}
            </span>
            <span className="text-3xs text-gray-400 font-mono block uppercase">
              OUT OF 990 max
            </span>
          </div>

          <div className="h-16 w-px bg-gray-200"></div>

          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-4xs text-gray-400 uppercase font-mono block">
                🎧 LISTENING SECTION
              </span>
              <span className="text-xs text-gray-800 font-bold block">
                {countCorrect(listeningAnswers)} / {listeningAnswers.length} correct
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
                📖 READING SECTION
              </span>
              <span className="text-xs text-gray-800 font-bold block">
                {countCorrect(readingAnswers)} / {readingAnswers.length} correct
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

      {/* Main post-exam work area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* REVIEW TABS SECTION */}
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
              📖 Words selected in this test ({selectedWords.length})
            </button>
            <button
              onClick={() => setActiveReviewTab("questions")}
              className={`flex-1 py-3 text-xs font-bold rounded-lg transition-colors cursor-pointer text-center ${
                activeReviewTab === "questions"
                  ? "bg-slate-900 text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              📝 Review Answers & Spoken Audiotext
            </button>
          </div>

          {/* TAB 1: ACTIVE SELECT WORDS LOG */}
          {activeReviewTab === "words" && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-xl text-2xs text-slate-800">
                ⭐ <strong>Special Highlight System:</strong> All words highlighted by clicking during parts 5–7 are compiled here with original visual query contexts. Add them below to organize memory flags.
              </div>

              {selectedWords.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                  <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 font-medium">No words were selected during this session.</p>
                  <p className="text-4xs text-gray-400 uppercase tracking-widest font-mono mt-1">
                    HINT: Nex time, click on tough words in Part 5, 6, or 7 to capture them here!
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
                              PART {wordObj.partNumber} • Q{wordObj.question?.questionNumber || "?"}
                            </span>
                          </div>

                          <div className="p-2.5 bg-gray-50 rounded-lg text-xs border border-gray-100 italic flex space-x-2 text-gray-600">
                            <span className="text-blue-400 shrink-0 font-mono uppercase text-4xs select-none">CONTEXT:</span>
                            <p className="leading-relaxed">
                              {/* Bold targeted word key */}
                              {wordObj.sentenceContext || "Noun in visual block."}
                            </p>
                          </div>
                        </div>

                        {/* Flashcard style quick-add buttons */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {isSaved ? (
                            <div className="flex items-center space-x-1 text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg text-2xs font-semibold">
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span className="capitalize">Notebook: {currentStatus}</span>
                            </div>
                          ) : (
                            <div className="flex space-x-1">
                              <button
                                disabled={saveLoading === wordObj.word}
                                onClick={() => handleSaveToVocab(wordObj.word, wordObj.sentenceContext, wordObj.partNumber, "learning")}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-2xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                {saveLoading === wordObj.word ? "..." : "+ Learning"}
                              </button>
                              <button
                                disabled={saveLoading === wordObj.word}
                                onClick={() => handleSaveToVocab(wordObj.word, wordObj.sentenceContext, wordObj.partNumber, "mastered")}
                                className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-2xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                {saveLoading === wordObj.word ? "..." : "✓ Mastered"}
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

          {/* TAB 2: DETAILED QUESTION BY QUESTION ANSWERS & TRANSCRIPTS */}
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
                    {/* Badge and Part info */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded text-4xs font-bold font-mono uppercase tracking-widest ${
                          isListening ? "bg-blue-50 text-blue-700 font-bold border border-blue-100/30" : "bg-teal-50 text-teal-800"
                        }`}>
                          {isListening ? "🎧 Listening Part" : "📖 Reading Part"} {partNum}
                        </span>
                        <span className="text-2xs text-gray-400 font-mono">
                          Question {index + 1}
                        </span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-2xs font-bold ${
                        ans.isCorrect
                          ? "bg-green-100 text-green-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        {ans.isCorrect ? "CORRECT" : `INCORRECT • Selected: ${ans.selectedOption || "None"}`}
                      </span>
                    </div>

                    {/* Passage representation if reading */}
                    {question.passage && (
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="text-3xs font-mono text-gray-400 block mb-1">Passage Reference:</span>
                        <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed font-sans">
                          {question.passage}
                        </p>
                      </div>
                    )}

                    {/* Transcript Highlight for PARTS 1–4 */}
                    {isListening && question.transcript && (
                      <div className="p-4 bg-blue-50/25 border border-blue-100/35 rounded-xl space-y-2">
                        <span className="text-3xs font-mono text-blue-700 uppercase tracking-widest font-bold flex items-center space-x-1">
                          <Volume2 className="w-3 h-3 text-blue-500" />
                          <span>Spoken Audio Script / Conversation:</span>
                        </span>
                        
                        {/* Highlights relevant clues inside the transcript */}
                        <div className="text-xs font-mono leading-relaxed text-gray-700 whitespace-pre-line">
                          {/* Premium feature: dynamic clue highlight */}
                          {question.transcript.split("\n").map((line, lIdx) => {
                            // Find relevant answer area for photograph / statement
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
                            ⭐ HIGHLIGHTED LINE DETERMINES OPTION {question.correctAnswer}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Question prompt or details */}
                    <div className="space-y-1">
                      <span className="text-4xs text-gray-400 uppercase font-mono block">Question Prompt text:</span>
                      <p className="text-sm font-semibold text-gray-900">
                        {question.questionText}
                      </p>
                    </div>

                    {/* Show Options letter codes */}
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

        {/* STUDY TIP AND ACTION TIMELINE SIDEBAR */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold tracking-widest uppercase font-mono text-blue-300">
              📊 Performance Overview
            </h3>
            
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between items-center text-gray-300">
                <span>Accurate score rate:</span>
                <strong className="text-white">{scorePercentile}%</strong>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span>Total Items:</span>
                <strong className="text-white">{totalQuestions} questions</strong>
              </div>
              <div className="flex justify-between items-center text-gray-300">
                <span>Correct items count:</span>
                <strong className="text-emerald-400 font-bold">{correctCount} keys matched</strong>
              </div>
            </div>

            <div className="h-px bg-slate-800 my-4"></div>

            <p className="text-3xs text-slate-300 leading-relaxed font-sans italic">
              "Continuous reinforcement of unfamiliar words helps lock short-term visual memories. Add items from the list to your workbook to study vocab."
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-3xs space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase font-mono tracking-wider">
              Need another attempt?
            </h4>
            <p className="text-2xs text-gray-500 leading-relaxed">
              You can instantly reset this diagnostical template to try beat your previous score. All vocabularies added remain saved under your notebooks!
            </p>
            <button
              onClick={onRestart}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
            >
              Reset Exam Session
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
