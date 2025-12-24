import React, { useState, useEffect, useRef } from 'react';
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
  // Always default to today's date
  const [testDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasSheetId, setHasSheetId] = useState(false);
  const [isUrlInitialized, setIsUrlInitialized] = useState(false);
  
  const PRESET_TABS = ['서울고', '상문고', '서초고', '예비고1', '예비고2'];
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
      localStorage.setItem(SCRIPT_KEY, urlScript.trim());
    }

    if (urlClass) {
      setClassName(urlClass);
      setIsUrlInitialized(true);
      setTimeout(() => nameInputRef.current?.focus(), 500);
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

  // Format today's date for display
  const displayDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pop pb-10">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-indigo-50">
        <div className="bg-indigo-600 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
          <h2 className="text-3xl font-black text-white mb-2 relative z-10 tracking-tight">PIF영어학원 단어시험</h2>
          <p className="text-indigo-100 font-bold relative z-10 text-sm">
            {isUrlInitialized ? `[${className}] 반 시험 준비 완료` : '스마트 단어 테스트 시스템'}
          </p>
          <div className="mt-4 bg-indigo-500/30 inline-block px-4 py-1 rounded-full text-xs text-white font-bold backdrop-blur-sm">
            📅 {displayDate}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          {!hasSheetId && (
            <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-6 text-sm text-amber-900 animate-pop">
              <p className="font-black mb-2">선생님 설정이 필요합니다</p>
              <Button type="button" variant="secondary" fullWidth onClick={() => onChangeView(AppView.TEACHER_LOGIN)}>설정하러 가기</Button>
            </div>
          )}

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
            <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">Step 02. 학생 이름 입력</label>
            <input
              ref={nameInputRef}
              type="text"
              required
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-6 py-5 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-2xl font-black text-gray-900"
            />
          </div>

          <div className="animate-pop pt-4" style={{ animationDelay: '0.3s' }}>
            <Button type="submit" fullWidth disabled={!className || !name} className="text-xl py-6 shadow-2xl shadow-indigo-200 rounded-[1.5rem] font-black">
              오늘의 시험 시작하기
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Landing;