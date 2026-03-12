
import React, { useEffect, useState, useMemo } from 'react';
import Button from '../components/Button';
import { fetchSheetTabs, checkSheetAvailability } from '../services/sheetService';
import { APP_CONFIG } from '../config';
import { QuestionType, TypeDistribution } from '../types';

const SHEET_ID_KEY = 'vocamaster_sheet_id';
const SCRIPT_URL_KEY = 'vocamaster_script_url';
const BASE_URL_KEY = 'vocamaster_base_url';
const SETTINGS_KEY = 'vocamaster_quiz_settings_v2';
const ACCESS_CODE_KEY = 'vocamaster_required_ac';

const APP_VERSION = "v1.42 (Instant Code Sync)";

const PRESET_TABS = ['서울1', '상문1', '서초1', '서울2', '상문2', '서초2', '수능반', '수능반(클리닉)'];

const TeacherDashboard: React.FC = () => {
  const [sheetId, setSheetId] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  
  // Quiz Settings
  const [timeLimit, setTimeLimit] = useState(APP_CONFIG.defaultSettings.timeLimitPerQuestion);
  const [distribution, setDistribution] = useState<TypeDistribution>(APP_CONFIG.defaultSettings.typeDistribution);
  const [useAi, setUseAi] = useState<boolean>(APP_CONFIG.defaultSettings.useAi ?? true);

  const [availableTabs, setAvailableTabs] = useState<string[]>(PRESET_TABS);
  const [selectedClass, setSelectedClass] = useState('');
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'success_manual' | 'fail'>('none');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setSheetId(localStorage.getItem(SHEET_ID_KEY) || APP_CONFIG.sheetId);
    setScriptUrl(localStorage.getItem(SCRIPT_URL_KEY) || APP_CONFIG.scriptUrl);
    setBaseUrl(localStorage.getItem(BASE_URL_KEY) || APP_CONFIG.baseUrl || "");

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setTimeLimit(parsed.timeLimitPerQuestion);
      if (parsed.typeDistribution) {
        setDistribution(parsed.typeDistribution);
      }
      if (parsed.useAi !== undefined) {
        setUseAi(parsed.useAi);
      }
    }

    const savedSheetId = localStorage.getItem(SHEET_ID_KEY) || APP_CONFIG.sheetId;
    if (savedSheetId) {
      loadTabs(savedSheetId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      timeLimitPerQuestion: timeLimit,
      typeDistribution: distribution,
      useAi: useAi
    }));
  }, [timeLimit, distribution, useAi]);

  const loadTabs = async (id: string) => {
    if (!id) return;
    setIsRefreshing(true);
    try {
      const tabs = await fetchSheetTabs(id);
      if (tabs.length > 0) {
        setAvailableTabs(tabs);
        setConnectionStatus('success');
      } else {
        // Even if fetch fails, we keep presets for dropdown usage
        setAvailableTabs(PRESET_TABS);
        const isAvailable = await checkSheetAvailability(id);
        setConnectionStatus(isAvailable ? 'success_manual' : 'fail');
      }
    } catch (e) {
      setAvailableTabs(PRESET_TABS);
      setConnectionStatus('fail');
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalQuestions = distribution.engToKor + distribution.korToEng + distribution.context;

  const shareUrl = useMemo(() => {
    if (!sheetId) return "";
    const params = new URLSearchParams();
    params.set('sheet_id', sheetId.trim());
    if (scriptUrl) params.set('script', scriptUrl.trim());
    if (selectedClass) params.set('class_name', selectedClass);
    
    // Updated params for distribution
    params.set('c_ek', distribution.engToKor.toString());
    params.set('c_ke', distribution.korToEng.toString());
    params.set('c_ctx', distribution.context.toString());
    
    params.set('t_limit', timeLimit.toString());
    params.set('use_ai', useAi.toString());

    params.set('date', new Date().toISOString().split('T')[0]);
    
    let url = baseUrl.trim() || window.location.origin + window.location.pathname;
    url = url.replace(/\/$/, '');
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    
    return `${url}/?${params.toString()}`;
  }, [sheetId, scriptUrl, selectedClass, baseUrl, distribution, timeLimit, useAi]);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

  const applyPreset = (type: 'balanced' | 'basic' | 'context_heavy') => {
    if (type === 'balanced') {
      setDistribution({ engToKor: 20, korToEng: 20, context: 10 });
      setUseAi(true);
    } else if (type === 'basic') {
      setDistribution({ engToKor: 25, korToEng: 25, context: 0 });
      setUseAi(false); // Basic often doesn't need AI
    } else if (type === 'context_heavy') {
      setDistribution({ engToKor: 15, korToEng: 15, context: 20 });
      setUseAi(true);
    }
  };

  return (
    <div className="animate-pop space-y-8 pb-24">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">선생님 관리 대시보드</h2>
        <p className="text-gray-500 text-sm">학생들에게 배포할 시험 링크를 생성하고 시스템을 설정합니다.</p>
        <p className="text-[10px] text-gray-400 font-mono">{APP_VERSION}</p>
      </div>

      {/* 1. 시험 커스터마이징 */}
      <section className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-indigo-600 px-8 py-5 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">시험 문제 구성</h3>
          <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">Step 1</span>
        </div>
        
        <div className="p-8">
          {/* Top Controls: Presets + AI Toggle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
              <button onClick={() => applyPreset('basic')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-bold text-gray-600 transition-colors whitespace-nowrap">
                ⚖️ 기본 (AI Off)
              </button>
              <button onClick={() => applyPreset('balanced')} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded-full text-xs font-bold text-indigo-600 transition-colors whitespace-nowrap">
                🎨 골고루 (AI On)
              </button>
              <button onClick={() => applyPreset('context_heavy')} className="px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded-full text-xs font-bold text-purple-600 transition-colors whitespace-nowrap">
                🧠 빈칸 집중 (AI On)
              </button>
            </div>

            {/* AI Toggle Switch */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-gray-500">AI 문제 생성</span>
              <button 
                onClick={() => setUseAi(!useAi)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${useAi ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useAi ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className={`text-xs font-bold ${useAi ? 'text-indigo-600' : 'text-gray-400'}`}>
                {useAi ? 'ON (예문/빈칸)' : 'OFF (기본/빠름)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">1. 영어 보고 뜻 찾기</label>
              <div className="relative">
                <input 
                  type="number" min="0" max="100"
                  value={distribution.engToKor} 
                  onChange={(e) => setDistribution({...distribution, engToKor: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-lg"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">문제</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">2. 뜻 보고 영어 찾기</label>
              <div className="relative">
                <input 
                  type="number" min="0" max="100"
                  value={distribution.korToEng} 
                  onChange={(e) => setDistribution({...distribution, korToEng: Number(e.target.value)})}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none font-bold text-lg"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">문제</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-xs font-bold uppercase flex items-center gap-1 ${useAi ? 'text-indigo-600' : 'text-gray-400'}`}>
                3. 빈칸 추론 (1문장)
                {!useAi && <span className="text-[10px] bg-gray-200 text-gray-500 px-1 rounded">AI OFF</span>}
              </label>
              <div className="relative">
                <input 
                  type="number" min="0" max="100"
                  value={distribution.context} 
                  onChange={(e) => setDistribution({...distribution, context: Number(e.target.value)})}
                  disabled={!useAi}
                  className={`w-full px-4 py-3 border-2 rounded-xl outline-none font-bold text-lg ${useAi ? 'bg-indigo-50 border-indigo-200 text-indigo-800 focus:border-indigo-500' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                />
                <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold ${useAi ? 'text-indigo-400' : 'text-gray-400'}`}>문제</span>
              </div>
              {!useAi && distribution.context > 0 && (
                <p className="text-[10px] text-red-400 font-bold">* AI가 꺼져있어 자동 분배됩니다.</p>
              )}
            </div>

            <div className="bg-gray-900 text-white p-4 rounded-xl flex flex-col items-center justify-center h-[84px]">
              <span className="text-[10px] text-gray-400 font-bold uppercase">총 문항 수</span>
              <span className="text-3xl font-black">{totalQuestions}</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">문항당 시간 제한 (초)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={timeLimit} 
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none font-bold"
                    placeholder="0 = 무제한"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">초</span>
                </div>
              </div>
          </div>
        </div>
      </section>

      {/* 2. QR 배포 섹션 */}
      <section className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-gray-900 px-8 py-5 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">시험 배포 (QR & 링크)</h3>
          <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded">Step 2</span>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">1. 배포할 수업반 선택</label>
              
              <div className="relative w-full">
                <select 
                  value={isCustomClass ? "custom" : selectedClass} 
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setIsCustomClass(true);
                      setSelectedClass("");
                    } else {
                      setIsCustomClass(false);
                      setSelectedClass(e.target.value);
                    }
                  }} 
                  className="w-full px-4 py-4 border-2 border-indigo-100 rounded-xl font-bold text-gray-700 bg-white outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-colors shadow-sm"
                >
                  <option value="">-- 반 선택 --</option>
                  {availableTabs.map(t => <option key={t} value={t}>{t}</option>)}
                  <option value="custom">✎ 직접 입력...</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                   </svg>
                </div>
              </div>

              {isCustomClass && (
                <div className="mt-2 animate-pop">
                  <input 
                    type="text" 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)} 
                    placeholder="수업반 이름을 입력하세요 (예: 중등A반)" 
                    className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl font-bold text-indigo-700 placeholder-indigo-300 bg-indigo-50 focus:bg-white outline-none transition-all"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. 링크 공유 및 확인</label>
              <div className="flex flex-col gap-2">
                <input readOnly value={shareUrl} className="w-full text-xs border rounded-lg p-3 font-mono bg-gray-50 mb-1" />
                <div className="flex gap-2">
                  <Button 
                    fullWidth 
                    variant="primary" 
                    onClick={() => { 
                      navigator.clipboard.writeText(shareUrl); 
                      setIsCopied(true); 
                      setTimeout(() => setIsCopied(false), 2000); 
                    }}
                  >
                    {isCopied ? '✅ 복사됨' : '🔗 링크 복사'}
                  </Button>
                  <a 
                    href={shareUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg font-bold flex items-center justify-center hover:bg-indigo-100 transition-colors"
                  >
                    🌐 열기
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            {selectedClass && shareUrl ? (
              <img src={qrUrl} alt="QR" className="w-40 h-40 mix-blend-multiply" />
            ) : (
              <div className="text-gray-300 text-xs font-bold text-center py-10">반을 선택하면<br/>QR이 생성됩니다</div>
            )}
          </div>
        </div>
      </section>

      {/* 3. 시스템 설정 */}
      <section className="space-y-4">
        <h3 className="text-lg font-black text-gray-800 px-2">⚙️ 시스템 연동 설정</h3>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">구글 시트 URL</label>
            <input type="text" value={sheetId} onChange={(e) => { const id = e.target.value.includes('/d/') ? e.target.value.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || e.target.value : e.target.value; setSheetId(id); localStorage.setItem(SHEET_ID_KEY, id); }} className="w-full px-4 py-2 border rounded-xl text-sm" placeholder="https://docs.google.com/spreadsheets/d/..." />
          </div>
          <div className="space-y-1">
             <label className="text-xs font-bold text-gray-500 uppercase">채점 서버 (Apps Script)</label>
             <input type="text" value={scriptUrl} onChange={(e) => { setScriptUrl(e.target.value); localStorage.setItem(SCRIPT_URL_KEY, e.target.value); }} className="w-full px-4 py-2 border rounded-xl text-sm" placeholder="https://script.google.com/.../exec" />
          </div>
          <div className="space-y-1">
             <label className="text-xs font-bold text-gray-500 uppercase">사이트 주소 (Base URL)</label>
             <input type="text" value={baseUrl} onChange={(e) => { setBaseUrl(e.target.value); localStorage.setItem(BASE_URL_KEY, e.target.value); }} className="w-full px-4 py-2 border rounded-xl text-sm" placeholder="https://your-app.vercel.app" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default TeacherDashboard;
