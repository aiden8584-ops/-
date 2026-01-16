
import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/Button';
import { AppView } from '../types';
import { fetchSheetTabs } from '../services/sheetService';
import { APP_CONFIG } from '../config';

interface LandingProps {
  onStart: (name: string, className: string, date: string) => void;
  onChangeView: (view: AppView) => void;
}

const Landing: React.FC<LandingProps> = ({ onStart, onChangeView }) => {
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasSheetId, setHasSheetId] = useState(false);
  const [isUrlInitialized, setIsUrlInitialized] = useState(false);
  
  const PRESET_TABS = ['예비고1', '예비고2', '예비고3'];
  const [availableTabs, setAvailableTabs] = useState<string[]>(PRESET_TABS);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const SHEET_KEY = 'vocamaster_sheet_id';
    const SCRIPT_KEY = 'vocamaster_script_url';
    
    const params = new URLSearchParams(window.location.search);
    const urlSheetId = params.get('sheet_id');
    const urlScript = params.get('script');
    const urlClass = params.get('class_name');
    const urlDate = params.get('date');

    if (urlSheetId) {
      localStorage.setItem(SHEET_KEY, urlSheetId);
      setHasSheetId(true);
      loadTabs(urlSheetId);
    } else {
      const storedSheetId = localStorage.getItem(SHEET_KEY);
      if (storedSheetId) {
        setHasSheetId(true);
        loadTabs(storedSheetId);
      } else if (APP_CONFIG.sheetId) {
        // Fallback to Hardcoded Config
        setHasSheetId(true);
        loadTabs(APP_CONFIG.sheetId);
      }
    }

    if (urlScript) {
      localStorage.setItem(SCRIPT_KEY, urlScript.trim());
    }

    if (urlDate) {
      setTestDate(urlDate);
    }

    if (urlClass) {
      setClassName(urlClass);
      setIsUrlInitialized(true);
      setTimeout(() => nameInputRef.current?.focus(), 500);
    }
    
    // Clean URL only if parameters existed, to keep the address bar clean
    if (urlSheetId || urlScript || urlClass) {
       window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadTabs = async (id: string) => {
    setIsLoadingTabs(true);
    try {
      const tabs = await fetchSheetTabs(id);
      if (tabs && tabs.length > 0) {
        setAvailableTabs(tabs);
      }
    } catch (e) {
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
          <h2 className="text-3xl font-black text-white mb-2 relative z-10 tracking-tight">PIF영어학원 단어시험</h2>
          <p className="text-indigo-100 font-bold relative z-10 text-sm">
            {isUrlInitialized ? `[${className}] 반 시험 준비 완료` : '스마트 단어 테스트 시스템'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          {!hasSheetId ? (
             <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-8 text-center animate-pop">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-amber-900 mb-2">시험지 정보가 없습니다</h3>
              <p className="text-amber-700 text-sm mb-6 leading-relaxed">
                선생님께 전달받은 <strong>시험 링크(URL)</strong>로 접속해야<br/>시험을 볼 수 있습니다.<br/><br/>
                <span className="text-xs text-amber-500">주소창을 확인하거나, 링크를 다시 클릭해주세요.</span>
              </p>
              <button 
                type="button"
                onClick={() => onChangeView(AppView.TEACHER_LOGIN)}
                className="text-xs text-amber-600 font-bold underline hover:text-amber-800"
              >
                선생님이신가요? 설정하러 가기
              </button>
            </div>
          ) : (
            <>
              {!isUrlInitialized ? (
                <div className="animate-pop" style={{ animationDelay: '0.1s' }}>
                  <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Step 01. 수업반 선택</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {availableTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setClassName(tab)}
                        className={`px-3 py-4 rounded-2xl border-2 transition-all duration-300 text-sm font-black h-16 flex items-center justify-center text-center leading-tight
                          ${className === tab 
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl scale-105' 
                            : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-indigo-200'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">배정된 수업 정보</p>
                    <p className="text-xl font-black text-indigo-900">{className}</p>
                    <p className="text-xs font-bold text-indigo-500">오늘의 단어로 테스트를 시작합니다.</p>
                  </div>
                  <button type="button" onClick={() => setIsUrlInitialized(false)} className="text-xs font-black text-indigo-600 underline">변경하기</button>
                </div>
              )}

              <div className="animate-pop" style={{ animationDelay: '0.2s' }}>
                <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">Step 02. 학생 정보 입력</label>
                <div className="space-y-3">
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    placeholder="이름을 입력하세요"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-6 py-5 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-xl font-black text-gray-900"
                  />
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <span className="text-gray-400 font-bold text-sm">시험 날짜</span>
                    </div>
                    <input 
                      type="date"
                      required
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      className="w-full pl-24 pr-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-bold text-gray-800"
                    />
                  </div>
                </div>
              </div>

              <div className="animate-pop pt-4" style={{ animationDelay: '0.3s' }}>
                <Button type="submit" fullWidth disabled={!className || !name || !testDate} className="text-xl py-6 shadow-2xl shadow-indigo-200 rounded-[1.5rem] font-black">
                  시험 시작하기
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default Landing;
