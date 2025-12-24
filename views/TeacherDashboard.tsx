
import React, { useEffect, useState, useMemo } from 'react';
import { QuizResult, IncorrectWord } from '../types';
import Button from '../components/Button';
import { fetchSheetTabs } from '../services/sheetService';

const STORAGE_KEY = 'vocamaster_results';
const INCORRECT_KEY = 'vocamaster_incorrect_notes';
const SHEET_ID_KEY = 'vocamaster_sheet_id';
const SCRIPT_URL_KEY = 'vocamaster_script_url';
const BASE_URL_KEY = 'vocamaster_base_url';

type DashboardTab = 'status' | 'students' | 'settings';

// Extension for window.aistudio
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Fix: Remove readonly to match environment's global declaration and avoid "identical modifiers" error
    aistudio: AIStudio;
  }
}

const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('status');
  const [results, setResults] = useState<QuizResult[]>([]);
  const [incorrectNotes, setIncorrectNotes] = useState<Record<string, IncorrectWord[]>>({});
  
  const [sheetId, setSheetId] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [hasPaidKey, setHasPaidKey] = useState(false);

  useEffect(() => {
    loadData();
    const storedSheetId = localStorage.getItem(SHEET_ID_KEY);
    const storedScriptUrl = localStorage.getItem(SCRIPT_URL_KEY);
    const storedBaseUrl = localStorage.getItem(BASE_URL_KEY);

    if (storedSheetId) {
      setSheetId(storedSheetId);
      loadTabs(storedSheetId);
    }
    if (storedScriptUrl) setScriptUrl(storedScriptUrl);
    if (storedBaseUrl) setBaseUrl(storedBaseUrl);
    else autoDetectUrl();

    if (window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(setHasPaidKey);
    }
  }, []);

  const loadData = () => {
    const storedResults = localStorage.getItem(STORAGE_KEY);
    if (storedResults) {
      try {
        const parsed = JSON.parse(storedResults) as QuizResult[];
        parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setResults(parsed);
      } catch (e) { console.error("Results parsing error"); }
    }

    const storedNotes = localStorage.getItem(INCORRECT_KEY);
    if (storedNotes) {
      try {
        setIncorrectNotes(JSON.parse(storedNotes));
      } catch (e) { console.error("Notes parsing error"); }
    }
  };

  const autoDetectUrl = () => {
    const currentHref = window.location.origin + window.location.pathname;
    setBaseUrl(currentHref);
  };

  const loadTabs = async (id: string) => {
    if (!id) return;
    try {
      const tabs = await fetchSheetTabs(id);
      setAvailableTabs(tabs);
    } catch (e) { console.error("Tabs loading error"); }
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    let cleanId = sheetId.trim();
    const urlMatch = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) cleanId = urlMatch[1];
    
    localStorage.setItem(SHEET_ID_KEY, cleanId);
    setSheetId(cleanId);
    if (scriptUrl.trim()) localStorage.setItem(SCRIPT_URL_KEY, scriptUrl.trim());
    else localStorage.removeItem(SCRIPT_URL_KEY);
    if (baseUrl.trim()) localStorage.setItem(BASE_URL_KEY, baseUrl.trim());

    loadTabs(cleanId);
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }, 500);
  };

  const handleOpenPaidKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasPaidKey(true);
    }
  };

  const students = useMemo(() => {
    const studentMap: Record<string, { resultCount: number; incorrectCount: number }> = {};
    
    results.forEach(r => {
      if (!studentMap[r.studentName]) studentMap[r.studentName] = { resultCount: 0, incorrectCount: 0 };
      studentMap[r.studentName].resultCount++;
    });

    Object.keys(incorrectNotes).forEach((name) => {
      const words = incorrectNotes[name];
      if (!studentMap[name]) studentMap[name] = { resultCount: 0, incorrectCount: 0 };
      studentMap[name].incorrectCount = words.length;
    });

    return Object.entries(studentMap).map(([name, stats]) => ({ name, ...stats }));
  }, [results, incorrectNotes]);

  const shareUrl = useMemo(() => {
    if (!sheetId) return "";
    const params = new URLSearchParams();
    params.set('sheet_id', sheetId.trim());
    if (scriptUrl) params.set('script', scriptUrl.trim());
    if (selectedClass) params.set('class_name', selectedClass);
    params.set('date', new Date().toISOString().split('T')[0]);
    const cleanBase = baseUrl.trim() || (window.location.origin + window.location.pathname);
    const connector = cleanBase.includes('?') ? '&' : '?';
    return `${cleanBase}${connector}${params.toString()}`;
  }, [sheetId, scriptUrl, selectedClass, baseUrl]);

  const qrUrl = useMemo(() => {
    if (!shareUrl) return "";
    return `https://quickchart.io/qr?text=${encodeURIComponent(shareUrl)}&size=400&margin=2&ecLevel=H`;
  }, [shareUrl]);

  const isInvalidUrl = useMemo(() => {
    const lower = baseUrl.toLowerCase();
    return lower.includes('vercel.com') && !lower.includes('vercel.app');
  }, [baseUrl]);

  return (
    <div className="animate-pop space-y-6 pb-20">
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 mb-2">
        {(['status', 'students', 'settings'] as DashboardTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all ${
              activeTab === tab 
              ? 'bg-indigo-600 text-white shadow-lg' 
              : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            {tab === 'status' && '📊 배포 현황'}
            {tab === 'students' && '👥 학생 관리'}
            {tab === 'settings' && '⚙️ 환경 설정'}
          </button>
        ))}
      </div>

      {activeTab === 'status' && (
        <div className="space-y-6 animate-pop">
          {sheetId ? (
            <div className="bg-white rounded-3xl shadow-xl border-2 border-indigo-50 p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-2xl font-black text-indigo-900 mb-2">🚀 학생 시험 배포</h4>
                    <p className="text-gray-500 text-sm">학생들에게 공유할 QR코드와 링크를 생성합니다.</p>
                  </div>
                  <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">수업반(탭) 선택</label>
                    <select 
                      value={selectedClass} 
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-4 py-4 border-2 border-indigo-200 rounded-2xl text-indigo-900 font-bold outline-none mb-4"
                    >
                      <option value="">-- 반 선택 (전체) --</option>
                      {availableTabs.map(tab => <option key={tab} value={tab}>{tab}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="lg" fullWidth onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}>
                        {isCopied ? '링크 복사됨!' : '시험 링크 복사'}
                      </Button>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-4 bg-indigo-900 text-white rounded-2xl text-sm font-bold flex items-center justify-center">열기</a>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                  <img src={qrUrl} alt="QR" className="w-56 h-56 mb-4" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">QR코드를 학생들에게 보여주세요</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 p-10 rounded-3xl border-2 border-amber-100 text-center">
               <p className="font-black text-amber-900 text-xl mb-2">시트 설정이 필요합니다</p>
               <p className="text-amber-700 mb-6 text-sm">환경 설정 탭에서 구글 시트 ID를 먼저 입력해주세요.</p>
               <Button onClick={() => setActiveTab('settings')}>설정하러 가기</Button>
            </div>
          )}
          
          <div className="bg-indigo-900 rounded-[2.5rem] p-10 text-white text-center shadow-2xl">
            <h4 className="text-xl font-black mb-2">✅ 실시간 결과 확인 안내</h4>
            <p className="text-indigo-200 text-sm mb-0 leading-relaxed">
              학생들이 시험을 마치면 결과가 구글 시트의 해당 반 탭에 자동으로 저장됩니다.<br/>
              로컬 응시 기록 섹션은 삭제되었으며, 이제 모든 성적은 선생님의 구글 시트에서 통합 관리하세요.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="animate-pop space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => (
              <div key={student.name} className="bg-white p-6 rounded-3xl shadow-md border border-gray-100">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-xl mb-4">👤</div>
                <h3 className="text-lg font-black text-gray-800 mb-1">{student.name}</h3>
                <div className="flex gap-4 mt-4">
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase">시험 응시</div>
                    <div className="text-xl font-black text-indigo-600">{student.resultCount}회</div>
                  </div>
                  <div className="border-l border-gray-100 pl-4">
                    <div className="text-[10px] font-black text-gray-400 uppercase">오답 단어</div>
                    <div className="text-xl font-black text-red-500">{student.incorrectCount}개</div>
                  </div>
                </div>
              </div>
            ))}
            {students.length === 0 && (
               <div className="col-span-full py-20 text-center text-gray-400 font-bold">
                 아직 등록된 학생 데이터가 없습니다.
               </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="animate-pop space-y-6">
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl shadow-xl p-8 text-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black mb-1">AI 사용량(Quota) 관리</h3>
                <p className="text-indigo-200 text-sm">사용량 초과(429 에러) 발생 시 유료 프로젝트 키를 연결하세요.</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${hasPaidKey ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                {hasPaidKey ? 'Paid Key Active' : 'Free Tier'}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 mb-6">
              <p className="text-sm leading-relaxed mb-4">
                현재 "Quota Exceeded" 에러가 발생한다면 선생님의 구글 유료 프로젝트 API 키를 연동해야 합니다. 
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleOpenPaidKeyDialog} 
                  fullWidth 
                  className="bg-white text-indigo-900 hover:bg-indigo-50 font-black py-4"
                >
                  {hasPaidKey ? '다른 유료 API 키로 변경' : '유료 API 키 선택하기'}
                </Button>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-4 bg-indigo-700/50 hover:bg-indigo-700 text-white rounded-xl text-center text-sm font-bold transition-all border border-indigo-500/30"
                >
                  결제 등록 안내 (문서)
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border-2 border-indigo-50 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-indigo-900">시스템 설정</h3>
              {isSaved && <span className="text-green-600 font-bold text-sm animate-bounce">✅ 저장됨</span>}
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 uppercase">구글 시트 ID</label>
                  <input 
                    type="text" 
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl font-mono text-sm"
                    placeholder="ID 입력"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1 uppercase">Apps Script URL</label>
                  <input 
                    type="text" 
                    value={scriptUrl}
                    onChange={(e) => setScriptUrl(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl font-mono text-sm"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-200">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black text-amber-900 uppercase">학생 접속 주소 (Base URL)</label>
                  <button onClick={autoDetectUrl} className="text-[10px] bg-amber-200 px-2 py-1 rounded-md font-bold">자동 설정</button>
                </div>
                <input 
                  type="text" 
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-sm ${isInvalidUrl ? 'border-red-400 bg-red-50' : 'border-amber-200 bg-white'}`}
                />
              </div>
              <Button onClick={handleSaveConfig} fullWidth disabled={isSaving || isInvalidUrl} className={`py-4 ${isSaved ? 'bg-green-600' : 'bg-indigo-600'}`}>
                {isSaving ? '저장 중...' : (isSaved ? '✅ 설정 저장 완료' : '설정 저장하기')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
