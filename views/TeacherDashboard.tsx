
import React, { useEffect, useState, useMemo } from 'react';
import Button from '../components/Button';
import { fetchSheetTabs, checkSheetAvailability } from '../services/sheetService';
import { APP_CONFIG } from '../config';

const SHEET_ID_KEY = 'vocamaster_sheet_id';
const SCRIPT_URL_KEY = 'vocamaster_script_url';
const BASE_URL_KEY = 'vocamaster_base_url';

// Deployment Version Indicator
const APP_VERSION = "v1.14 (Better Guidance)";

const GAS_CODE_SNIPPET = `/**
 * ---------------------------------------------------------
 * [VocaMaster 단어시험 채점 시스템 v1.14]
 * 업데이트 내용: 모든 결과가 '결과' 탭 하나에 통합되어 저장됩니다.
 * ---------------------------------------------------------
 */

function doGet(e) {
  return ContentService.createTextOutput("VocaMaster 연결 성공!");
}

function doPost(e) {
  if (typeof e === 'undefined' || !e.postData) {
    return ContentService.createTextOutput("⚠️ 이 함수는 직접 실행하는 것이 아닙니다.");
  }

  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var resultTabName = "결과";
    var sheet = ss.getSheetByName(resultTabName);

    if (!sheet) {
      sheet = ss.insertSheet(resultTabName);
      sheet.appendRow(["구분(반)", "이름", "점수", "총점", "소요시간(초)", "시험날짜", "제출일시"]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#f3f4f6");
    }

    sheet.appendRow([
      data.tabName || "Unknown", 
      data.studentName,
      data.score,
      data.total,
      data.timeTaken,
      data.testDate,
      data.timestamp
    ]);

    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch(error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}`;

const sanitizeInput = (val: string) => {
  if (!val) return '';
  let clean = val.trim();
  clean = clean.replace(/\\$/, ''); 
  clean = clean.replace(/^"|"$/g, '');
  return clean;
};

const extractSheetId = (val: string) => {
  if (!val) return '';
  const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : val;
};

