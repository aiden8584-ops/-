
import React, { useEffect, useState, useMemo } from 'react';
import Button from '../components/Button';
import { fetchSheetTabs, checkSheetAvailability } from '../services/sheetService';
import { APP_CONFIG } from '../config';
import { QuestionType } from '../types';

const SHEET_ID_KEY = 'vocamaster_sheet_id';
const SCRIPT_URL_KEY = 'vocamaster_script_url';
const BASE_URL_KEY = 'vocamaster_base_url';
const SETTINGS_KEY = 'vocamaster_quiz_settings';

const APP_VERSION = "v1.15 (Quiz Customization)";

const GAS_CODE_SNIPPET = `/**
 * [VocaMaster 단어시험 채점 시스템 v1.15]
 */
function doGet(e) { return ContentService.createTextOutput("VocaMaster 연결 성공!"); }
function doPost(e) {
  if (typeof e === 'undefined' || !e.postData) return ContentService.createTextOutput("⚠️ Error");
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("결과") || ss.insertSheet("결과");
    if (sheet.getLastRow() == 0) {
      sheet.appendRow(["구분(반)", "이름", "점수", "총점", "소요시간(초)", "시험날짜", "제출일시"]);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([data.tabName, data.studentName, data.score, data.total, data.timeTaken, data.testDate, data.timestamp]);
    return ContentService.createTextOutput("Success");
  } catch(e) { return ContentService.createTextOutput("Error: " + e.toString()); }
}`;

const TeacherDashboard: React.FC = () => {
  const [sheetId, setSheetId] = useState('');
  const [scriptUrl, setScriptUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  
  // Quiz Settings
  const [totalQuestions, setTotalQuestions] = useState(APP_CONFIG.defaultSettings.totalQuestions);
  const [timeLimit, setTimeLimit] = useState(APP_CONFIG.defaultSettings.timeLimitPerQuestion);
  const [questionType, setQuestionType] = useState<QuestionType>(APP_CONFIG.defaultSettings.questionType);

  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'success_manual' | 'fail'>('none');
  const [isCopied, setIsCopied] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [isCodeCopied, setIsCodeCopied] = useState(false);

  useEffect(() => {
    setSheetId(localStorage.getItem(SHEET_ID_KEY) || APP_CONFIG.sheetId);
    setScriptUrl(localStorage.getItem(SCRIPT_URL_KEY) || APP_CONFIG.scriptUrl);
    setBaseUrl(localStorage.getItem(BASE_URL_KEY) || APP_CONFIG.baseUrl || "");

    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setTotalQuestions(parsed.totalQuestions);
      setTimeLimit(parsed.timeLimitPerQuestion);
      setQuestionType(parsed.questionType);
    }

    if (localStorage.getItem(SHEET_ID_KEY) || APP_CONFIG.sheetId) {
      loadTabs(localStorage.getItem(SHEET_ID_KEY) || APP_CONFIG.sheetId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      totalQuestions,
      timeLimitPerQuestion: timeLimit,
      questionType
    }));
  }, [totalQuestions, timeLimit, questionType]);

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
        setConnectionStatus(isAvailable ? 'success_manual' : 'fail');
      }
    } catch (e) {
      setConnectionStatus('fail');
    } finally {
      setIsRefreshing(false);
    }
  };

  const shareUrl = useMemo(() => {
    if (!sheetId) return "";
    const params = new URLSearchParams();
    params.set('sheet_id', sheetId.trim());
    if (scriptUrl) params.set('script', scriptUrl.trim());
    if (selectedClass) params.set('class_name', selectedClass);
    params.set('num_q', totalQuestions.toString());
    params.set('t_limit', timeLimit.toString());
    params.set('q_type', questionType);
    params.set('date', new Date().toISOString().split('T')[0]);
    
    let url = baseUrl.trim() || window.location.origin + window.location.pathname;
    url = url.replace(/\/$/, '');
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    
    return `${url}/?${params.toString()}`;
  }, [sheetId, scriptUrl, selectedClass, baseUrl, totalQuestions, timeLimit, questionType]);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="animate-pop space-y-8 pb-24">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">선생님 관리 대시보드</h2>
        <p className="text-gray-500 text-sm">학생들에게 배포할 시험 링크를 생성하고 시스템을 설정합니다.</p>
      </div>

      {/* 1. 시험 커스터마이징 */}
      <section className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-indigo-600 px-8 py-5 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">시험 문제 및 설정</h3>
          <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">Step 1</span>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">문항 수</label>
            <input 
              type="number" 
              value={totalQuestions} 
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none font-bold"
            />
          </div>
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
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">문제 유형</label>
            <select 
              value={questionType} 
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none font-bold appearance-none"
            >
              <option value="mixed">영어/한글 혼합</option>
              <option value="engToKor">영어 보고 뜻 고르기</option>
              <option value="korToEng">한글 보고 영어 고르기</option>
            </select>
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
              {availableTabs.length > 0 ? (
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-4 py-4 border-2 border-indigo-100 rounded-xl font-bold text-gray-700 bg-indigo-50/30 outline-none">
                  <option value="">-- 반 선택 --</option>
                  {availableTabs.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <input type="text" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} placeholder="탭 이름을 입력하세요" className="w-full px-4 py-4 border-2 border-indigo-100 rounded-xl font-bold" />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">2. 링크 공유</label>
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className="flex-1 text-xs border rounded-lg p-3 font-mono bg-gray-50" />
                <Button onClick={() => { navigator.clipboard.writeText(shareUrl); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }}>{isCopied ? '✅' : '🔗'}</Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            {selectedClass && shareUrl ? (
              <img src={qrUrl} alt="QR" className="w-40 h-40" />
            ) : (
              <div className="text-gray-300 text-xs font-bold text-center">반을 선택하면<br/>QR이 생성됩니다</div>
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
