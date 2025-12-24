import React, { useEffect, useState } from 'react';
import { QuizResult } from '../types';
import Button from '../components/Button';

const STORAGE_KEY = 'vocamaster_results';
const SHEET_ID_KEY = 'vocamaster_sheet_id';
const SCRIPT_URL_KEY = 'vocamaster_script_url';
const BASE_URL_KEY = 'vocamaster_base_url';

const TeacherDashboard: React.FC = () => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [sheetId, setSheetId] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  
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

    if (storedSheetId) setSheetId(storedSheetId);
    if (storedScriptUrl) setScriptUrl(storedScriptUrl);
    
    if (storedBaseUrl) {
      setBaseUrl(storedBaseUrl);
    } else {
      const currentHref = window.location.origin + window.location.pathname;
      setBaseUrl(currentHref);
    }
  }, []);

  // Reset QR state when parameters change
  useEffect(() => {
    if (showQr) {
      setQrLoading(true);
      setQrError(false);
    }
  }, [baseUrl, sheetId, scriptUrl, showQr]);

  const handleSaveConfig = () => {
    setIsSaving(true);
    
    // Process Sheet ID (Extract if full URL provided)
    let cleanId = sheetId.trim();
    const urlMatch = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      cleanId = urlMatch[1];
    }
    
    // Save to LocalStorage
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

    // Feedback effect
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
      {/* Settings Section */}
      <div className={`bg-white rounded-3xl shadow-xl border-2 transition-all duration-300 p-8 ${isSaved ? 'border-green-400 ring-4 ring-green-50' : 'border-indigo-50'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.894.15c.542.09.94.56.94 1.109v1.094c0 .55-.398 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527a1.125 1.125 0 01-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            환경 설정
          </h3>
          {isSaved && <span className="text-green-600 font-bold text-sm flex items-center gap-1 animate-bounce">✅ 저장되었습니다</span>}
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-black text-gray-500 mb-1 uppercase tracking-tighter">구글 시트 ID</label>
            <input 
              type="text" 
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-mono text-sm transition-all"
              placeholder="시트 URL에서 ID를 복사해 붙여넣으세요"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-gray-500 mb-1 uppercase tracking-tighter">Apps Script URL (결과 자동 저장)</label>
            <input 
              type="text" 
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none font-mono text-sm transition-all"
              placeholder="https://script.google.com/..."
            />
          </div>

          <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-100">
            <label className="block text-sm font-black text-amber-800 mb-1 uppercase tracking-tighter">학생 접속 주소 (Base URL)</label>
            <p className="text-xs text-amber-700 mb-3 font-medium">학생들이 접속할 웹사이트의 메인 주소입니다.</p>
            <input 
              type="text" 
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-amber-200 outline-none font-mono text-sm ${isDevelopmentUrl ? 'border-amber-300 bg-white' : 'border-gray-100 bg-white'}`}
              placeholder="https://your-app-name.vercel.app"
            />
            {isDevelopmentUrl && (
              <div className="flex items-start gap-2 mt-3 text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mt-0.5 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                <p className="text-[11px] font-bold leading-tight">주의: 현재 주소는 미리보기 환경입니다. 실제 학생들이 접속할 웹사이트 주소를 입력하고 저장해 주세요.</p>
              </div>
            )}
          </div>

          <Button 
            onClick={handleSaveConfig} 
            fullWidth 
            disabled={isSaving}
            className={`py-4 shadow-xl transition-all ${isSaved ? 'bg-green-600' : 'bg-indigo-600'}`}
          >
            {isSaving ? '저장 중...' : (isSaved ? '✅ 설정 저장 완료' : '설정 저장하기')}
          </Button>

          {sheetId && (
            <div className="mt-10 border-t-2 border-dashed border-gray-100 pt-10 animate-pop">
               <h4 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                 🚀 학생 배포 도구
               </h4>
               
               <div className="bg-indigo-50 p-6 rounded-3xl border-2 border-indigo-100 mb-6">
                 <label className="block text-xs font-black text-indigo-800 mb-2 uppercase tracking-widest">실시간 초대 링크</label>
                 <div className="flex flex-col sm:flex-row gap-2">
                    <input
                       readOnly 
                       value={shareUrl} 
                       className="flex-1 px-4 py-3 text-xs bg-white border-2 border-indigo-100 rounded-xl text-indigo-900 focus:outline-none font-mono overflow-x-auto shadow-inner"
                    />
                    <div className="flex gap-2">
                      <Button variant="secondary" size="md" onClick={handleCopyLink} className="whitespace-nowrap px-6 flex-1 font-bold">
                        {isCopied ? '복사됨!' : '링크 복사'}
                      </Button>
                      <a 
                        href={shareUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-indigo-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors flex items-center justify-center whitespace-nowrap shadow-lg"
                      >
                        테스트 접속
                      </a>
                    </div>
                 </div>
               </div>

               <div className="text-center">
                 <Button onClick={() => setShowQr(!showQr)} variant="secondary" className="mb-6 px-10 rounded-full border-2 border-indigo-200">
                   {showQr ? 'QR 코드 닫기' : '📣 수업용 QR 코드 생성'}
                 </Button>
                 
                 {showQr && (
                   <div className="flex flex-col items-center justify-center p-10 bg-gray-50 border-4 border-dotted border-gray-200 rounded-[3rem] animate-pop relative min-h-[400px]">
                     {qrLoading && (
                       <div className="absolute inset-0 flex items-center justify-center bg-gray-50/90 z-10 rounded-[3rem]">
                         <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <span className="text-sm font-black text-indigo-600 tracking-tighter">QR 코드를 생성하고 있습니다...</span>
                         </div>
                       </div>
                     )}
                     
                     {qrError && (
                       <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10 rounded-[3rem] p-10 text-center">
                         <div className="flex flex-col items-center gap-4">
                            <p className="text-red-600 font-bold">QR 코드 로드에 실패했습니다.</p>
                            <Button onClick={() => { setQrError(false); setQrLoading(true); }} size="sm" variant="danger">다시 시도</Button>
                         </div>
                       </div>
                     )}

                     <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-gray-100 mb-6 group transition-transform hover:scale-105">
                       <img 
                         src={qrUrl} 
                         alt="QR" 
                         className="w-56 h-56 md:w-72 md:h-72"
                         onLoad={() => setQrLoading(false)}
                         onError={() => {
                           setQrLoading(false);
                           setQrError(true);
                         }}
                       />
                     </div>
                     <p className="text-lg font-black text-gray-800 tracking-tight">QR 코드를 스캔하여 단어시험 시작</p>
                     <p className="text-xs text-gray-400 mt-1">이 화면을 빔 프로젝터로 띄워주세요.</p>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
        <div className="p-8 border-b-2 border-gray-50 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-800">최근 응시 기록</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">학생들의 실시간 시험 현황입니다.</p>
          </div>
          <button onClick={clearData} className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-black transition-colors">
            기록 전체 삭제
          </button>
        </div>
        <div className="overflow-x-auto">
          {results.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-3">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
               </div>
               <p className="text-gray-400 font-bold">아직 응시 기록이 없습니다.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">날짜 / 수업반</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">학생 이름</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">점수</th>
                  <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">소요 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/40 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="text-sm font-black text-gray-800">{r.className}</div>
                      <div className="text-[10px] text-gray-400 font-bold mt-0.5">{r.date}</div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-gray-700">{r.studentName}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black ${r.score === r.totalQuestions ? 'text-indigo-600' : 'text-gray-800'}`}>{r.score}</span>
                        <span className="text-gray-300 text-sm font-medium">/</span>
                        <span className="text-gray-400 text-sm font-bold">{r.totalQuestions}</span>
                        {r.score === r.totalQuestions && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md font-black">PERFECT</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-xs font-mono font-bold text-gray-400">{formatTime(r.timeTakenSeconds)}</td>
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