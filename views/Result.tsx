import React, { useState } from 'react';
import { QuizResult } from '../types';
import Button from '../components/Button';

interface ResultProps {
  result: QuizResult;
  onHome: () => void;
  submissionStatus?: 'idle' | 'submitting' | 'success' | 'error';
}

const Result: React.FC<ResultProps> = ({ result, onHome, submissionStatus = 'idle' }) => {
  const [copied, setCopied] = useState(false);
  const percentage = Math.round((result.score / result.totalQuestions) * 100);
  
  let gradeColor = 'text-red-500';
  let message = 'Keep practicing!';
  
  if (percentage >= 90) {
    gradeColor = 'text-green-500';
    message = 'Excellent work!';
  } else if (percentage >= 70) {
    gradeColor = 'text-blue-500';
    message = 'Good job!';
  } else if (percentage >= 50) {
    gradeColor = 'text-yellow-500';
    message = 'You can do better!';
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const handleCopyResult = () => {
    const text = `[VocaMaster Result]\nStudent: ${result.studentName}\nDate/Tab: ${result.date}\nScore: ${result.score} / ${result.totalQuestions} (${percentage}%)\nTime: ${formatTime(result.timeTakenSeconds)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center animate-pop py-8">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-lg w-full border border-gray-100">
        <div className="bg-gray-900 text-white p-8 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white opacity-10 rounded-full"></div>
          <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-48 h-48 bg-indigo-500 opacity-20 rounded-full"></div>
          
          <h2 className="text-3xl font-bold relative z-10 mb-2">{result.studentName}</h2>
          <p className="text-gray-400 text-sm relative z-10">{result.date}</p>
        </div>

        <div className="p-8 text-center">
          <div className="mb-2 text-gray-500 text-sm font-semibold uppercase tracking-wider">Your Score</div>
          <div className={`text-6xl font-extrabold mb-2 ${gradeColor}`}>
            {result.score} <span className="text-2xl text-gray-400 font-normal">/ {result.totalQuestions}</span>
          </div>
          <p className="text-gray-600 font-medium text-lg mb-8">{message}</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-gray-400 text-xs uppercase font-bold mb-1">Time Taken</div>
              <div className="text-xl font-bold text-gray-800">{formatTime(result.timeTakenSeconds)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-gray-400 text-xs uppercase font-bold mb-1">Accuracy</div>
              <div className="text-xl font-bold text-gray-800">{percentage}%</div>
            </div>
          </div>
          
          {submissionStatus !== 'idle' && (
             <div className="mb-6 p-3 rounded-lg text-sm font-medium">
               {submissionStatus === 'submitting' && (
                 <span className="text-gray-600 flex items-center justify-center gap-2">
                   <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                   Saving result to Google Sheet...
                 </span>
               )}
               {submissionStatus === 'success' && (
                 <span className="text-green-600 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Result saved to Google Sheet!
                 </span>
               )}
               {submissionStatus === 'error' && (
                 <span className="text-red-500">
                    Failed to auto-save. Please copy the result below.
                 </span>
               )}
             </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleCopyResult} 
              fullWidth 
              size="lg"
              variant="secondary"
              className={copied ? "bg-green-50 text-green-700 border-green-200" : ""}
            >
              {copied ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Copied!
                </span>
              ) : (
                "Copy Result (Submit to Teacher)"
              )}
            </Button>
            
            <Button onClick={onHome} fullWidth variant="ghost">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;