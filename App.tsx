
import React, { useState, useEffect } from 'react';
import { AppView, UserSession, QuizResult, Question, IncorrectWord } from './types';
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

  // Login State
  const [accessCode, setAccessCode] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(INCORRECT_STORAGE_KEY);
    if (stored) {
      try {
        setIncorrectRecords(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load incorrect records");
      }
    }
  }, []);

  const saveResult = (result: QuizResult) => {
    const existing = localStorage.getItem(RESULT_STORAGE_KEY);
    const results: QuizResult[] = existing ? JSON.parse(existing) : [];
    results.push(result);
    localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(results));
    setLastResult(result);

    // Check localStorage first, then fallback to config
    const scriptUrl = localStorage.getItem(SCRIPT_URL_KEY) || APP_CONFIG.scriptUrl;
    
    if (scriptUrl) {
      setSubmissionStatus('submitting');
      submitResultToSheet(scriptUrl, result).then(success => {
        setSubmissionStatus(success ? 'success' : 'error');
      });
    } else {
      setSubmissionStatus('idle');
    }
  };

  const updateIncorrectWords = (studentName: string, quizQuestions: Question[], wrongQuestions: Question[]) => {
    const records = { ...incorrectRecords };
    let studentKey = Object.keys(records).find(k => k.toLowerCase() === studentName.toLowerCase().trim());
    
    if (!studentKey) {
      studentKey = studentName.trim();
      records[studentKey] = [];
    }

    const studentWords = records[studentKey];
    const now = new Date().toISOString();

    if (isReviewMode) {
      const wrongIds = new Set(wrongQuestions.map(q => q.id));
      const correctIds = quizQuestions.filter(q => !wrongIds.has(q.id)).map(q => q.id);
      
      records[studentKey] = studentWords.map(w => {
         if (correctIds.includes(w.question.id)) {
           return { ...w, wrongCount: Math.max(0, w.wrongCount - 1) };
         }
         return w;
      }).filter(w => w.wrongCount > 0);
      
      records[studentKey] = records[studentKey].map(w => {
        if (wrongIds.has(w.question.id)) {
           return { ...w, wrongCount: w.wrongCount + 1, lastMissedDate: now };
        }
        return w;
      });
    } else {
      wrongQuestions.forEach(q => {
        const existingIndex = studentWords.findIndex(w => w.question.word === q.word);
        if (existingIndex >= 0) {
          studentWords[existingIndex].wrongCount += 1;
          studentWords[existingIndex].lastMissedDate = now;
          studentWords[existingIndex].question = q; 
        } else {
          studentWords.push({
            question: q,
            wrongCount: 1,
            lastMissedDate: now
          });
        }
      });
    }

    setIncorrectRecords(records);
    localStorage.setItem(INCORRECT_STORAGE_KEY, JSON.stringify(records));
  };

  const handleStartQuiz = async (name: string, className: string, testDate: string) => {
    setSession({ name, className, testDate });
    setIsLoading(true);
    setLoadingMessage(`단어 데이터를 불러오는 중...`);
    setIsReviewMode(false);
    setSubmissionStatus('idle');
    
    try {
      // Check localStorage first, then fallback to config
      const sheetId = localStorage.getItem(SHEET_ID_KEY) || APP_CONFIG.sheetId;
      
      if (!sheetId) {
        throw new Error("선생님 설정이 완료되지 않았습니다. 시트 ID를 입력해주세요.");
      }

      const sheetWords = await fetchWordsFromSheet(sheetId, className);
      
      const count = Math.min(sheetWords.length, 50);
      setLoadingMessage(`시험지를 생성 중입니다...`);

      const generatedQuestions = await generateQuizQuestions(testDate, sheetWords);
      
      setQuestions(generatedQuestions);
      setCurrentView(AppView.QUIZ);

    } catch (error: any) {
      let errorMsg = `문제가 발생했습니다: ${error.message}`;
      if (error.message.includes('Sheet not found') || error.message.includes('404')) {
        errorMsg = `구글 시트를 찾을 수 없습니다.\n\n1. 시트가 '링크가 있는 모든 사용자에게 공개' 되어 있는지 확인하세요.\n2. 탭 이름 '${className}'이(가) 시트 하단 탭 이름과 정확히 일치하는지 확인하세요.`;
      }
      
      alert(errorMsg);
      console.error(error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartReview = (reviewQuestions: Question[], studentName?: string) => {
    if (studentName) {
      setSession({ name: studentName, className: '오답 복습', testDate: new Date().toISOString().split('T')[0] });
    }
    setQuestions(reviewQuestions);
    setIsReviewMode(true);
    setCurrentView(AppView.QUIZ);
  };

  const handleQuizComplete = (score: number, total: number, timeSeconds: number, wrongQuestions: Question[]) => {
    if (!session && !isReviewMode) return;
    
    const nameToUse = session?.name || "익명 학생";
    updateIncorrectWords(nameToUse, questions, wrongQuestions);

    const result: QuizResult = {
      studentName: nameToUse,
      className: session?.className || "복습 모드",
      date: session?.testDate || new Date().toISOString().split('T')[0],
      score,
      totalQuestions: total,
      timeTakenSeconds: timeSeconds,
      timestamp: new Date().toISOString(),
    };
    
    if (!isReviewMode) {
      saveResult(result);
    } else {
      setLastResult(result);
    }
    
    setCurrentView(AppView.RESULT);
  };

  const handleLogin = () => {
    if (accessCode === 'teacher') {
      setLoginError('');
      setAccessCode('');
      setCurrentView(AppView.TEACHER_DASHBOARD);
    } else {
      setLoginError('비밀번호가 틀렸습니다. (기본: teacher)');
    }
  };

  const handleLogout = () => {
    setSession(null);
    setQuestions([]);
    setLastResult(null);
    setIsReviewMode(false);
    setCurrentView(AppView.LANDING);
    setAccessCode('');
    setLoginError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setCurrentView(AppView.LANDING)}
          >
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">PIF영어학원</h1>
          </div>
          
          {currentView === AppView.LANDING && (
             <div className="flex gap-4">
                <button 
                  onClick={() => setCurrentView(AppView.TEACHER_LOGIN)}
                  className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors"
                >
                  선생님
                </button>
             </div>
          )}
          {(currentView === AppView.TEACHER_DASHBOARD || currentView === AppView.INCORRECT_NOTE || currentView === AppView.TEACHER_LOGIN) && (
             <button 
               onClick={handleLogout}
               className="text-sm text-gray-500 hover:text-red-600 font-medium transition-colors"
             >
               닫기
             </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 animate-pop text-center">
             <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
             <p className="text-lg text-gray-600 font-semibold px-4">{loadingMessage}</p>
             <p className="text-sm text-gray-400 mt-2">안정적인 시험 환경을 구성하고 있습니다...</p>
          </div>
        ) : (
          <>
            {currentView === AppView.LANDING && (
              <Landing 
                onStart={handleStartQuiz} 
                onChangeView={setCurrentView}
              />
            )}
            
            {currentView === AppView.QUIZ && (
              <Quiz 
                questions={questions} 
                onComplete={handleQuizComplete} 
              />
            )}

            {currentView === AppView.RESULT && lastResult && (
              <Result 
                result={lastResult} 
                onHome={handleLogout} 
                submissionStatus={submissionStatus}
              />
            )}

            {currentView === AppView.INCORRECT_NOTE && (
              <IncorrectNote 
                initialStudentName={session?.name}
                incorrectRecords={incorrectRecords}
                onStartReview={(qs, name) => handleStartReview(qs, name)}
                onBack={() => setCurrentView(AppView.LANDING)}
              />
            )}

            {currentView === AppView.TEACHER_LOGIN && (
              <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-100 animate-pop">
                <h2 className="text-2xl font-bold mb-6 text-center">선생님 로그인</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">액세스 코드</label>
                    <input 
                      type="password" 
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      placeholder="비밀번호 입력"
                    />
                    {loginError && <p className="text-red-500 text-sm mt-1">{loginError}</p>}
                  </div>
                  <button 
                    onClick={handleLogin}
                    className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-black transition-colors"
                  >
                    대시보드 입장
                  </button>
                  <button 
                    onClick={() => setCurrentView(AppView.LANDING)}
                    className="w-full text-gray-500 py-2 text-sm hover:text-gray-700"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {currentView === AppView.TEACHER_DASHBOARD && (
              <TeacherDashboard />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
