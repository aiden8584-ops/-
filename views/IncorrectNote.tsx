import React, { useState, useEffect } from 'react';
import { IncorrectWord, Question } from '../types';
import Button from '../components/Button';

interface IncorrectNoteProps {
  initialStudentName?: string;
  incorrectRecords: Record<string, IncorrectWord[]>;
  onStartReview: (questions: Question[], studentName: string) => void;
  onBack: () => void;
}

const IncorrectNote: React.FC<IncorrectNoteProps> = ({ 
  initialStudentName, 
  incorrectRecords, 
  onStartReview,
  onBack
}) => {
  const [name, setName] = useState(initialStudentName || '');
  const [isNameConfirmed, setIsNameConfirmed] = useState(!!initialStudentName);
  const [userWords, setUserWords] = useState<IncorrectWord[]>([]);

  useEffect(() => {
    if (isNameConfirmed && name) {
      const key = Object.keys(incorrectRecords).find(k => k.toLowerCase() === name.toLowerCase().trim());
      setUserWords(key ? incorrectRecords[key] : []);
    }
  }, [name, isNameConfirmed, incorrectRecords]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setIsNameConfirmed(true);
    }
  };

  const handleReview = () => {
    const questions = userWords.map(w => w.question);
    onStartReview(questions, name);
  };

  if (!isNameConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pop">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">오답 노트</h2>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학생 이름을 입력하세요</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="차은우"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <Button type="submit" fullWidth>내 오답 확인하기</Button>
            <Button type="button" variant="ghost" fullWidth onClick={onBack}>취소</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-pop">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">오답 노트</h2>
           <p className="text-gray-500">학생: <span className="font-semibold text-indigo-600">{name}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsNameConfirmed(false)}>이름 변경</Button>
          <Button variant="secondary" size="sm" onClick={onBack}>홈으로</Button>
        </div>
      </div>

      {userWords.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
               <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
             </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">훌륭해요!</h3>
          <p className="text-gray-500">아직 기록된 오답이 없습니다. 만점을 축하합니다!</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div>
                <h3 className="font-bold text-indigo-900 text-lg">오답 복습하기</h3>
                <p className="text-indigo-700 text-sm">총 {userWords.length}개의 단어를 틀렸습니다.</p>
             </div>
             <Button onClick={handleReview} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200">
               오답 테스트 시작
             </Button>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                         <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">단어 (Word)</th>
                         <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">정확한 뜻</th>
                         <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-center">틀린 횟수</th>
                         <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase text-right">마지막 시도</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                      {userWords.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                           <td className="px-6 py-4 font-bold text-gray-800">{item.question.word}</td>
                           <td className="px-6 py-4 text-gray-600">{item.question.options[item.question.correctAnswerIndex]}</td>
                           <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                                {item.wrongCount}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-right text-sm text-gray-400">
                              {new Date(item.lastMissedDate).toLocaleDateString()}
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncorrectNote;