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
    // Extract ID if full URL is pasted for Sheet ID
    let cleanId = sheetId.trim();
    const urlMatch = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      cleanId = urlMatch[1];
    }
    
    localStorage.setItem(SHEET_ID_KEY, cleanId);
    setSheetId(cleanId);
    
    // Save Script URL
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
  
  // Validation Logic (Warning only, not blocking)
  const isBlob = baseUrl.startsWith('blob:');
  const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.startsWith('file:');
  const isEditorUrl = 
    baseUrl.includes('aistudio.google.com') || 
    baseUrl.includes('script.google.com') || 
    baseUrl.includes('colab.research.google.com');

  return (
    <div className="animate-pop space-y-8 pb-10">
      {/* Settings Section */}
      <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-6">
        <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          환경 설정
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">구글 시트 ID</label>
            <input 
              type="text" 
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
              placeholder="시트 URL에서 ID를 복사해 붙여넣으세요..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Apps Script URL (결과 자동저장용)
            </label>
            <input 
              type="text" 
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
              placeholder="https://script.google.com/macros/s/.../exec"
            />
          </div>

          <div className="pt-2">
            <Button onClick={handleSaveConfig} fullWidth>
              {isSaved ? '저장 완료!' : '설정 저장'}
            </Button>
          </div>

          {sheetId && (
            <div className="mt-8 border-t border-gray-100 pt-6">
               <h4 className="text-md font-bold text-gray-800 mb-4">학생 배포용 링크 생성</h4>
               
               <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <label className="block text-xs font-bold text-gray-700 mb-2">
                   현재 앱 주소 (자동 감지됨)
                 </label>
                 <input 
                    type="text" 
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none border-gray-300 text-gray-600 focus:border-indigo-500`}
                    placeholder="https://your-app-url.vercel.app"
                 />
                 
                 {(isBlob || isLocal || isEditorUrl) && (
                   <div className="mt-2 text-xs text-amber-600 font-medium bg-amber-50 p-2 border border-amber-200 rounded">
                     ⚠️ 알림: 현재 주소가 로컬이나 미리보기 환경입니다. 실제 배포 후에는 해당 주소를 입력하여 링크를 생성하세요.
                   </div>
                 )}
               </div>
               
               <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
                 <label className="block text-xs font-bold text-indigo-800 mb-2 uppercase">초대용 전체 링크</label>
                 <div className="space-y-2">
                   <textarea
                      readOnly 
                      value={shareUrl} 
                      onClick={(e) => e.currentTarget.select()}
                      className="w-full h-16 px-3 py-2 text-xs bg-white border border-indigo-200 rounded text-gray-600 focus:outline-none resize-none font-mono break-all"
                   />
                   <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={handleCopyLink} className="flex-1 whitespace-nowrap">
                        {isCopied ? '복사 완료!' : '링크 복사'}
                      </Button>
                      <a 
                        href={shareUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center whitespace-nowrap`}
                      >
                        링크 테스트
                      </a>
                   </div>
                 </div>
               </div>

               <div className="text-center">
                 <Button onClick={() => setShowQr(!showQr)} variant="secondary" className="mb-4">
                   {showQr ? 'QR 코드 숨기기' : '수업용 QR 코드 생성'}
                 </Button>
                 
                 {showQr && (
                   <div className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl animate-pop">
                     <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                       <img 
                         src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`} 
                         alt="Student Invite QR Code" 
                         className="w-48 h-48 md:w-64 md:h-64"
                         onLoad={() => console.log('QR Code Loaded')}
                         onError={(e) => {
                           console.error('QR Load Error');
                           (e.target as HTMLImageElement).src = 'https://via.placeholder.com/250?text=QR+Load+Failed';
                         }}
                       />
                     </div>
                     <p className="text-sm font-bold text-gray-600 mt-4">카메라로 스캔하여 시험 시작</p>
                     <p className="text-[10px] text-gray-400 mt-1">QR 제공: qrserver.com</p>
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">최근 응시 결과 (이 브라우저)</h2>
          <button 
            onClick={clearData}
            className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
          >
            기록 지우기
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          {results.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>응시된 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">수업반</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">학생 이름</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">점수</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">소요 시간</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">응시 일시</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((r, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{r.date}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{r.studentName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (r.score / r.totalQuestions) > 0.8 ? 'bg-green-100 text-green-800' : 
                          (r.score / r.totalQuestions) > 0.5 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {r.score} / {r.totalQuestions}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{formatTime(r.timeTakenSeconds)}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{formatDate(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;