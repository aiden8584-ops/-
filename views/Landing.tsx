import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import { AppView } from '../types';
import { fetchSheetTabs } from '../services/sheetService';

interface LandingProps {
  onStart: (name: string, date: string) => void;
  onChangeView: (view: AppView) => void;
}

const Landing: React.FC<LandingProps> = ({ onStart, onChangeView }) => {
  const [name, setName] = useState('');
  const [tabName, setTabName] = useState('');
  const [hasSheetId, setHasSheetId] = useState(false);
  const [sheetId, setSheetId] = useState('');
  
  // State for dynamic tab loading
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);

  useEffect(() => {
    const SHEET_KEY = 'vocamaster_sheet_id';
    const SCRIPT_KEY = 'vocamaster_script_url';
    
    const params = new URLSearchParams(window.location.search);
    const urlSheetId = params.get('sheet_id');
    const urlScript = params.get('script');

    if (urlSheetId) {
      localStorage.setItem(SHEET_KEY, urlSheetId);
      setSheetId(urlSheetId);
      setHasSheetId(true);
      loadTabs(urlSheetId);
    } else {
      const storedSheetId = localStorage.getItem(SHEET_KEY);
      if (storedSheetId) {
        setSheetId(storedSheetId);
        setHasSheetId(true);
        loadTabs(storedSheetId);
      }
    }

    if (urlScript) {
      const cleanScript = urlScript.trim();
      if (cleanScript.toLowerCase().startsWith('http')) {
        localStorage.setItem(SCRIPT_KEY, cleanScript);
      } else {
        try {
          const decoded = atob(cleanScript);
          localStorage.setItem(SCRIPT_KEY, decoded);
        } catch (e) {
          localStorage.setItem(SCRIPT_KEY, cleanScript);
        }
      }
    }
    
    if (urlSheetId || urlScript) {
       window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadTabs = async (id: string) => {
    setIsLoadingTabs(true);
    try {
      const tabs = await fetchSheetTabs(id);
      if (tabs.length > 0) {
        setAvailableTabs(tabs);
        // Default to no selection to force the user to pick
        setTabName(''); 
        setIsManualInput(false);
      } else {
        setIsManualInput(true);
      }
    } catch (e) {
      console.error(e);
      setIsManualInput(true);
    } finally {
      setIsLoadingTabs(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && tabName.trim()) {
      onStart(name.trim(), tabName.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pop pb-10">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-50">
        <div className="bg-indigo-600 p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">PIF영어학원 단어시험</h2>
          <p className="text-indigo-100 font-medium">단어 알면 해석된다!</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {!hasSheetId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-amber-900">
                  <p className="font-bold text-base mb-1">설정 필요</p>
                  <p>구글 시트 연동이 아직 완료되지 않았습니다.</p>
                </div>
              </div>
              <Button 
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => onChangeView(AppView.TEACHER_LOGIN)}
                className="bg-white border-amber-300 text-amber-800 hover:bg-amber-50 mt-1"
              >
                선생님 로그인하여 설정하기
              </Button>
            </div>
          )}

          <div>
            <div className="flex flex-col mb-4">
              <label className="block text-sm font-bold text-gray-800 uppercase tracking-wide">
                1단계. 수업반 선택
              </label>
              <p className="text-xs text-indigo-500 font-medium mt-1">
                본인의 소속 반을 클릭하여 선택하세요.
              </p>
            </div>
            
            {isLoadingTabs ? (
              <div className="w-full h-32 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-500 font-medium">반 목록 로딩 중...</span>
                </div>
              </div>
            ) : isManualInput ? (
              <input
                type="text"
                required
                placeholder="반 이름을 직접 입력하세요 (예: 서울고)"
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
                disabled={!hasSheetId}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTabName(tab)}
                      className={`relative px-4 py-3 rounded-xl border-2 transition-all duration-200 text-sm font-bold flex items-center justify-center text-center h-16
                        ${tabName === tab 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md ring-2 ring-indigo-200 ring-offset-1' 
                          : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-indigo-200 hover:bg-white hover:shadow-sm'}`}
                    >
                      {tab}
                      {tabName === tab && (
                        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                   <button 
                     type="button"
                     onClick={() => {
                       setIsManualInput(true);
                       setTabName('');
                     }}
                     className="text-xs text-gray-400 hover:text-indigo-600 underline font-medium"
                   >
                     목록에 없나요? 직접 입력하기
                   </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-bold text-gray-800 uppercase tracking-wide mb-2">
              2단계. 학생 이름 입력
            </label>
            <input
              type="text"
              id="name"
              required
              placeholder="차은우"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!hasSheetId}
              className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 text-lg font-medium"
            />
          </div>

          <Button 
            type="submit" 
            fullWidth 
            disabled={!hasSheetId || !tabName || !name} 
            className="text-xl py-5 shadow-xl shadow-indigo-100 rounded-2xl"
          >
            {hasSheetId ? '시험 시작하기' : '선생님 설정 대기 중'}
          </Button>
        </form>
      </div>
      
      <div className="mt-8 w-full max-w-xl">
        <Button 
          variant="secondary" 
          fullWidth 
          onClick={() => onChangeView(AppView.INCORRECT_NOTE)}
          className="flex items-center justify-center gap-3 border-red-100 bg-white text-red-600 hover:bg-red-50 hover:border-red-200 py-4 rounded-xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          나의 오답 노트 확인하기
        </Button>
      </div>
    </div>
  );
};

export default Landing;