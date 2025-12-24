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
  
  // Default preset tabs as requested by the user
  const PRESET_TABS = ['서울고', '상문고', '서초고', '예비고1', '예비고2'];
  const [availableTabs, setAvailableTabs] = useState<string[]>(PRESET_TABS);
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
      if (tabs && tabs.length > 0) {
        setAvailableTabs(tabs);
        setIsManualInput(false);
      } else {
        // Keep presets if fetching fails
        setAvailableTabs(PRESET_TABS);
      }
    } catch (e) {
      console.error("Failed to load tabs, using presets", e);
      setAvailableTabs(PRESET_TABS);
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
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-indigo-50">
        {/* Header Header */}
        <div className="bg-indigo-600 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-indigo-400 opacity-20 rounded-full blur-xl"></div>
          
          <h2 className="text-3xl font-extrabold text-white mb-2 relative z-10">PIF영어학원 단어시험</h2>
          <p className="text-indigo-100 font-medium relative z-10 opacity-90">단어 실력이 곧 독해력입니다!</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-10 space-y-10">
          {!hasSheetId && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-amber-900">
                  <p className="font-bold text-base mb-1">설정 대기</p>
                  <p>구글 시트 연동이 필요합니다. 선생님 로그인을 진행해주세요.</p>
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

          {/* Step 1: Class Selection */}
          <div className="animate-pop" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-end mb-4">
              <div>
                <label className="block text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">
                  Step 01
                </label>
                <h3 className="text-xl font-bold text-gray-800">수업반 선택</h3>
              </div>
              {isLoadingTabs && (
                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium animate-pulse">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                  목록 갱신 중...
                </div>
              )}
            </div>
            
            {isManualInput ? (
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="반 이름을 직접 입력하세요 (예: 서울고)"
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  disabled={!hasSheetId}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-lg font-semibold"
                />
                <button 
                  type="button"
                  onClick={() => setIsManualInput(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-indigo-600 hover:underline font-bold"
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTabName(tab)}
                      className={`group relative px-4 py-6 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center text-center gap-2
                        ${tabName === tab 
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02] z-10' 
                          : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-indigo-200 hover:bg-white hover:text-indigo-600 hover:shadow-lg'}`}
                    >
                      <span className={`text-base font-extrabold transition-colors ${tabName === tab ? 'text-white' : 'text-gray-700 group-hover:text-indigo-600'}`}>
                        {tab}
                      </span>
                      {tabName === tab ? (
                        <div className="bg-white/20 rounded-full p-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div className="h-6 w-6"></div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex justify-center">
                   <button 
                     type="button"
                     onClick={() => {
                       setIsManualInput(true);
                       setTabName('');
                     }}
                     className="text-xs text-gray-400 hover:text-indigo-600 underline font-semibold transition-colors"
                   >
                     목록에 찾는 반이 없나요?
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Name Entry */}
          <div className="animate-pop" style={{ animationDelay: '0.2s' }}>
            <div className="mb-4">
              <label className="block text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">
                Step 02
              </label>
              <h3 className="text-xl font-bold text-gray-800">이름 입력</h3>
            </div>
            <input
              type="text"
              id="name"
              required
              placeholder="예: 홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!hasSheetId}
              className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 text-xl font-bold text-gray-800 placeholder:text-gray-300"
            />
          </div>

          {/* Submit Button */}
          <div className="animate-pop" style={{ animationDelay: '0.3s' }}>
            <Button 
              type="submit" 
              fullWidth 
              disabled={!hasSheetId || !tabName || !name} 
              className="text-xl py-6 shadow-2xl shadow-indigo-200 rounded-3xl hover:-translate-y-1 active:scale-95 transition-all"
            >
              {hasSheetId ? '시험지 생성하기' : '선생님 설정 대기 중'}
            </Button>
            <p className="text-center text-[11px] text-gray-400 mt-4 font-medium italic">
              * 생성 버튼을 누르면 AI가 단어를 선별하여 시험을 준비합니다.
            </p>
          </div>
        </form>
      </div>
      
      {/* Review Footer */}
      <div className="mt-10 w-full max-w-xl animate-pop" style={{ animationDelay: '0.4s' }}>
        <button 
          onClick={() => onChangeView(AppView.INCORRECT_NOTE)}
          className="w-full group flex items-center justify-between px-8 py-5 bg-white border border-red-50 text-red-600 rounded-3xl shadow-lg hover:shadow-xl hover:bg-red-50/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <span className="font-extrabold text-lg">나의 오답 노트 확인</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5 opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Landing;