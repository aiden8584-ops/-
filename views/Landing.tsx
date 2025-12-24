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
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasSheetId, setHasSheetId] = useState(false);
  const [isUrlInitialized, setIsUrlInitialized] = useState(false);
  
  const PRESET_TABS = ['서울고', '상문고', '서초고', '예비고1', '예비고2'];
  const [availableTabs, setAvailableTabs] = useState<string[]>(PRESET_TABS);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);
  
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
      }
    }

    if (urlScript) {
      localStorage.setItem(SCRIPT_KEY, urlScript.trim());
    }

    if (urlClass) setClassName(urlClass);
    if (urlDate) setTestDate(urlDate);

    // If we have class info from URL, focus name input immediately
    if (urlClass && urlDate) {
      setIsUrlInitialized(true);
      setTimeout(() => nameInputRef.current?.focus(), 500);
    }
    
    // Clear sensitive parameters but keep class_name locally if needed
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
          {isUrlInitialized ? (
            <p className="text-indigo-100 font-bold relative z-10 text-sm">[{className}] 반 시험 준비 완료</p>
          ) : (
            <p className="text-indigo-100 font-bold relative z-10 text-sm">학생 스스로 측정하는 스마트 단어 테스트</p>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          {!hasSheetId && (
            <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-6 text-sm text-amber-900 animate-pop">
              <p className="font-black mb-2">선생님 설정이 필요합니다</p>
              <Button type="button" variant="secondary" fullWidth onClick={() => onChangeView(AppView.TEACHER_LOGIN)}>설정하러 가기</Button>
            </div>
          )}

          {/* If initialized by URL, hide Class/Date selection to make it fast */}
          {!isUrlInitialized ? (
            <>
              <div className="animate-pop" style={{ animationDelay: '0.1s' }}>
                <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">Step 01. 시험 날짜</label>
                <input
                  type="date"
                  required
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-black text-lg"
                />
              </div>

              <div className="animate-pop" style={{ animationDelay: '0.2s' }}>
                <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Step 02. 수업반 선택</label>
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
            </>
          ) : (
            <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">배정된 시험 정보</p>
                <p className="text-xl font-black text-indigo-900">{className}</p>
                <p className="text-xs font-bold text-indigo-500">{testDate}</p>
              </div>
              <button type="button" onClick={() => setIsUrlInitialized(false)} className="text-xs font-black text-indigo-600 underline">변경하기</button>
            </div>
          )}

          <div className="animate-pop" style={{ animationDelay: '0.3s' }}>
            <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">Step 03. 학생 이름 입력</label>
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

          <div className="animate-pop pt-4" style={{ animationDelay: '0.4s' }}>
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