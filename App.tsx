
import React, { useState, useEffect } from 'react';
import { AppView, UserSession, QuizResult, Question, IncorrectWord, QuizSettings } from './types';
import Landing from './views/Landing';
import Quiz from './views/Quiz';
import Result from './views/Result';
import TeacherDashboard from './views/TeacherDashboard';
import IncorrectNote from './views/IncorrectNote';
import { generateQuizQuestions } from './services/geminiService';
import { fetchWordsFromSheet, submitResultToSheet } from './services/sheetService';
import { APP_CONFIG } from './config';

const RESULT_STORAGE_KEY = 'vocamaster_results';
const INCORRECT_STORAGE_KEY = 'vocamaster_incorrect_notes';
const SHEET_ID_KEY = 'vocamaster_sheet_id';
const SCRIPT_URL_KEY = 'vocamaster_script_url';

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [session, setSession] = useState<UserSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lastResult, setLastResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [incorrectRecords, setIncorrectRecords] = useState<Record<string, IncorrectWord[]>>({});

  const [accessCode, setAccessCode] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(INCORRECT_STORAGE_KEY);
    if (stored) {
      try { setIncorrectRecords(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  const saveResult = (result: QuizResult) => {
    const existing = localStorage.getItem(RESULT_STORAGE_KEY);
    const results: QuizResult[] = existing ? JSON.parse(existing) : [];
    results.push(result);
    localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(results));
    setLastResult(result);

    const scriptUrl = localStorage.getItem(SCRIPT_URL_KEY) || APP_CONFIG.scriptUrl;
    if (scriptUrl) {
      setSubmissionStatus('submitting');
      submitResultToSheet(scriptUrl, result).then(success => setSubmissionStatus(success ? 'success' : 'error'));
    }
  };

  const updateIncorrectWords = (studentName: string, quizQuestions: Question[], wrongQuestions: Question[]) => {
    const records = { ...incorrectRecords };
    let studentKey = Object.keys(records).find(k => k.toLowerCase() === studentName.toLowerCase().trim()) || studentName.trim();
    if (!records[studentKey]) records[studentKey] = [];
    const studentWords = records[studentKey];
    const now = new Date().toISOString();

    if (isReviewMode) {
      const wrongIds = new Set(wrongQuestions.map(q => q.id));
      const correctIds = quizQuestions.filter(q => !wrongIds.has(q.id)).map(q => q.id);
      records[studentKey] = studentWords.map(w => {
         if (correctIds.includes(w.question.id)) return { ...w, wrongCount: Math.max(0, w.wrongCount - 1) };
         return w;
      }).filter(w => w.wrongCount > 0);
    } else {
      wrongQuestions.forEach(q => {
        const existingIndex = studentWords.findIndex(w => w.question.word === q.word);
        if (existingIndex >= 0) {
          studentWords[existingIndex].wrongCount += 1;
          studentWords[existingIndex].lastMissedDate = now;
        } else {
          studentWords.push({ question: q, wrongCount: 1, lastMissedDate: now });
        }
      });
    }
    setIncorrectRecords(records);
    localStorage.setItem(INCORRECT_STORAGE_KEY, JSON.stringify(records));
  };

  const handleStartQuiz = async (name: string, className: string, testDate: string, settings: QuizSettings) => {
    setSession({ name, className, testDate, settings });
    setIsLoading(true);
    setLoadingMessage(`단어 데이터를 불러오는 중...`);
    setIsReviewMode(false);
    
    try {
      const sheetId = localStorage.getItem(SHEET_ID_KEY) || APP_CONFIG.sheetId;
      if (!sheetId) throw new Error("시트 ID 설정이 필요합니다.");
      const sheetWords = await fetchWordsFromSheet(sheetId, className);
      setLoadingMessage(`시험지를 생성 중입니다...`);
      const generatedQuestions = await generateQuizQuestions(settings, sheetWords);
      setQuestions(generatedQuestions);
      setCurrentView(AppView.QUIZ);
    } catch (error: any) {
      alert(error.message);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = (score: number, total: number, timeSeconds: number, wrongQuestions: Question[]) => {
    if (!session && !isReviewMode) return;
    const nameToUse = session?.name || "익명 학생";
    updateIncorrectWords(nameToUse, questions, wrongQuestions);
    const result: QuizResult = {
      studentName: nameToUse,
      className: session?.className || "복습",
      date: session?.testDate || new Date().toISOString().split('T')[0],
      score,
      totalQuestions: total,
      timeTakenSeconds: timeSeconds,
      timestamp: new Date().toISOString(),
      incorrectQuestions: wrongQuestions, // Save wrong questions for immediate review
    };
    if (!isReviewMode) saveResult(result);
    else setLastResult(result);
    setCurrentView(AppView.RESULT);
  };

  const handleLogout = () => { setSession(null); setQuestions([]); setLastResult(null); setIsReviewMode(false); setCurrentView(AppView.LANDING); };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView(AppView.LANDING)}>
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">PIF영어학원</h1>
          </div>
          {currentView === AppView.LANDING && (
            <button onClick={() => setCurrentView(AppView.TEACHER_LOGIN)} className="px-4 py-2 rounded-md bg-gray-100 text-sm font-medium">선생님</button>
          )}
          {(currentView === AppView.TEACHER_DASHBOARD || currentView === AppView.TEACHER_LOGIN) && (
            <button onClick={handleLogout} className="text-sm text-gray-500 font-medium">닫기</button>
          )}
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 animate-pop text-center">
             <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
             <p className="text-lg text-gray-600 font-semibold">{loadingMessage}</p>
          </div>
        ) : (
          <>
            {currentView === AppView.LANDING && <Landing onStart={handleStartQuiz} onChangeView={setCurrentView} />}
            {currentView === AppView.QUIZ && session && <Quiz questions={questions} settings={session.settings} onComplete={handleQuizComplete} />}
            {currentView === AppView.RESULT && lastResult && <Result result={lastResult} onHome={handleLogout} submissionStatus={submissionStatus} />}
            {currentView === AppView.TEACHER_LOGIN && (
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-100 animate-pop text-center">
                <h2 className="text-2xl font-bold mb-6">선생님 로그인</h2>
                <input type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (accessCode === 'teacher' ? setCurrentView(AppView.TEACHER_DASHBOARD) : setLoginError('Error'))} className="w-full px-4 py-2 border rounded-lg mb-4" placeholder="Password" />
                <button onClick={() => accessCode === 'teacher' ? setCurrentView(AppView.TEACHER_DASHBOARD) : setLoginError('Error')} className="w-full bg-indigo-600 text-white py-2 rounded-lg">Enter</button>
              </div>
            )}
            {currentView === AppView.TEACHER_DASHBOARD && <TeacherDashboard />}
          </>
        )}
      </main>
    </div>
  );
}
export default App;
