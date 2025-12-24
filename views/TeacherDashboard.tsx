import React, { useEffect, useState } from 'react';
import { QuizResult } from '../types';
import Button from '../components/Button';

const STORAGE_KEY = 'vocamaster_results';
const SHEET_ID_KEY = 'vocamaster_sheet_id';
const SCRIPT_URL_KEY = 'vocamaster_script_url';

const TeacherDashboard: React.FC = () => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [sheetId, setSheetId] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrLoading, setQrLoading] = useState(true);

  useEffect(() => {
    // Load Results
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

    // Load Sheet ID and Script URL
    const storedSheetId = localStorage.getItem(SHEET_ID_KEY);
    if (storedSheetId) setSheetId(storedSheetId);

    const storedScriptUrl = localStorage.getItem(SCRIPT_URL_KEY);
    if (storedScriptUrl) setScriptUrl(storedScriptUrl);

    // Initialize Base URL
    const currentHref = window.location.origin + window.location.pathname;
    setBaseUrl(currentHref);
  }, []);

  const handleSaveConfig = () => {
    let cleanId = sheetId.trim();
    const urlMatch = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      cleanId = urlMatch[1];
    }
    
    localStorage.setItem(SHEET_ID_KEY, cleanId);
    setSheetId(cleanId);
    
    if (scriptUrl.trim()) {
      localStorage.setItem(SCRIPT_URL_KEY, scriptUrl.trim());
    } else {
      localStorage.removeItem(SCRIPT_URL_KEY);
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const getShareUrl = () => {
    const params = new URLSearchParams();
    if (sheetId) params.set('sheet_id', sheetId.trim());
    if (scriptUrl) params.set('script', scriptUrl.trim());
    
    const qs = params.toString();
    const cleanBase = baseUrl.trim();
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

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const clearData = () => {
    if (confirm("이 브라우저에 저장된 모든 학생 응시 기록을 삭제하시겠습니까?")) {
      localStorage.removeItem(STORAGE_KEY);
      setResults([]);
    }
  };

  const shareUrl = getShareUrl();
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="animate-pop space-y-8 pb-10">
      {/* Settings Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-8">
        <h3 className="text-xl font-bold text-indigo-900 mb-6 flex items-center gap-2">
          ⚙️ 환경 설정
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">구글 시트 ID</label>
            <input 
              type="text" 
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
              placeholder="시트 URL에서 ID를 복사해 붙여넣으세요"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Apps Script URL (자동 저장용)</label>
            <input 
              type="text" 
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
              placeholder="https://script.google.com/..."
            />
          </div>

          <Button onClick={handleSaveConfig} fullWidth className="py-3">
            {isSaved ? '저장 완료!' : '설정 저장'}
          </Button>

          {sheetId && (
            <div className="mt-8 border-t border-gray-100 pt-8">
               <h4 className="text-md font-bold text-gray-800 mb-4">학생 배포</h4>
               
               <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mb-4">
                 <label className="block text-xs font-black text-indigo-800 mb-2 uppercase tracking-widest">초대 링크</label>
                 <div className="flex gap-2">
                    <input
                       readOnly 
                       value={shareUrl} 
                       className="flex-1 px-3 py-2 text-xs bg-white border border-indigo-200 rounded-lg text-gray-600 focus:outline-none font-mono"
                    />
                    <Button variant="secondary" size="sm" onClick={handleCopyLink} className="whitespace-nowrap px-4">
                      {isCopied ? '복사됨' : '복사'}
                    </Button>
                 </div>
               </div>

               <div className="text-center">
                 <Button onClick={() => { setShowQr(!showQr); setQrLoading(true); }} variant="secondary" className="mb-4">
                   {showQr ? 'QR 가리기' : '수업용 QR 코드 생성'}
                 </Button>
                 
                 {showQr && (
                   <div className="flex flex-col items-center justify-center p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl animate-pop relative min-h-[300px]">
                     {qrLoading && (
                       <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 z-10 rounded-2xl">
                         <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                       </div>
                     )}
                     <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 mb-4">
                       <img 
                         src={qrUrl} 
                         alt="QR" 
                         className="w-48 h-48 md:w-64 md:h-64"
                         onLoad={() => setQrLoading(false)}
                         onError={() => {
                           setQrLoading(false);
                           alert("QR 코드를 생성할 수 없습니다. 네트워크 연결을 확인하세요.");
                         }}
                       />
                     </div>
                     <p className="text-sm font-bold text-gray-600">카메라로 스캔하여 시험 시작</p>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">응시 기록</h2>
          <button onClick={clearData} className="text-red-500 hover:text-red-700 text-xs font-bold underline">기록 전체 삭제</button>
        </div>
        <div className="overflow-x-auto">
          {results.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-medium">기록이 없습니다.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">날짜/반</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">이름</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">점수</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase">시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-800">{r.className}</div>
                      <div className="text-[10px] text-gray-400">{r.date}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{r.studentName}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-indigo-600">{r.score}</span>
                      <span className="text-gray-300 text-xs mx-1">/</span>
                      <span className="text-gray-400 text-xs">{r.totalQuestions}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">{formatTime(r.timeTakenSeconds)}</td>
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