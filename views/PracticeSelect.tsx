
import React from 'react';
import { SheetWord } from '../types';

interface PracticeSelectProps {
  totalWords: SheetWord[];
  onSelectSet: (words: SheetWord[], setIndex: number) => void;
  onBack: () => void;
}

const PracticeSelect: React.FC<PracticeSelectProps> = ({ totalWords, onSelectSet, onBack }) => {
  // Group words by range
  const groupedWords = totalWords.reduce((acc, word) => {
    const range = word.range || '기본 범위';
    if (!acc[range]) acc[range] = [];
    acc[range].push(word);
    return acc;
  }, {} as Record<string, SheetWord[]>);

  const ranges = Object.keys(groupedWords);

  return (
    <div className="animate-pop max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-green-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>
          <h2 className="text-2xl font-black mb-2 relative z-10">단어 연습 세트 선택</h2>
          <p className="text-green-100 text-sm font-medium relative z-10">
            총 {totalWords.length}개의 단어가 있습니다. <br/>
            학습할 범위를 선택해주세요.
          </p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ranges.map((rangeName, idx) => {
              const subset = groupedWords[rangeName];
              
              return (
                <button
                  key={idx}
                  onClick={() => onSelectSet(subset, idx + 1)}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
                >
                  <span className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-green-600">SET {idx + 1}</span>
                  <span className="text-xl font-bold text-gray-800 text-center break-words w-full">{rangeName}</span>
                  <span className="text-xs text-gray-500 mt-2 bg-white px-2 py-1 rounded border border-gray-200">
                    {subset.length} 단어
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8">
            <button 
              onClick={onBack}
              className="w-full py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
            >
              이전으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeSelect;
