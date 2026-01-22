
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
  const [showWrongAnswers, setShowWrongAnswers] = useState(false);
  
  const percentage = Math.round((result.score / result.totalQuestions) * 100);
  
  let gradeColor = 'text-red-500';
  let message = '조금 더 노력해봅시다!';
  
  if (percentage >= 90) {
    gradeColor = 'text-green-500';
    message = '훌륭합니다! 완벽해요!';
  } else if (percentage >= 70) {
    gradeColor = 'text-blue-500';
    message = '잘했습니다! 좋은 결과예요.';
  } else if (percentage >= 50) {
    gradeColor = 'text-yellow-500';
    message = '아쉬워요. 조금만 더 공부할까요?';
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초`;
  };

  const handleCopyResult = () => {
    const text = `[PIF 단어결과]\n이름: ${result.studentName}\n반/날짜: ${result.className} (${result.date})\n점수: ${result.score} / ${result.totalQuestions} (${percentage}%)\n시간: ${formatTime(result.timeTakenSeconds)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const incorrectList = result.incorrectQuestions || [];

  return (
    <div className="flex flex-col items-center justify-center animate-pop py-8">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-lg w-full border border-gray-100">
        <div className="bg-gray-900 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white opacity-5 rounded-full"></div>
          <h2 className="text-3xl font-bold relative z-10 mb-2">{result.studentName}</h2>
          <p className="text-gray-400 text-sm relative z-10 font-medium">{result.className} <span className="mx-2">|</span> {result.date}</p>
        </div>

        <div className="p-8 text-center">
          <div className="mb-2 text-gray-400 text-xs font-black uppercase tracking-widest">FINAL SCORE</div>
          <div className={`text-7xl font-black mb-4 ${gradeColor}`}>
            {result.score} <span className="text-2xl text-gray-300 font-normal">/ {result.totalQuestions}</span>
          </div>
          <p className="text-gray-600 font-bold text-lg mb-8">{message}</p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <div className="text-gray-400 text-[10px] font-black uppercase mb-1">소요 시간</div>
              <div className="text-xl font-black text-gray-800">{formatTime(result.timeTakenSeconds)}</div>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <div className="text-gray-400 text-[10px] font-black uppercase mb-1">정답률</div>
              <div className="text-xl font-black text-gray-800">{percentage}%</div>
            </div>
          </div>
          
          {submissionStatus !== 'idle' && (
             <div className="mb-6 p-4 rounded-xl text-sm font-bold bg-gray-50 border border-gray-100">
               {submissionStatus === 'submitting' && (
                 <span className="text-gray-500 flex items-center justify-center gap-3">
                   <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                   결과 자동 저장 중...
                 </span>
               )}
               {submissionStatus === 'success' && (
                 <span className="text-green-600 flex items-center justify-center gap-2">
                    ✅ 결과가 학원 서버에 저장되었습니다.
                 </span>
               )}
               {submissionStatus === 'error' && (
                 <span className="text-red-500 flex flex-col gap-1">
                    <span>❌ 결과 저장 실패 (네트워크 오류)</span>
                    <span className="text-[10px] text-gray-400">결과를 복사하여 선생님께 보내주세요.</span>
                 </span>
               )}
             </div>
          )}

          {incorrectList.length > 0 && (
            <div className="mb-8 border-t border-gray-100 pt-6">
              <button 
                onClick={() => setShowWrongAnswers(!showWrongAnswers)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
              >
                <span>{showWrongAnswers ? '🔼 오답 접기' : '🔽 틀린 문제 확인하기'}</span>
                <span className="bg-red-200 text-red-700 text-xs px-2 py-1 rounded-full">{incorrectList.length}개</span>
              </button>

              {showWrongAnswers && (
                <div className="mt-4 text-left space-y-3 animate-pop">
                  {incorrectList.map((q, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="text-sm font-bold text-gray-800 mb-1 break-keep">{q.word}</div>
                      <div className="text-xs font-semibold text-green-600 flex items-center gap-1">
                        <span className="bg-green-100 px-1.5 py-0.5 rounded">정답</span>
                        {q.options[q.correctAnswerIndex]}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={handleCopyResult} fullWidth size="lg" variant="secondary" className={`py-4 rounded-2xl ${copied ? "bg-green-50 text-green-700 border-green-200" : ""}`}>
              {copied ? "복사 완료! (선생님께 제출)" : "결과 복사하기"}
            </Button>
            <Button onClick={onHome} fullWidth variant="ghost" className="font-bold text-gray-400">처음으로 돌아가기</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;
