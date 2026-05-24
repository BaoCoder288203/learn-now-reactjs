import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckSquare, Sparkles, Volume2, HelpCircle, Eye, CornerDownRight } from "lucide-react";
import { Test, Question, TestPart } from "../types.js";

interface TestDoingProps {
  token: string;
  testId: string;
  partFocus: number | null; // If not null, filter test to this part only
  onFinishTest: (attemptId: string) => void;
  onCancel: () => void;
}

export default function TestDoing({ token, testId, partFocus, onFinishTest, onCancel }: TestDoingProps) {
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [parts, setParts] = useState<TestPart[]>([]);
  
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  
  // Hash maps of highlighted words per question to keep highlights persistent
  const [highlightedWords, setHighlightedWords] = useState<Record<string, Set<string>>>({});
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notifyText, setNotifyText] = useState("");

  useEffect(() => {
    async function loadTestAndStartAttempt() {
      try {
        // 1. Fetch test details
        const testRes = await fetch(`/api/tests/${testId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!testRes.ok) throw new Error("Failed to load test details.");
        const testData = await testRes.json();
        
        // Filter parts if there is partFocus
        let activeParts: TestPart[] = testData.parts || [];
        if (partFocus !== null) {
          activeParts = activeParts.filter(p => p.partNumber === partFocus);
        }

        if (activeParts.length === 0) {
          throw new Error(`This test does not contain any questions for Part ${partFocus}.`);
        }

        setTest(testData);
        setParts(activeParts);

        // Gather all questions in order
        const allQuestions: Question[] = [];
        activeParts.forEach(p => {
          if (p.questions) {
            allQuestions.push(...p.questions);
          }
        });

        if (allQuestions.length === 0) {
          throw new Error("This exam does not contain any active questions yet.");
        }

        setQuestions(allQuestions);

        // 2. Start attempt
        const attemptRes = await fetch("/api/tests/attempts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ testId })
        });

        if (!attemptRes.ok) throw new Error("Failed to start exam session.");
        const attemptData = await attemptRes.json();
        setAttemptId(attemptData.attemptId);

      } catch (err: any) {
        setError(err.message || "Could not instantiate test session.");
      } finally {
        setLoading(false);
      }
    }

    loadTestAndStartAttempt();
  }, [testId, token, partFocus]);

  // Handle option select
  const handleAnswerSelect = async (questionId: string, optionLetter: string) => {
    if (!attemptId) return;

    // optimistic UI change
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionLetter }));

    try {
      await fetch("/api/tests/answers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
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

  // Handle visual highlighting of any word DURING Part 5-7 tests
  const handleWordClick = async (questionId: string, word: string, sentenceText: string, partNumber: number) => {
    if (!attemptId) return;
    
    const cleanedWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"\n]/g, "").trim();
    if (!cleanedWord || cleanedWord.length <= 1) return;

    // Toggle/Add to local state
    const currentHighlights = highlightedWords[questionId] ? new Set(highlightedWords[questionId]) : new Set<string>();
    
    // If already saved, don't resend
    if (currentHighlights.has(cleanedWord)) {
      setNotifyText(`"${cleanedWord}" is already flagged in your list.`);
      setTimeout(() => setNotifyText(""), 1500);
      return;
    }

    currentHighlights.add(cleanedWord);
    setHighlightedWords(prev => ({
      ...prev,
      [questionId]: currentHighlights
    }));

    // Trigger API save
    try {
      const response = await fetch("/api/tests/select-word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          attemptId,
          questionId,
          word: cleanedWord,
          sentenceContext: sentenceText,
          partNumber
        })
      });

      if (response.ok) {
        setNotifyText(`Selected: "${cleanedWord}" tagged for post-exam study!`);
        setTimeout(() => setNotifyText(""), 2000);
      }
    } catch (err) {
      console.error("Select word sync error:", err);
    }
  };

  const handleFinish = async () => {
    if (!attemptId) return;
    
    const confirmSubmit = window.confirm("Are you sure you want to finish the exam and view your scores?");
    if (!confirmSubmit) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/tests/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ attemptId })
      });

      if (!response.ok) throw new Error("Failed to finalize attempt.");
      
      onFinishTest(attemptId);
    } catch (err: any) {
      setError(err.message || "Failed to submit exam.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium">Securing session connection & drafting templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl shadow-xs">
          <h4 className="font-bold text-lg">Exam Ingress Blocked</h4>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;
  // Determine parent Part details
  const activePart = parts.find(p => p.questions.some(q => q.id === currentQuestion.id));
  const partNum = activePart?.partNumber || 5;
  const isPartHighlightable = partNum >= 5 && partNum <= 7;

  // Helper renderer to tokenize sentence with word splitters
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
              title="Click to tag as unfamiliar vocabulary word"
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
      {/* Dynamic persistent floating study feedback toast banner */}
      {notifyText && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{notifyText}</span>
        </div>
      )}

      {/* Exam control header dashboard */}
      <div className="bg-white border-b border-gray-200 py-3.5 px-4 sticky top-16 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (window.confirm("Abandon current test attempt? Your answers will not be scored.")) {
                  onCancel();
                }
              }}
              className="px-3 py-1.5 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Quit Study
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                {test?.title}
              </h2>
              {partFocus !== null && (
                <span className="text-2xs font-bold text-blue-600 font-mono">
                  DRILL SESSION: PART {partFocus}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            {/* Progress indicators wrapper */}
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-500 font-mono">
                PROGRESS:{" "}
                <strong className="text-slate-900">
                  {Object.keys(selectedAnswers).length} / {totalQuestions}
                </strong>{" "}
                completed
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
              {submitting ? "Scoring Results..." : "Finish and Score"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Question Body Canvas */}
          <div className="lg:col-span-3 space-y-6">
            {/* Context Part Badge and directions */}
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
                  Question {currentIdx + 1} of {totalQuestions}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl mb-4">
                <p className="text-2xs text-slate-500 font-semibold uppercase font-mono tracking-widest mb-1">
                  Official Directions:
                </p>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {activePart?.instructions || "Review the material and input correct letter options."}
                </p>
              </div>

              {/* Special highlight capability alert for part 5-7 only */}
              {isPartHighlightable ? (
                <div className="bg-yellow-50/50 border border-yellow-105 text-yellow-800 p-3 rounded-xl text-2xs flex items-center space-x-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                  <span>
                    <strong>Highlight Mode Engaged:</strong> Tap on any vocabulary or noun word inside the passage or sentence below to tag it for post-test vocabulary logs!
                  </span>
                </div>
              ) : (
                <div className="bg-blue-50/50 border border-blue-150/50 text-blue-800 p-3 rounded-xl text-[10px] uppercase tracking-wider font-mono font-bold flex items-center space-x-2">
                  <Volume2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>LISTENING SECTION: WORD SELECTING IS LOCKED IN THIS SEGMENT.</span>
                </div>
              )}
            </div>

            {/* Listening component media simulator / Photographs */}
            {!isPartHighlightable && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-widest bg-blue-50 text-blue-700 font-mono mb-4">
                  🔊 Listening Stream Emulator
                </span>

                {currentQuestion.image ? (
                  <div className="mb-6 rounded-xl overflow-hidden max-w-sm border border-gray-25 shadow-xs mx-auto">
                    <img
                      src={currentQuestion.image}
                      alt="Photographic Question Prompt"
                      className="w-full object-cover max-h-56"
                    />
                  </div>
                ) : (
                  <div className="py-4 px-6 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center animate-pulse">
                        <Volume2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-800 block">
                          TOEIC Audio Stream (Ready)
                        </span>
                        <span className="text-3xs text-gray-500 font-mono uppercase tracking-widest block">
                          Play simulated track
                        </span>
                      </div>
                    </div>
                    {/* Simulated visual sound wave */}
                    <div className="flex items-end space-x-0.5 h-6">
                      <div className="w-0.5 bg-blue-400 h-2 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-0.5 bg-blue-500 h-5 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                      <div className="w-0.5 bg-blue-600 h-3 rounded-full animate-bounce" style={{ animationDelay: "0.5s" }}></div>
                      <div className="w-0.5 bg-blue-400 h-6 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-0.5 bg-blue-300 h-1.5 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                )}
                
                <p className="text-2xs text-gray-500 italic mt-2">
                  * Note: In a real environment, the narrative transcript below is spoken. We display it during test-taking for baseline visual guidance.
                </p>
              </div>
            )}

            {/* Reading component / Passage box for Parts 6 & 7 */}
            {isPartHighlightable && currentQuestion.passage && (
              <div className="bg-amber-50/20 border border-amber-100 rounded-2xl p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                  <span className="text-2xs font-bold text-amber-800 uppercase tracking-widest font-mono block">
                    📖 Reading Passage Reference
                  </span>
                  <span className="text-3xs text-amber-500 font-mono">PART {partNum} CONTEXT</span>
                </div>
                
                {/* Text Tokenization of passage */}
                <div className="p-4 bg-white border border-amber-100/55 rounded-xl">
                  {currentQuestion.passage.split("\n").map((para, pIdx) => (
                    <div key={pIdx} className="mb-3 last:mb-0">
                      {renderInteractiveText(para, currentQuestion.id)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Core question card and selector */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="space-y-4">
                <span className="text-2xs font-bold text-gray-400 uppercase tracking-widest font-mono block">
                  Question prompt:
                </span>
                
                {/* Render Interactive Tokenized Text or Standard Listening Narrative */}
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                  {isPartHighlightable ? (
                    renderInteractiveText(currentQuestion.questionText, currentQuestion.id)
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {currentQuestion.questionText}
                      </p>
                      {currentQuestion.transcript && (
                        <div className="mt-4 p-3.5 bg-blue-50/20 border border-blue-100/40 rounded-xl space-y-1.5 text-xs text-blue-900 border-dashed">
                          <span className="font-bold font-mono tracking-widest text-[10px] text-blue-700 block uppercase">
                            🎙️ Spoken Conversation / Audio Script
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

              {/* Answers Option Multiple-Choice Selectors */}
              <div className="space-y-3">
                <span className="text-2xs font-bold text-gray-400 uppercase tracking-widest font-mono block">
                  Select answer option:
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
                        }`}
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
                        <span className="text-sm text-gray-700 leading-normal font-medium pt-0.5">
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Stepper Footer Controls */}
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
                <span>Previous Item</span>
              </button>

              <span className="text-xs text-gray-400 font-mono uppercase tracking-widest font-semibold">
                Item {currentIdx + 1} of {totalQuestions}
              </span>

              {currentIdx < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentIdx(prev => prev + 1)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 bg-gray-900 border border-transparent hover:bg-gray-800 text-white cursor-pointer transition-colors"
                >
                  <span>Next Item</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              ) : (
                <button
                  id="finish-exam-footer"
                  onClick={handleFinish}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors"
                >
                  <span>Finish & Submit</span>
                  <CheckSquare className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Navigation Grid */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
              <div className="pb-3 border-b border-gray-100 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest font-mono">
                    Quest Canvas
                  </h3>
                  <p className="text-4xs text-gray-400 font-mono">RAPID NAV NAVIGATOR</p>
                </div>
                <span className="text-2xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded px-2 py-0.5 rounded font-mono">
                  {Object.keys(selectedAnswers).length} / {totalQuestions}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIdx;
                  const isAnswered = !!selectedAnswers[q.id];
                  const qPart = parts.find(p => p.questions.some(item => item.id === q.id))?.partNumber || 5;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-8 w-full rounded-lg text-2xs font-bold font-mono border transition-all duration-200 cursor-pointer flex flex-col justify-center items-center ${
                        isCurrent
                          ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-500/15"
                          : isAnswered
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                          : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                      title={`Part ${qPart} Question ${idx + 1}`}
                    >
                      <span>{idx + 1}</span>
                      <span className="text-4xs opacity-60 font-sans block leading-none">p{qPart}</span>
                    </button>
                  );
                })}
              </div>

              {/* Legend guide */}
              <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-4xs font-mono uppercase text-gray-400 tracking-wider">
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  <span>Active</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-full bg-white border border-gray-200"></div>
                  <span>Unanswered</span>
                </div>
              </div>
            </div>

            {/* Quick Tips Helper box */}
            <div className="p-5 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-lg space-y-3">
              <h4 className="text-xs font-bold tracking-widest uppercase font-mono text-blue-300 flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                <span>Ingressive Study Tip</span>
              </h4>
              <p className="text-3xs text-slate-300 leading-relaxed font-sans font-medium">
                Do not stress about knowing every single word of vocabulary at this active testing step. Highlight words to study later. We will fetch you clear transcripts and scoring breakdowns on submission!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
