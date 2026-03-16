
import React, { useState, useEffect } from 'react';
import { AppView, UserSession, QuizResult, Question, IncorrectWord, QuizSettings, SheetWord } from './types';
import StudentLogin from './views/StudentLogin';
import Landing from './views/Landing';
import Quiz from './views/Quiz';
import Result from './views/Result';
import TeacherDashboard from './views/TeacherDashboard';
import IncorrectNote from './views/IncorrectNote';
import PracticeSelect from './views/PracticeSelect';
import FlashcardStudy from './views/FlashcardStudy';
import { generateQuizQuestions } from './services/geminiService';
import { fetchWordsFromSheet, submitResultToSheet } from './services/sheetService';
import { APP_CONFIG } from './config';

const RESULT_STORAGE_KEY = 'vocamaster_results';
const INCORRECT_STORAGE_KEY = 'vocamaster_incorrect_notes';
const SHEET_ID_KEY = 'vocamaster_sheet_id';
const SCRIPT_URL_KEY = 'vocamaster_script_url';

// Helper for consistent key generation
const getAttemptKey = (date: string, className: string, name: string) => {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '_');
  return `vocamaster_attempt_${date}_${normalize(className)}_${normalize(name)}`;
};

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.STUDENT_LOGIN);
  const [loggedInStudent, setLoggedInStudent] = useState<string>('');
  const [session, setSession] = useState<UserSession | null>(null);
  
  // Data State
  const [questions, setQuestions] = useState<Question[]>([]); // For Quiz Mode
  const [rawPracticeWords, setRawPracticeWords] = useState<SheetWord[]>([]); // For Practice Mode (Full List)
  const [activePracticeSet, setActivePracticeSet] = useState<SheetWord[]>([]); // For Flashcard Mode (Selected Set)
  const [activeSetTitle, setActiveSetTitle] = useState('');

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
    
    const storedStudent = localStorage.getItem('vocamaster_logged_in_student');
    const params = new URLSearchParams(window.location.search);
    const storedSheetId = localStorage.getItem('vocamaster_sheet_id');
    const urlSheetId = params.get('sheet_id');
    const hasUrlParams = !!urlSheetId;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const isSessionVerified = sessionStorage.getItem('vocamaster_session_verified') === 'true';
    const isDifferentSheet = urlSheetId && urlSheetId !== storedSheetId;

    if (hasUrlParams && (!isStandalone || isDifferentSheet) && (!isSessionVerified || isDifferentSheet)) {
      // If URL has parameters (e.g., from QR code), not PWA, and not verified in this session, force login.
      // Also force login if the sheet_id in the URL is different from the stored one.
      localStorage.removeItem('vocamaster_logged_in_student');
      sessionStorage.removeItem('vocamaster_session_verified');
      setLoggedInStudent(null);
      setCurrentView(AppView.STUDENT_LOGIN);
    } else if (storedStudent) {
      setLoggedInStudent(storedStudent);
      sessionStorage.setItem('vocamaster_session_verified', 'true');
      setCurrentView(AppView.LANDING);
    } else {
      setCurrentView(AppView.STUDENT_LOGIN);
    }
  }, []);

  const saveResult = (result: QuizResult) => {
    if (result.mode === 'TEST') {
      const existing = localStorage.getItem(RESULT_STORAGE_KEY);
      const results: QuizResult[] = existing ? JSON.parse(existing) : [];
      results.push(result);
      localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(results));
      
      const attemptKey = getAttemptKey(result.date, result.className, result.studentName);
      localStorage.setItem(attemptKey, JSON.stringify({ status: 'COMPLETED', timestamp: Date.now() }));
    }
    
    setLastResult(result);

    if (result.mode === 'TEST') {
      const scriptUrl = localStorage.getItem(SCRIPT_URL_KEY) || APP_CONFIG.scriptUrl;
      if (scriptUrl) {
        setSubmissionStatus('submitting');
        submitResultToSheet(scriptUrl, result).then(success => setSubmissionStatus(success ? 'success' : 'error'));
      }
    } else {
      setSubmissionStatus('idle');
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

  const handleStartQuiz = async (name: string, className: string, testDate: string, settings: QuizSettings, mode: 'TEST' | 'PRACTICE') => {
    setSession({ name, className, testDate, settings, mode });
    setIsLoading(true);
    setLoadingMessage(`단어 데이터를 불러오는 중...`);
    setIsReviewMode(false);
    
    let attemptKey = '';
    if (mode === 'TEST') {
      attemptKey = getAttemptKey(testDate, className, name);
      localStorage.setItem(attemptKey, JSON.stringify({ status: 'STARTED', timestamp: Date.now() }));
    }

    try {
      const sheetId = localStorage.getItem(SHEET_ID_KEY) || APP_CONFIG.sheetId;
      if (!sheetId) throw new Error("시트 ID 설정이 필요합니다.");
      
      const sheetWords = await fetchWordsFromSheet(sheetId, className, mode);
      
      if (mode === 'PRACTICE') {
        setRawPracticeWords(sheetWords);
        setIsLoading(false);
        setCurrentView(AppView.PRACTICE_SELECT);
      } else {
        setLoadingMessage('시험지를 생성 중입니다...');
        const generatedQuestions = await generateQuizQuestions(settings, sheetWords, false);
        setQuestions(generatedQuestions);
        setIsLoading(false);
        setCurrentView(AppView.QUIZ);
      }
    } catch (error: any) {
      alert(error.message);
      setSession(null);
      setIsLoading(false);
      if (mode === 'TEST' && attemptKey) {
        localStorage.removeItem(attemptKey);
      }
    }
  };

  const handlePracticeSetSelect = (words: SheetWord[], setIndex: number) => {
    setActivePracticeSet(words);
    setActiveSetTitle(`SET ${setIndex} 연습`);
    setCurrentView(AppView.FLASHCARD);
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
      incorrectQuestions: wrongQuestions,
      mode: session?.mode || 'TEST'
    };

    if (!isReviewMode) saveResult(result);
    else setLastResult(result);
    
    setCurrentView(AppView.RESULT);
  };

  const handleSafeExit = () => {
    if (currentView === AppView.QUIZ && session?.mode === 'TEST') {
      // During TEST mode in QUIZ view, we strictly block exit via the app logic.
      // But we have this as a backup if UI elements are clicked.
      if (!window.confirm("⚠️ 경고: 시험 진행 중입니다! ⚠️\n\n지금 나가면 '0점' 처리될 수 있으며, 재시험이 불가능할 수 있습니다.\n\n정말 시험을 포기하고 종료하시겠습니까?")) {
        return;
      }
      const attemptKey = getAttemptKey(session.testDate, session.className, session.name);
      localStorage.setItem(attemptKey, JSON.stringify({ status: 'ABANDONED', timestamp: Date.now() }));
    }
    setSession(null); 
    setQuestions([]); 
    setLastResult(null); 
    setIsReviewMode(false); 
    setCurrentView(loggedInStudent ? AppView.LANDING : AppView.STUDENT_LOGIN); 
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case AppView.STUDENT_LOGIN:
        return (
          <StudentLogin 
            onLoginSuccess={(name) => {
              setLoggedInStudent(name);
              sessionStorage.setItem('vocamaster_session_verified', 'true');
              setCurrentView(AppView.LANDING);
            }} 
            onChangeView={setCurrentView} 
          />
        );
      case AppView.LANDING:
        return <Landing onStart={handleStartQuiz} onChangeView={setCurrentView} initialName={loggedInStudent} />;
      case AppView.QUIZ:
        return session && <Quiz questions={questions} settings={session.settings} onComplete={handleQuizComplete} />;
      case AppView.RESULT:
        return lastResult && <Result result={lastResult} onHome={handleSafeExit} submissionStatus={submissionStatus} />;
      case AppView.TEACHER_LOGIN:
        return (
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-100 animate-pop text-center">
            <h2 className="text-2xl font-bold mb-6">선생님 로그인</h2>
            <input 
              type="password" 
              value={accessCode} 
              onChange={(e) => setAccessCode(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && (accessCode === APP_CONFIG.adminPassword ? setCurrentView(AppView.TEACHER_DASHBOARD) : setLoginError('Error'))} 
              className="w-full px-4 py-2 border rounded-lg mb-4" 
              placeholder="Password" 
            />
            <button 
              onClick={() => accessCode === APP_CONFIG.adminPassword ? setCurrentView(AppView.TEACHER_DASHBOARD) : setLoginError('Error')} 
              className="w-full bg-indigo-600 text-white py-2 rounded-lg"
            >
              Enter
            </button>
          </div>
        );
      case AppView.TEACHER_DASHBOARD:
        return <TeacherDashboard />;
      case AppView.PRACTICE_SELECT:
        return <PracticeSelect totalWords={rawPracticeWords} onSelectSet={handlePracticeSetSelect} onBack={handleSafeExit} />;
      case AppView.FLASHCARD:
        return <FlashcardStudy words={activePracticeSet} setTitle={activeSetTitle} onFinish={() => setCurrentView(AppView.PRACTICE_SELECT)} />;
      default:
        return null;
    }
  };

  const isTestInQuiz = currentView === AppView.QUIZ && session?.mode === 'TEST';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div 
            className={`flex items-center gap-2 ${isTestInQuiz ? 'cursor-default' : 'cursor-pointer'}`} 
            onClick={() => {
              if (isTestInQuiz) return;
              handleSafeExit();
            }}
          >
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight">PIF영어학원</h1>
            {session?.mode === 'PRACTICE' && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold ml-2">연습모드</span>
            )}
            {session?.mode === 'TEST' && currentView === AppView.QUIZ && (
              <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold ml-2">시험 진행중 (차단됨)</span>
            )}
          </div>
          
          {!isTestInQuiz && (
            <div className="flex items-center gap-4">
              {currentView === AppView.LANDING && loggedInStudent && (
                <button 
                  onClick={() => {
                    localStorage.removeItem('vocamaster_logged_in_student');
                    sessionStorage.removeItem('vocamaster_session_verified');
                    setLoggedInStudent('');
                    setCurrentView(AppView.STUDENT_LOGIN);
                  }} 
                  className="px-4 py-2 rounded-md bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200"
                >
                  로그아웃
                </button>
              )}
              {currentView === AppView.LANDING && (
                <button onClick={() => setCurrentView(AppView.TEACHER_LOGIN)} className="px-4 py-2 rounded-md bg-indigo-50 text-indigo-600 text-sm font-medium hover:bg-indigo-100">선생님</button>
              )}
              {currentView === AppView.TEACHER_DASHBOARD && (
                <button onClick={handleSafeExit} className="text-sm text-gray-500 font-medium hover:text-gray-700">로그아웃</button>
              )}
              {currentView !== AppView.LANDING && currentView !== AppView.STUDENT_LOGIN && currentView !== AppView.TEACHER_DASHBOARD && (
                <button onClick={handleSafeExit} className="text-sm text-gray-500 font-medium hover:text-gray-700">닫기</button>
              )}
            </div>
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
          renderCurrentView()
        )}
      </main>
    </div>
  );
}
export default App;