const TeacherDashboard: React.FC = () => {
  const [sheetId, setSheetId] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'success_manual' | 'fail'>('none');
  const [isCopied, setIsCopied] = useState(false);
  
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [autoCorrected, setAutoCorrected] = useState<string | null>(null);

  useEffect(() => {
    const storedSheetId = localStorage.getItem(SHEET_ID_KEY) || APP_CONFIG.sheetId;
    const storedScriptUrl = localStorage.getItem(SCRIPT_URL_KEY) || APP_CONFIG.scriptUrl;
    const storedBaseUrl = localStorage.getItem(BASE_URL_KEY) || APP_CONFIG.baseUrl;

    setSheetId(storedSheetId);
    setScriptUrl(sanitizeInput(storedScriptUrl));
    
    if (storedSheetId && !storedScriptUrl) {
      setShowScriptGuide(true);
    }
    
    if (storedBaseUrl) {
      setBaseUrl(sanitizeInput(storedBaseUrl));
    } else {
      const currentUrl = window.location.origin + window.location.pathname;
      if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
        setBaseUrl("");
      } else {
        setBaseUrl(currentUrl);
      }
    }

    if (storedSheetId) {
      loadTabs(storedSheetId);
    }
  }, []);

  const loadTabs = async (id: string) => {
    if (!id) return;
    setIsRefreshing(true);
    try {
      const tabs = await fetchSheetTabs(id);
      if (tabs.length > 0) {
        setAvailableTabs(tabs);
        setConnectionStatus('success');
      } else {
        const isAvailable = await checkSheetAvailability(id);
        if (isAvailable) {
           setConnectionStatus('success_manual');
           setAvailableTabs([]);
        } else {
           setConnectionStatus('fail');
        }
      }
    } catch (e) { 
      setConnectionStatus('fail');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSheetIdChange = (val: string) => {
    const extracted = extractSheetId(val);
    setSheetId(extracted);
    localStorage.setItem(SHEET_ID_KEY, extracted);
    setConnectionStatus('none');
  };

  const handleScriptUrlChange = (val: string) => {
    const clean = sanitizeInput(val);
    if (clean !== val.trim()) {
      setAutoCorrected('Apps Script 주소의 오타를 자동으로 수정했습니다.');
      setTimeout(() => setAutoCorrected(null), 3000);
    }
    setScriptUrl(clean);
    localStorage.setItem(SCRIPT_URL_KEY, clean);
  };

  const handleBaseUrlChange = (val: string) => {
    const clean = sanitizeInput(val);
    setBaseUrl(clean);
    localStorage.setItem(BASE_URL_KEY, clean);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GAS_CODE_SNIPPET);
    setIsCodeCopied(true);
    setTimeout(() => setIsCodeCopied(false), 2000);
  };

  const isPreviewUrl = useMemo(() => {
    if (!baseUrl) return false;
    return baseUrl.includes('.vercel.app') && (baseUrl.includes('-git-') || (baseUrl.match(/-/g) || []).length > 2);
  }, [baseUrl]);

  const shareUrl = useMemo(() => {
    if (!sheetId) return "";
    const params = new URLSearchParams();
    params.set('sheet_id', sheetId.trim());
    if (scriptUrl) params.set('script', scriptUrl.trim());
    if (selectedClass) params.set('class_name', selectedClass);
    params.set('date', new Date().toISOString().split('T')[0]);
    
    let url = baseUrl.trim();
    if (!url) {
        const current = window.location.origin + window.location.pathname;
        if (current.includes('localhost') || current.includes('127.0.0.1')) return "";
        url = current;
    }
    url = url.replace(/\/$/, '');
    if (!/^https?:\/\//i.test(url)) {
        url = url.includes('localhost') ? `http://${url}` : `https://${url}`;
    }
    return `${url}/?${params.toString()}`;
  }, [sheetId, scriptUrl, selectedClass, baseUrl]);

  const qrUrl = useMemo(() => {
    if (!shareUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;
  }, [shareUrl]);

  return (
    <div className="animate-pop space-y-10 pb-24 relative">
      <div className="absolute top-0 right-0">
        <span className="bg-gray-800 text-white text-[10px] px-2 py-1 rounded-full font-mono opacity-50 hover:opacity-100 transition-opacity">
          {APP_VERSION}
        </span>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">선생님 관리 대시보드</h2>
        <p className="text-gray-500 text-sm">학생들에게 배포할 시험 링크를 생성하고 시스템을 설정합니다.</p>
        {(APP_CONFIG.sheetId || APP_CONFIG.scriptUrl) && (
           <p className="text-xs text-indigo-600 font-bold bg-indigo-50 inline-block px-3 py-1 rounded-full">
             💡 영구 설정 파일(config.ts)의 기본값을 사용 중입니다.
           </p>
        )}
      </div>

      {/* 1. QR 배포 섹션 */}
      <section className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-indigo-600 px-8 py-5 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">Step 1</span>
            <h3 className="font-bold text-lg">학생 시험 배포 (QR 생성)</h3>
          </div>
          {sheetId && (
            <button onClick={() => loadTabs(sheetId)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="새로고침">
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. 배포할 수업반 선택</label>
              
              {availableTabs.length > 0 ? (
                <div className="relative">
                  <select 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)} 
                    className="w-full pl-4 pr-10 py-4 border-2 border-indigo-100 rounded-xl font-bold text-gray-700 bg-indigo-50/50 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none outline-none"
                  >
                    <option value="">-- 반을 선택해주세요 --</option>
                    {availableTabs.map(tab => <option key={tab} value={tab}>{tab}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    placeholder="수업반(탭) 이름을 직접 입력하세요"
                    className="w-full px-4 py-4 border-2 border-indigo-500 rounded-xl font-bold text-indigo-700 bg-indigo-50/30 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder-indigo-300"
                  />
                  {sheetId && (
                    <div className="bg-indigo-50/80 border border-indigo-100 rounded-lg p-3 text-xs leading-relaxed">
                      <p className="text-indigo-700 font-bold mb-1">💡 안내: 시트 탭 목록을 자동으로 가져오지 못했습니다.</p>
                      <p className="text-indigo-500">
                        이는 구글 시트 보안 설정 때문일 수 있으나, 위 칸에 <strong>구글 시트 하단에 적힌 탭 이름(예: 예비고1)을 정확히 입력</strong>하면 정상적으로 작동합니다.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. 링크 공유하기</label>
              <div className="mb-2">
                 <input 
                   readOnly
                   value={shareUrl || "아래 3번에서 사이트 주소를 설정해주세요"}
                   className={`w-full text-xs border rounded-lg p-3 font-mono break-all ${!shareUrl ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                 />
              </div>
              <div className="flex gap-2">
                <Button 
                    variant="secondary" 
                    fullWidth 
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    disabled={!shareUrl}
                >
                  {isCopied ? '✅ 복사 완료' : '🔗 링크 복사'}
                </Button>
                <a 
                    href={shareUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center shadow-lg shadow-indigo-200 transition-all ${!shareUrl ? 'opacity-50 pointer-events-none' : 'hover:bg-indigo-700'}`}
                >
                  열기
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 relative">
            {isPreviewUrl && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4">
                <p className="text-red-600 font-black text-xl mb-2">⚠️ QR 사용 불가</p>
                <p className="text-gray-600 text-xs leading-tight">임시 주소(Preview)에서는 QR이 작동하지 않을 수 있습니다.</p>
              </div>
            )}
            {selectedClass && shareUrl ? (
              <>
                <div className="bg-white p-2 rounded-xl shadow-sm mb-3">
                   <img src={qrUrl} alt="QR" className="w-40 h-40 mix-blend-multiply" />
                </div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Scan to Start</span>
              </>
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-gray-300 text-center text-xs font-medium">
                {!shareUrl ? "사이트 주소를\n설정해주세요" : "왼쪽에서 반 이름을\n입력해주세요"}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. 시스템 설정 섹션 */}
      <div className="space-y-6">
        <h3 className="text-xl font-black text-gray-800 px-2 flex items-center gap-2">⚙️ 시스템 설정</h3>

        {/* 2-1. 구글 시트 연결 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
             <div>
               <label className="text-sm font-bold text-gray-700 block mb-1">1. 문제 데이터 시트 (Google Sheets URL)</label>
               <p className="text-xs text-gray-400">단어와 뜻이 있는 스프레드시트 주소를 붙여넣으세요.</p>
             </div>
             {connectionStatus === 'success' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">✅ 연결됨</span>}
             {connectionStatus === 'success_manual' && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">📂 시트 확인됨</span>}
             {connectionStatus === 'fail' && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">❌ 연결 오류</span>}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={sheetId} 
              onChange={(e) => handleSheetIdChange(e.target.value)} 
              className={`flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all ${
                connectionStatus === 'fail' ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            {sheetId && (
              <a 
                href={`https://docs.google.com/spreadsheets/d/${sheetId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-700 transition-colors flex items-center"
              >📂 열기</a>
            )}
            <button onClick={() => loadTabs(sheetId)} className="bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-colors whitespace-nowrap">
              연결 확인
            </button>
          </div>
          {connectionStatus === 'fail' && (
             <p className="text-[11px] text-red-500 mt-2 font-medium">⚠️ 시트가 '링크가 있는 모든 사용자'에게 공개되어 있는지 다시 한번 확인해주세요.</p>
          )}
        </div>

        {/* 2-2. 채점 서버 연결 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md relative overflow-hidden">
          {autoCorrected && (
             <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-[10px] font-bold text-center py-1">{autoCorrected}</div>
          )}
          <div className="flex justify-between items-start mb-4">
             <div>
               <label className="text-sm font-bold text-gray-700 block mb-1">2. 채점 서버 (Apps Script URL)</label>
               <p className="text-xs text-gray-400">결과를 시트에 기록하기 위한 주소입니다.</p>
             </div>
             <button onClick={() => setShowScriptGuide(!showScriptGuide)} className="text-xs font-bold text-indigo-600 underline">설정 방법</button>
          </div>
          <input 
            type="text" 
            value={scriptUrl} 
            onChange={(e) => handleScriptUrlChange(e.target.value)} 
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
            placeholder="https://script.google.com/macros/s/.../exec"
          />
          {showScriptGuide && (
            <div className="mt-4 bg-gray-900 rounded-xl p-6 text-gray-300 animate-pop">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Apps Script Setup</span>
                <button onClick={handleCopyCode} className={`text-xs px-3 py-1.5 rounded-lg font-bold ${isCodeCopied ? 'bg-green-500 text-white' : 'bg-white text-black'}`}>
                  {isCodeCopied ? '✅ 복사됨' : '📋 코드 복사'}
                </button>
              </div>
              <ol className="text-xs space-y-2 list-decimal list-inside text-gray-400">
                <li>구글 시트 메뉴: [확장 프로그램] &gt; [Apps Script]</li>
                <li>위 코드를 복사하여 붙여넣기 후 저장</li>
                <li>[배포] &gt; [새 배포] &gt; 유형: [웹 앱]</li>
                <li>액세스 권한: <strong>[모든 사용자]</strong> 선택 후 배포</li>
                <li>생성된 URL을 위 칸에 붙여넣기</li>
              </ol>
            </div>
          )}
        </div>

        {/* 2-3. 배포 주소 설정 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
           <div className="flex justify-between items-start mb-4">
             <div>
               <label className="text-sm font-bold text-indigo-700 block mb-1">3. 사이트 주소 설정</label>
               <p className="text-xs text-gray-600">현재 Vercel에 배포된 사이트 주소를 입력하세요.</p>
             </div>
             <button onClick={() => handleBaseUrlChange(window.location.origin)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold">현재 주소</button>
           </div>
           <input 
              type="text" 
              value={baseUrl} 
              onChange={(e) => handleBaseUrlChange(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
              placeholder="예: https://my-voca-app.vercel.app"
            />
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
