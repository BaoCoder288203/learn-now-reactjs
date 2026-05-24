import React, { useState, useEffect } from "react";
import { Play, ClipboardCheck, BookOpen, Layers, Sparkles, Filter } from "lucide-react";
import { Test } from "../types.js";

interface TestSelectionProps {
  token: string;
  onStartTest: (testId: string, partFocus: number | null) => void;
}

export default function TestSelection({ token, onStartTest }: TestSelectionProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partFilter, setPartFilter] = useState<number | null>(null);

  useEffect(() => {
    async function loadTests() {
      try {
        const response = await fetch("/api/tests", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error("Failed to load test list.");
        }
        const data = await response.json();
        setTests(data);
      } catch (err: any) {
        setError(err.message || "Network issue loading exams.");
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
        <p className="text-gray-500 font-medium">Retrieving exam database catalog...</p>
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
      {/* Banner introduction with elegant display typography */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-950 text-white p-8 rounded-2xl border border-slate-800 shadow-lg mb-10">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-blue-500/20 text-blue-300 font-mono text-2xs uppercase tracking-widest px-2.5 py-1 rounded-full font-bold border border-blue-500/30">
            Interactive Diagnostic Portal
          </span>
          <h1 className="mt-4 text-3xl md:text-4xl font-sans font-bold tracking-tight">
            Elevate Your Study: Interactive TOEIC Drills
          </h1>
          <p className="mt-2 text-slate-300 text-sm leading-relaxed">
            Take standard comprehensive tests or focus on specific parts. 
            Inside Parts 5, 6, and 7, highlight any words to instantly add them to your review notebook.
          </p>
        </div>
        {/* Abstract shape decoration */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-blue-500/5 to-transparent pointer-events-none"></div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Drill & Exam Library</h2>
          <p className="text-sm text-gray-500">Pick an exam below and choose your practice mode.</p>
        </div>

        {/* Quick learning filter values */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-gray-400 flex items-center space-x-1 shrink-0">
            <Filter className="w-3 h-3" />
            <span>Practice focus:</span>
          </span>
          <button
            onClick={() => setPartFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${
              partFilter === null
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Full Exam Mode
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
              Part {num} ONLY
            </button>
          ))}
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tests available right now.</p>
          <p className="text-sm text-gray-400">If you are an admin, head to the Admin Panel to import or manually draft exams.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((test) => {
            // Count total questions available
            const totalQs = test.parts?.reduce((sum, p) => sum + (p._count?.questions || 0), 0) || 0;
            const hasFocusPart = partFilter !== null ? test.parts?.some(p => p.partNumber === partFilter && (p._count?.questions || 0) > 0) : true;

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
                      TOEIC STANDARD
                    </span>
                    {partFilter !== null && (
                      <span className="px-2.5 py-0.5 rounded text-3xs font-bold bg-blue-50 text-blue-700 font-mono">
                        FOCUS: PART {partFilter}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2">
                    {test.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                    {test.description || "Take a timed standard session to assess your grammar, dialogue parsing, and vocabulary skills."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-700 text-2xs rounded font-mono border border-slate-100">
                      📝 {totalQs} Questions
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 bg-slate-50 text-slate-700 text-2xs rounded font-mono border border-slate-100">
                      ⏳ Timed
                    </span>
                  </div>

                  <div className="mt-5 border-t border-gray-50 pt-4">
                    <span className="block text-2xs font-semibold text-gray-400 uppercase tracking-widest font-mono mb-2">
                      Exam breakdown:
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
                            title={`Part ${num}: ${count} Questions`}
                          >
                            <span>P{num}</span>
                            <span className="block text-3xs font-sans opacity-80">{count}q</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button
                    id={`start-test-${test.id}`}
                    onClick={() => onStartTest(test.id, partFilter)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-all duration-200"
                  >
                    <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                    <span>
                      {partFilter === null ? "Start Complete Exam" : `Drill Part ${partFilter} Only`}
                    </span>
                  </button>
                  <p className="text-4xs text-center text-gray-400 mt-2 font-mono uppercase tracking-widest">
                    PROGRESSION IS SAVED LIVE
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
