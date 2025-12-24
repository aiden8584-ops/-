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
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState(false);

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

  // Student Management Logic
  const students = useMemo(() => {
    const studentMap: Record<string, { resultCount: number; incorrectCount: number }> = {};
    
    results.forEach(r => {
      if (!studentMap[r.studentName]) studentMap[r.studentName] = { resultCount: 0, incorrectCount: 0 };
      studentMap[r.studentName].resultCount++;
    });

    // Fix: Use Object.keys to iterate and avoid TypeScript inference issues with Object.entries returning 'unknown' in some environments
    Object.keys(incorrectNotes).forEach((name) => {
      const words = incorrectNotes[name];
      if (!studentMap[name]) studentMap[name] = { resultCount: 0, incorrectCount: 0 };
      studentMap[name].incorrectCount = words.length;
    });

    return Object.entries(studentMap).map(([name, stats]) => ({ name, ...stats }));
  }, [results, incorrectNotes]);

  const handleDeleteStudent = (name: string) => {
    if (!confirm(`'${name}' 학생의 모든 시험 기록과 오답 노트를 삭제하시겠습니까?`)) return;

    const newResults = results.filter(r => r.studentName !== name);
    const newNotes = { ...incorrectNotes };
    delete newNotes[name];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
    localStorage.setItem(INCORRECT_KEY, JSON.stringify(newNotes));
    loadData();
  };

  const handleEditStudentName = (oldName: string) => {
    const newName = prompt(`'${oldName}' 학생의 새 이름을 입력하세요:`, oldName);
    if (!newName || newName.trim() === oldName) return;

    const trimmedNewName = newName.trim();

    // 1. Update Results
    const newResults = results.map(r => 
      r.studentName === oldName ? { ...r, studentName: trimmedNewName } : r
    );

    // 2. Update Incorrect Notes
    const newNotes = { ...incorrectNotes };
    if (newNotes[oldName]) {
      newNotes[trimmedNewName] = [...(newNotes[trimmedNewName] || []), ...newNotes[oldName]];
      delete newNotes[oldName];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newResults));
    localStorage.setItem(INCORRECT_KEY, JSON.stringify(newNotes));
    loadData();
  };

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
      {/* Navigation Tabs */}
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
            {tab === 'status' && '📊 실시간 현황'}
            {tab === 'students' && '👥 학생 관리'}
            {tab === 'settings' && '⚙️ 환경 설정'}
          </button>
        ))}
      </div>

      {activeTab === 'status' && (
        <div className="space-y-6 animate-pop">
          {/* Deployment Section (Condensed) */}
          {sheetId && (
            <div className="bg-white rounded-3xl shadow-xl border-2 border-indigo-50 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <h4 className="text-lg font-black text-indigo-900">🚀 학생 배포</h4>
                  <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">수업반 선택</label>
                    <select 
                      value={selectedClass} 
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl text-indigo-900 font-bold outline-none"
                    >
                      <option value="">-- 반 선택 (전체) --</option>
                      {availableTabs.map(tab => <option key={tab} value={tab}>{tab}</option>)}
                    </select>
                    <div className="mt-4 flex gap-2">
                      <Button variant="secondary" size="sm" fullWidth onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}>
                        {isCopied ? '복사됨!' : '링크 복사'}
                      </Button>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-xs font-bold flex items-center justify-center">열기</a>
                    </div>
                  </div>
                </div>
                <div className="flex justify-center p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <img src={qrUrl} alt="QR" className="w-48 h-48" />
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="font-black text-gray-800">최근 응시 기록</h2>
              <span className="text-xs font-bold text-gray-400">총 {results.length}건</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">학생 / 반</th>
                    <th className="px-6 py-4">점수</th>
                    <th className="px-6 py-4 text-right">날짜</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {results.slice(0, 50).map((r, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/40 text-sm">
                      <td className="px-6 py-4">
                        <div className="font-black text-gray-800">{r.studentName}</div>
                        <div className="text-[10px] text-indigo-400 font-bold">{r.className}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-indigo-600">{r.score}</span>
                        <span className="text-gray-300">/{r.totalQuestions}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-[10px] text-gray-400 font-mono">
                        {r.date}
                      </td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr><td colSpan={3} className="p-10 text-center text-gray-400 font-bold">기록이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="animate-pop space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map(student => (
              <div key={student.name} className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 hover:border-indigo-200 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-xl">👤</div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditStudentName(student.name)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600"
                      title="이름 수정"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteStudent(student.name)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                      title="데이터 삭제"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
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
              <div className="col-span-full p-20 text-center text-gray-400 font-bold bg-white rounded-3xl border border-dashed border-gray-200">
                등록된 학생이 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl shadow-xl border-2 border-indigo-50 p-8 animate-pop">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-indigo-900">환경 설정</h3>
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
              {isInvalidUrl && <p className="mt-2 text-[10px] text-red-600 font-black">⚠️ .vercel.app 주소로 설정해야 학생 접속이 가능합니다.</p>}
            </div>
            <Button onClick={handleSaveConfig} fullWidth disabled={isSaving || isInvalidUrl} className={`py-4 ${isSaved ? 'bg-green-600' : 'bg-indigo-600'}`}>
              {isSaving ? '저장 중...' : (isSaved ? '✅ 설정 저장 완료' : '설정 저장하기')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;