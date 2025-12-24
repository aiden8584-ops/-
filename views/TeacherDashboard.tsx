import React, { useEffect, useState } from 'react';
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
  const [showQr, setShowQr] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);
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

  // Reset QR state when parameters change
  useEffect(() => {
    if (showQr) {
      setQrLoading(true);
      setQrError(false);
    }
  }, [baseUrl, sheetId, scriptUrl, showQr, selectedClass]);

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

  const getShareUrl = () => {
    const params = new URLSearchParams();
    if (sheetId) params.set('sheet_id', sheetId.trim());
    if (scriptUrl) params.set('script', scriptUrl.trim());
    // Add selected class to the link so student skips selection
    if (selectedClass) params.set('class_name', selectedClass);
    // Add today's date automatically
    params.set('date', new Date().toISOString().split('T')[0]);
    
    const qs = params.toString();
    const cleanBase = baseUrl.trim() || (window.location.origin + window.location.pathname);
    const connector = cleanBase.includes('?') ? '&' : '?';
    
    return qs ? `${cleanBase}${connector}${qs}` : cleanBase;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
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

  const shareUrl = getShareUrl();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(shareUrl)}&rand=${Date.now()}`;

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
               <h4 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">🚀 학생 배포 도구</h4>
               
               <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100 mb-6">
                 <div className="mb-4">
                   <label className="block text-xs font-black text-indigo-800 mb-2 uppercase tracking-widest">배포할 수업반 선택 (필수)</label>
                   <select 
                     value={selectedClass} 
                     onChange={(e) => setSelectedClass(e.target.value)}
                     className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl text-indigo-900 font-bold outline-none focus:ring-4 focus:ring-indigo-100"
                   >
                     <option value="">-- 반을 선택하세요 --</option>
                     {availableTabs.map(tab => (
                       <option key={tab} value={tab}>{tab}</option>
                     ))}
                   </select>
                   <p className="text-[10px] text-indigo-400 mt-2 font-bold">* 반을 선택하면 학생들이 QR 촬영 시 반 선택 과정을 건너뛰고 바로 이름 입력으로 넘어갑니다.</p>
                 </div>

                 <label className="block text-xs font-black text-indigo-800 mb-2 uppercase tracking-widest">초대 링크</label>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <input readOnly value={shareUrl} className="flex-1 px-4 py-3 text-xs bg-white border-2 border-indigo-100 rounded-xl text-indigo-900 font-mono shadow-inner" />
                    <div className="flex gap-2">
                      <Button variant="secondary" size="md" onClick={handleCopyLink} className="whitespace-nowrap px-6 flex-1 font-bold">
                        {isCopied ? '복사됨!' : '복사'}
                      </Button>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-indigo-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors flex items-center justify-center whitespace-nowrap shadow-lg">테스트</a>
                    </div>
                 </div>
               </div>

               <div className="text-center">
                 <Button onClick={() => setShowQr(!showQr)} disabled={!selectedClass} variant="secondary" className="mb-6 px-10 rounded-full border-2 border-indigo-200">
                   {!selectedClass ? '반을 먼저 선택해 주세요' : (showQr ? 'QR 코드 닫기' : `📢 ${selectedClass} 반 QR 코드 생성`)}
                 </Button>
                 
                 {showQr && selectedClass && (
                   <div className="flex flex-col items-center justify-center p-10 bg-gray-50 border-4 border-dotted border-gray-200 rounded-[3rem] animate-pop relative min-h-[400px]">
                     {qrLoading && (
                       <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 z-10 rounded-[3rem]">
                         <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <span className="text-sm font-black text-indigo-600">QR 생성 중...</span>
                         </div>
                       </div>
                     )}
                     <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-gray-100 mb-6 group transition-transform hover:scale-105">
                       <img src={qrUrl} alt="QR" className="w-56 h-56 md:w-72 md:h-72" onLoad={() => setQrLoading(false)} onError={() => { setQrLoading(false); setQrError(true); }} />
                     </div>
                     <p className="text-lg font-black text-gray-800 tracking-tight">[{selectedClass}] 반 단어시험 시작</p>
                     <p className="text-xs text-gray-400 mt-1">이 화면을 빔 프로젝터로 띄워주세요.</p>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
        <div className="p-8 border-b-2 border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-black text-gray-800">최근 응시 기록</h2>
          <button onClick={clearData} className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-black transition-colors">기록 전체 삭제</button>
        </div>
        <div className="overflow-x-auto">
          {results.length === 0 ? (
            <div className="p-20 text-center text-gray-400 font-bold">아직 응시 기록이 없습니다.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase">날짜 / 반</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase">이름</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase">점수</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase text-right">소요 시간</th>
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