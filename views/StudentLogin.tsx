import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { APP_CONFIG } from '../config';
import { fetchStudentList } from '../services/sheetService';
import Button from '../components/Button';

interface StudentLoginProps {
  onLoginSuccess: (studentName: string) => void;
  onChangeView: (view: AppView) => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess, onChangeView }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Extract sheetId from URL if present
    const params = new URLSearchParams(window.location.search);
    const urlSheetId = params.get('sheet_id');
    if (urlSheetId) {
      localStorage.setItem('vocamaster_sheet_id', urlSheetId);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim() || !password.trim()) {
      setError('이름과 비밀번호를 모두 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const sheetId = localStorage.getItem('vocamaster_sheet_id') || APP_CONFIG.sheetId;
      if (!sheetId) {
        throw new Error('시트 ID 설정이 필요합니다. 선생님이 제공한 링크로 접속해주세요.');
      }

      const students = await fetchStudentList(sheetId);
      
      const student = students.find(
        (s) => s.name === name.trim() && s.phoneLast4 === password.trim()
      );

      if (student) {
        localStorage.setItem('vocamaster_logged_in_student', student.name);
        onLoginSuccess(student.name);
      } else {
        setError('이름 또는 비밀번호가 일치하지 않습니다.');
      }
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pop pb-10">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-indigo-50 relative">
        <div className="bg-indigo-600 p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
          <h2 className="text-3xl font-black text-white mb-2 relative z-10 tracking-tight">학생 로그인</h2>
          <p className="text-indigo-100 font-bold relative z-10 text-sm">
            PIF영어학원 단어시험
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 md:p-10 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">아이디 (이름)</label>
              <input 
                type="text" 
                required 
                placeholder="홍길동" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-black text-gray-900" 
              />
            </div>
            <div>
              <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">비밀번호 (전화번호 뒷 4자리)</label>
              <input 
                type="password" 
                required 
                placeholder="1234" 
                maxLength={4}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-6 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-lg font-black text-gray-900" 
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full text-xl py-5 shadow-2xl rounded-[1.5rem] font-black relative overflow-hidden group"
            >
              <span className="relative z-10">{isLoading ? '확인 중...' : '로그인'}</span>
            </Button>
          </div>
          
          <div className="text-center mt-4">
            <button 
              type="button" 
              onClick={() => onChangeView(AppView.TEACHER_LOGIN)} 
              className="text-xs text-gray-400 font-bold underline hover:text-gray-600"
            >
              선생님이신가요?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentLogin;
