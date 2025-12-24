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
  const [useDropdown, setUseDropdown] = useState(true);
  const [manualMode, setManualMode] = useState<'date' | 'text'>('date');

  useEffect(() => {
    const SHEET_KEY = 'vocamaster_sheet_id';
    const SCRIPT_KEY = 'vocamaster_script_url';
    
    // 1. Check URL parameters
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
          console.warn("Invalid script url param, saving as is");
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
        setTabName(tabs[0]); 
        setUseDropdown(true);
      } else {
        setUseDropdown(false);
        setManualMode('date');
      }
    } catch (e) {
      console.error(e);
      setUseDropdown(false);
      setManualMode('date');
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-50">
        <div className="bg-indigo-600 p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">PIF영어학원 단어시험</h2>
          <p className="text-indigo-100 font-medium">단어 알면 해석된다!</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
            <div className="flex flex-col mb-2">
              <label htmlFor="tabName" className="block text-sm font-semibold text-gray-700">
                시험일 선택
              </label>
              <p className="text-[11px] text-indigo-500 font-medium">
                (재시험자는 원래 수업이 진행된 날짜를 선택)
              </p>
            </div>
            
            {isLoadingTabs ? (
              <div className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 text-gray-500 text-sm flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-indigo-600 rounded-full animate-spin"></div>
                시트에서 날짜 목록을 불러오는 중...
              </div>
            ) : useDropdown && availableTabs.length > 0 ? (
              <div className="relative">
                <select
                  id="tabName"
                  required
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  disabled={!hasSheetId}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white cursor-pointer"
                >
                  {availableTabs.map((tab) => (
                    <option key={tab} value={tab}>{tab}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type={manualMode}
                  id="tabName"
                  required
                  placeholder={manualMode === 'text' ? "예: Day1, 05-01..." : ""}
                  value={tabName}
                  onChange={(e) => setTabName(e.target.value)}
                  disabled={!hasSheetId}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {!isLoadingTabs && hasSheetId && (
                   <div className="flex justify-between items-center mt-1">
                      <p className="text-[11px] text-orange-500">
                        {manualMode === 'date' ? '달력에서 날짜를 선택하세요.' : '정확한 탭 이름을 입력하세요.'}
                      </p>
                      <button 
                        type="button"
                        onClick={() => setManualMode(manualMode === 'date' ? 'text' : 'date')}
                        className="text-[10px] text-indigo-600 underline"
                      >
                        입력 방식 변경
                      </button>
                   </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
              학생 이름
            </label>
            <input
              type="text"
              id="name"
              required
              placeholder="차은우"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!hasSheetId}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <Button type="submit" fullWidth disabled={!hasSheetId} className="text-lg py-3 shadow-indigo-200">
            {hasSheetId ? '시험 시작' : '설정 대기 중'}
          </Button>
        </form>
      </div>
      
      <div className="mt-6 w-full max-w-md">
        <Button 
          variant="secondary" 
          fullWidth 
          onClick={() => onChangeView(AppView.INCORRECT_NOTE)}
          className="flex items-center justify-center gap-2 border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          틀린 단어 복습하기
        </Button>
      </div>
    </div>
  );
};

export default Landing;