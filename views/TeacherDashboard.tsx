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
    // If we are in an iframe or editor, try to default to empty or current, user needs to verify.
    const currentHref = window.location.href.split('?')[0].split('#')[0];
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
    if (confirm("Are you sure you want to clear all student records on this device?")) {
      localStorage.removeItem(STORAGE_KEY);
      setResults([]);
    }
  };

  const shareUrl = getShareUrl();
  
  // Validation Logic
  const isBlob = baseUrl.startsWith('blob:');
  const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.startsWith('file:');
  
  // Check for common Editor/IDE URLs which are NOT public app URLs
  const isEditorUrl = 
    baseUrl.includes('aistudio.google.com') || 
    baseUrl.includes('script.google.com') || 
    baseUrl.includes('colab.research.google.com') ||
    baseUrl.includes('github.dev') ||
    baseUrl.includes('stackblitz.com') ||
    baseUrl.includes('codesandbox.io');

  const isInvalidUrl = isBlob || isLocal || isEditorUrl;

  return (
    <div className="animate-pop space-y-8 pb-10">
      {/* Settings Section */}
      <div className="bg-white rounded-xl shadow-md border border-indigo-100 p-6">
        <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Configuration
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Sheet ID</label>
            <input 
              type="text" 
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
              placeholder="Paste Sheet ID here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google Apps Script URL (Optional)
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
              {isSaved ? 'Settings Saved!' : 'Save Settings'}
            </Button>
          </div>

          {sheetId && (
            <div className="mt-8 border-t border-gray-100 pt-6">
               <h4 className="text-md font-bold text-gray-800 mb-4">Share with Students</h4>
               
               {/* Base URL Configuration */}
               <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <label className="block text-xs font-bold text-gray-700 mb-2">
                   App Base URL (Required)
                 </label>
                 <input 
                    type="text" 
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none ${isInvalidUrl ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-300 text-gray-600 focus:border-indigo-500'}`}
                    placeholder="https://your-app-url.vercel.app"
                 />
                 
                 {/* URL Error Messages */}
                 {isBlob && (
                   <div className="mt-2 text-xs text-red-600 font-bold bg-white p-2 border border-red-200 rounded">
                     ⛔️ ERROR: 'blob:' URLs are temporary and local. You cannot share this.<br/>
                     Please deploy this app to a public host (Vercel, Netlify) to get a shareable link.
                   </div>
                 )}
                 {!isBlob && isLocal && (
                   <div className="mt-2 text-xs text-amber-600 font-bold">
                     ⚠️ Warning: Local URL (localhost/file) detected. This will ONLY work on THIS computer. Students cannot access this.
                   </div>
                 )}
                 {isEditorUrl && (
                    <div className="mt-2 text-xs text-red-600 font-bold bg-white p-2 border border-red-200 rounded">
                      ⛔️ NOT A PUBLIC LINK: This address (aistudio/colab/script) is for your editing session only.<br/>
                      Students cannot log in to your account. You must <strong>Publish/Deploy</strong> this app to get a public link.
                    </div>
                 )}
                 {!isInvalidUrl && baseUrl && (
                   <div className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                     Valid Public URL format
                   </div>
                 )}
               </div>
               
               <div className={`bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4 transition-opacity ${isInvalidUrl ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                 <label className="block text-xs font-bold text-indigo-800 mb-2 uppercase">Invite Link</label>
                 <div className="space-y-2">
                   <textarea
                      readOnly 
                      value={isInvalidUrl ? "Please enter a valid Public URL above first." : shareUrl} 
                      onClick={(e) => e.currentTarget.select()}
                      className="w-full h-16 px-3 py-2 text-xs bg-white border border-indigo-200 rounded text-gray-600 focus:outline-none resize-none font-mono break-all"
                   />
                   <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={handleCopyLink} className="flex-1 whitespace-nowrap" disabled={isInvalidUrl}>
                        {isCopied ? 'Copied!' : 'Copy Link'}
                      </Button>
                      <a 
                        href={isInvalidUrl ? '#' : shareUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center whitespace-nowrap ${isInvalidUrl ? 'pointer-events-none bg-gray-400' : ''}`}
                      >
                        Test Link
                      </a>
                   </div>
                 </div>
               </div>

               <div className="text-center">
                 <Button onClick={() => setShowQr(!showQr)} variant="secondary" className="mb-4" disabled={isInvalidUrl}>
                   {showQr ? 'Hide QR Code' : 'Show QR Code for Classroom'}
                 </Button>
                 
                 {showQr && !isInvalidUrl && (
                   <div className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-xl animate-pop">
                     <img 
                       src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareUrl)}`} 
                       alt="Student Invite QR Code" 
                       className="w-64 h-64 mb-4 bg-gray-50"
                     />
                     <p className="text-sm font-bold text-gray-600">Scan to Start Test</p>
                     <p className="text-xs text-gray-400">Works with standard camera app</p>
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
          <h2 className="text-2xl font-bold text-gray-800">Student Results (Local Only)</h2>
          <button 
            onClick={clearData}
            className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
          >
            Clear Data
          </button>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                <strong>Note:</strong> This table only shows results from <em>this device</em>. 
                If you configured the <strong>Apps Script URL</strong> above, check your Google Sheet "Results" tab for all student submissions.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          {results.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <p>No tests taken on this device yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tab Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Time Taken</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
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