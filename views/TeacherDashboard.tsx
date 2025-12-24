import React, { useEffect, useState, useMemo } from 'react';
import { QuizResult } from '../types';
import Button from '../components/Button';
import { fetchSheetTabs } from '../services/sheetService';

const STORAGE_KEY = 'vocamaster_results';
const SHEET_ID_KEY = 'vocamaster_sheet_id';
const SCRIPT_URL_KEY = 'vocamaster_script_url';
const BASE_URL_KEY = 'vocamaster_base_url';

const TeacherDashboard: React.FC = () => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [sheetId, setSheetId] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    // 1. Load Results
    const storedResults = localStorage.getItem(STORAGE_KEY);
    if (storedResults) {
      try {
        const parsed = JSON.parse(storedResults) as QuizResult[];
        parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setResults(parsed);
      } catch (e) {
        console.error("Failed to parse results");
      }
    }

    // 2. Load Persisted Configs
    const storedSheetId = localStorage.getItem(SHEET_ID_KEY);
    const storedScriptUrl = localStorage.getItem(SCRIPT_URL_KEY);
    const storedBaseUrl = localStorage.getItem(BASE_URL_KEY);

    if (storedSheetId) {
      setSheetId(storedSheetId);
      loadTabs(storedSheetId);
    }
    if (storedScriptUrl) setScriptUrl(storedScriptUrl);
    
    if (storedBaseUrl) {
      setBaseUrl(storedBaseUrl);
    } else {
      const currentHref = window.location.origin + window.location.pathname;
      setBaseUrl(currentHref);
    }
  }, []);

  const loadTabs = async (id: string) => {
    if (!id) return;
    try {
      const tabs = await fetchSheetTabs(id);
      setAvailableTabs(tabs);
    } catch (e) {
      console.error("Failed to load tabs");
    }
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    let cleanId = sheetId.trim();
    const urlMatch = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) cleanId = urlMatch[1];
    
    localStorage.setItem(SHEET_ID_KEY, cleanId);
    setSheetId(cleanId);
    
    if (scriptUrl.trim()) {
      localStorage.setItem(SCRIPT_URL_KEY, scriptUrl.trim());
    } else {
      localStorage.removeItem(SCRIPT_URL_KEY);
    }

    if (baseUrl.trim()) {
      localStorage.setItem(BASE_URL_KEY, baseUrl.trim());
    }

    loadTabs(cleanId);

    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }, 500);
  };

  // Stable shareUrl generation
  const shareUrl = useMemo(() => {
    if (!sheetId) return "";
    const params = new URLSearchParams();
    params.set('sheet_id', sheetId.trim());
    if (scriptUrl) params.set('script', scriptUrl.trim());
    if (selectedClass) params.set('class_name', selectedClass);
    params.set('date', new Date().toISOString().split('T')[0]);
    
    const qs = params.toString();
    const cleanBase = baseUrl.trim() || (window.location.origin + window.location.pathname);
    const connector = cleanBase.includes('?') ? '&' : '?';
    
    return `${cleanBase}${connector}${qs}`;
  }, [sheetId, scriptUrl, selectedClass, baseUrl]);

  // Stable QR URL generation
  const qrUrl = useMemo(() => {
    if (!shareUrl) return "";
    return `https://quickchart.io/qr?text=${encodeURIComponent(shareUrl)}&size=400&margin=2&ecLevel=H`;
  }, [shareUrl]);

  // Handle QR loading state
  useEffect(() => {
    if (qrUrl) {
      setQrLoading(true);
      setQrError(false);
    }
  }, [qrUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const clearData = () => {
    if (confirm("이 브라우저에 저장된 모든 학생 응시 기록을 삭제하시겠습니까?")) {
      localStorage.removeItem(STORAGE_KEY);
      setResults([]);
    }
  };

  const isDevelopmentUrl = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('aistudio.google.com');

  return (
    <div className="animate-pop space-y-8 pb-20">
      <div className={`bg-white rounded-3xl shadow-xl border-2 transition-all duration-300 p-8 ${isSaved ? 'border-green-400 ring-4 ring-green-50' : 'border-indigo-50'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2">
            ⚙️ 환경 설정
          </h3>
          {isSaved && <span className="text-green-600 font-bold text-sm flex items-center gap-1 animate-bounce">✅ 저장되었습니다</span>}
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-gray-500 mb-1 uppercase tracking-tighter">구글 시트 ID</label>
              <input 
                type="text" 
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-mono text-sm transition-all"
                placeholder="시트 ID"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-500 mb-1 uppercase tracking-tighter">Apps Script URL</label>
              <input 
                type="text" 
                value={scriptUrl}
                onChange={(e) => setScriptUrl(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-mono text-sm transition-all"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-100">
            <label className="block text-sm font-black text-amber-800 mb-1 uppercase tracking-tighter">학생 접속 주소 (Base URL)</label>
            <input 
              type="text" 
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-amber-200 outline-none font-mono text-sm ${isDevelopmentUrl ? 'border-amber-300 bg-white' : 'border-gray-100 bg-white'}`}
              placeholder="https://..."
            />
          </div>

          <Button onClick={handleSaveConfig} fullWidth disabled={isSaving} className={`py-4 shadow-xl transition-all ${isSaved ? 'bg-green-600' : 'bg-indigo-600'}`}>
            {isSaving ? '저장 중...' : (isSaved ? '✅ 설정 저장 완료' : '설정 저장하기')}
          </Button>

          {sheetId && (
            <div className="mt-10 border-t-2 border-dashed border-gray-100 pt-10 animate-pop">
               <h4 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">🚀 학생 배포 및 QR 코드</h4>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100">
                      <div className="mb-4">
                        <label className="block text-xs font-black text-indigo-800 mb-2 uppercase tracking-widest">배포할 수업반 선택 (선택사항)</label>
                        <select 
                          value={selectedClass} 
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl text-indigo-900 font-bold outline-none focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="">-- 반을 선택하세요 (전체 노출) --</option>
                          {availableTabs.map(tab => (
                            <option key={tab} value={tab}>{tab}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-indigo-400 mt-2 font-bold leading-tight">
                          {selectedClass 
                            ? `현재 [${selectedClass}] 반 전용 모드입니다. 학생은 이름만 쓰면 바로 시작합니다.` 
                            : '현재 전체 모드입니다. 학생은 접속 후 자신의 반을 직접 골라야 합니다.'}
                        </p>
                      </div>

                      <label className="block text-xs font-black text-indigo-800 mb-2 uppercase tracking-widest">초대 링크</label>
                      <div className="flex flex-col gap-2">
                          <input readOnly value={shareUrl} className="w-full px-4 py-3 text-xs bg-white border-2 border-indigo-100 rounded-xl text-indigo-900 font-mono shadow-inner" />
                          <div className="flex gap-2">
                            <Button variant="secondary" size="md" onClick={handleCopyLink} className="flex-1 font-bold">
                              {isCopied ? '복사됨!' : '링크 복사'}
                            </Button>
                            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors flex items-center justify-center shadow-lg">테스트</a>
                          </div>
                      </div>
                    </div>
                  </div>

                  {/* QR SECTION - ALWAYS VISIBLE */}
                  <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border-4 border-dotted border-gray-200 rounded-[3rem] animate-pop relative min-h-[460px]">
                    {qrLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 z-10 rounded-[3rem]">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <span className="text-sm font-black text-indigo-600">QR 갱신 중...</span>
                        </div>
                      </div>
                    )}
                    
                    {qrError && !qrLoading && (
                       <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10 rounded-[3rem] p-10 text-center">
                         <p className="text-red-600 font-bold">QR 이미지를 불러올 수 없습니다.</p>
                       </div>
                    )}

                    <div className="bg-white p-6 rounded-3xl shadow-2xl border-2 border-gray-100 mb-6 group transition-all duration-500 transform hover:scale-105">
                      {qrUrl && (
                        <img 
                          src={qrUrl} 
                          alt="QR" 
                          className={`w-64 h-64 md:w-80 md:h-80 transition-opacity duration-300 ${qrLoading ? 'opacity-0' : 'opacity-100'}`}
                          onLoad={() => setQrLoading(false)} 
                          onError={() => { setQrLoading(false); setQrError(true); }} 
                        />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-black text-gray-800 tracking-tight">
                        {selectedClass ? `[${selectedClass}] 반` : '전체 학생'} 단어시험
                      </p>
                      <p className="text-sm font-bold text-indigo-600 mt-1">이 QR 코드를 빔 프로젝터로 띄워주세요.</p>
                      {!selectedClass && <p className="text-[11px] text-gray-400 mt-2 font-medium">※ 반을 선택하면 학생들이 더 빠르게 시험을 시작할 수 있습니다.</p>}
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
        <div className="p-8 border-b-2 border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-800">실시간 응시 현황</h2>
          <button onClick={clearData} className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-black transition-colors">데이터 리셋</button>
        </div>
        <div className="overflow-x-auto">
          {results.length === 0 ? (
            <div className="p-20 text-center text-gray-400 font-bold">아직 응시 기록이 없습니다.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">수업 / 날짜</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">학생</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">점수</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">기록</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/40">
                    <td className="px-8 py-5">
                      <div className="text-sm font-black text-gray-800">{r.className}</div>
                      <div className="text-[10px] text-gray-400 font-bold">{r.date}</div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-gray-700">{r.studentName}</td>
                    <td className="px-8 py-5 text-lg font-black text-indigo-600">{r.score} <span className="text-gray-300 text-xs font-normal">/ {r.totalQuestions}</span></td>
                    <td className="px-8 py-5 text-xs font-mono font-bold text-gray-400 text-right">{formatTime(r.timeTakenSeconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;