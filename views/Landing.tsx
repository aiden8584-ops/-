import React, { useState, useEffect } from 'react';
import Button from '../components/Button';
import { AppView } from '../types';
import { fetchSheetTabs } from '../services/sheetService';

interface LandingProps {
  onStart: (name: string, className: string, date: string) => void;
  onChangeView: (view: AppView) => void;
}

const Landing: React.FC<LandingProps> = ({ onStart, onChangeView }) => {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasSheetId, setHasSheetId] = useState(false);
  
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

    // Load from URL only if they exist (don't wipe existing settings with nulls)
    if (urlSheetId) {
      localStorage.setItem(SHEET_KEY, urlSheetId);
      setHasSheetId(true);
      loadTabs(urlSheetId);
    } else {
      const storedSheetId = localStorage.getItem(SHEET_KEY);
      if (storedSheetId) {
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
          // Check if it looks like base64
          const decoded = atob(cleanScript);
          localStorage.setItem(SCRIPT_KEY, decoded);
        } catch (e) {
          localStorage.setItem(SCRIPT_KEY, cleanScript);
        }
      }
    }
    
    // Clean URL bar to prevent confusion
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
    if (name.trim() && className.trim() && testDate) {
      onStart(name.trim(), className.trim(), testDate);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pop pb-10">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-indigo-50">
        <div className="bg-indigo-600 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-32 h-32 bg-indigo-400 opacity-20 rounded-full blur-xl"></div>
          <h2 className="text-3xl font-black text-white mb-2 relative z-10 tracking-tight">PIF영어학원 단어시험</h2>
          <p className="text-indigo-100 font-bold relative z-10 opacity-90 text-sm">학생 스스로 측정하는 스마트 단어 테스트</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          {!hasSheetId && (
            <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-6 text-sm text-amber-900 animate-pop">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⚠️</span>
                <p className="font-black">선생님 설정이 필요합니다</p>
              </div>
              <p className="mb-4 text-amber-700 leading-tight">관리자가 구글 시트 ID를 설정해야 시험을 시작할 수 있습니다.</p>
              <Button type="button" variant="secondary" fullWidth onClick={() => onChangeView(AppView.TEACHER_LOGIN)} className="rounded-2xl border-amber-200 text-amber-900">관리자 설정하러 가기</Button>
            </div>
          )}

          {/* 1. Date Selection */}
          <div className="animate-pop" style={{ animationDelay: '0.1s' }}>
            <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">Step 01. 언제 시험인가요?</label>
            <input
              type="date"
              required
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-gray-800 font-black text-lg"
            />
          </div>

          {/* 2. Class Selection */}
          <div className="animate-pop" style={{ animationDelay: '0.2s' }}>
            <div className="flex justify-between items-end mb-3">
              <div>
                <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Step 02. 수업반 선택</label>
              </div>
              {isLoadingTabs && <div className="text-[10px] text-indigo-400 font-black animate-pulse bg-indigo-50 px-2 py-1 rounded-md">수업 목록 불러오는 중...</div>}
            </div>
            
            {isManualInput ? (
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="반 이름을 직접 입력하세요"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-black text-lg"
                />
                <button type="button" onClick={() => setIsManualInput(false)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-indigo-600 font-black bg-indigo-50 px-2 py-1 rounded-lg">목록보기</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setClassName(tab)}
                      className={`px-3 py-4 rounded-2xl border-2 transition-all duration-300 text-sm font-black h-16 flex items-center justify-center text-center leading-tight
                        ${className === tab 
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl scale-105 z-10' 
                          : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-indigo-200 hover:bg-white hover:text-indigo-600'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex justify-center">
                   <button type="button" onClick={() => { setIsManualInput(true); setClassName(''); }} className="text-xs text-gray-400 hover:text-indigo-600 underline font-black">내 수업반이 목록에 없나요?</button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Name Entry */}
          <div className="animate-pop" style={{ animationDelay: '0.3s' }}>
            <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">Step 03. 학생 이름</label>
            <input
              type="text"
              required
              placeholder="예: 홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-6 py-5 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-2xl font-black text-gray-900 placeholder:text-gray-300"
            />
          </div>

          <div className="animate-pop pt-4" style={{ animationDelay: '0.4s' }}>
            <Button type="submit" fullWidth disabled={!hasSheetId || !className || !name || !testDate} className="text-xl py-6 shadow-2xl shadow-indigo-200 rounded-[1.5rem] font-black">
              오늘의 시험 시작하기
            </Button>
          </div>
        </form>
      </div>
      
      <div className="mt-10 w-full max-w-xl animate-pop px-4" style={{ animationDelay: '0.5s' }}>
        <button onClick={() => onChangeView(AppView.INCORRECT_NOTE)} className="w-full flex items-center justify-between px-8 py-5 bg-white border-2 border-red-50 text-red-600 rounded-[1.5rem] shadow-lg hover:bg-red-50 transition-all font-black">
          <span className="flex items-center gap-4">
            <div className="bg-red-100 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </div>
            나의 오답 노트 (복습하기)
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={4} stroke="currentColor" className="w-4 h-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>
    </div>
  );
};

export default Landing;