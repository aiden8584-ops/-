
import React, { useState, useEffect } from 'react';
import { SheetWord } from '../types';

interface FlashcardStudyProps {
  words: SheetWord[];
  setTitle: string;
  onFinish: () => void;
}

const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ words, setTitle, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shuffledWords, setShuffledWords] = useState<SheetWord[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);

  useEffect(() => {
    setShuffledWords([...words]);
  }, [words]);

  const handleShuffle = () => {
    const newOrder = [...words];
    for (let i = newOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    }
    setShuffledWords(newOrder);
    setIsShuffled(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (currentIndex < shuffledWords.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  const handleCardClick = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    } else {
      if (currentIndex < shuffledWords.length - 1) {
        handleNext();
      } else {
        setIsFlipped(false);
      }
    }
  };

  if (shuffledWords.length === 0) return null;

  const currentWord = shuffledWords[currentIndex];
  const progress = ((currentIndex + 1) / shuffledWords.length) * 100;

  return (
    <div className="max-w-lg mx-auto h-full flex flex-col relative pb-6 animate-pop">
      {/* Background Decoration - Subtle Blobs */}
      <div className="absolute top-10 -left-10 w-48 h-48 bg-indigo-200 rounded-full blur-3xl opacity-20 -z-10 mix-blend-multiply animate-pulse"></div>
      <div className="absolute top-40 -right-10 w-48 h-48 bg-purple-200 rounded-full blur-3xl opacity-20 -z-10 mix-blend-multiply animate-pulse delay-700"></div>

      {/* Header Info */}
      <div className="flex justify-between items-center px-4 pt-4 pb-2">
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">{setTitle}</h2>
          <div className="flex items-center gap-1.5 mt-1">
             <div className={`w-2 h-2 rounded-full transition-colors ${isShuffled ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
             <span className="text-xs font-bold text-gray-500">{isShuffled ? '순서 섞임' : '기본 순서'}</span>
          </div>
        </div>
        
        {/* Badge Style Counter */}
        <div className="bg-white px-4 py-2 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100 flex items-baseline gap-1">
          <span className="text-2xl font-black text-indigo-600 leading-none">{currentIndex + 1}</span>
          <span className="text-xs font-bold text-gray-400">/ {shuffledWords.length}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mx-4 mt-2 mb-6 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 relative perspective-1000 mx-4 mb-8 group cursor-pointer select-none min-h-[520px]" onClick={handleCardClick}>
        <div className={`relative w-full h-full transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform-style-3d will-change-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* FRONT (English) */}
          <div 
            className="absolute inset-0 backface-hidden bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-between p-8"
            style={{ 
              transform: "rotateY(0deg) translateZ(1px)", 
              WebkitBackfaceVisibility: "hidden",
              zIndex: isFlipped ? 0 : 2 
            }}
          >
             <div className="flex justify-center h-8">
                <span className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black tracking-widest rounded-full uppercase border border-gray-100">English</span>
             </div>
             
             {/* Word Content */}
             <div className="flex-1 flex items-center justify-center p-2" style={{ transform: "translate3d(0,0,0)" }}>
                <h3 className="text-5xl md:text-7xl font-black text-gray-900 break-words text-center leading-tight tracking-tight drop-shadow-sm">
                  {currentWord?.word || ''}
                </h3>
             </div>

             <div className="flex justify-center h-8">
                <p className="text-xs text-gray-300 font-bold animate-pulse">탭하여 뜻 확인</p>
             </div>
          </div>

          {/* BACK (Meaning) */}
          <div 
            className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2rem] shadow-[0_8px_30px_rgb(79,70,229,0.3)] flex flex-col justify-between p-8 text-white ring-1 ring-white/10"
            style={{ 
              transform: "rotateY(180deg) translateZ(1px)", 
              WebkitBackfaceVisibility: "hidden",
              zIndex: isFlipped ? 2 : 0
            }}
          >
             <div className="flex justify-center h-8">
                <span className="px-3 py-1 bg-white/10 text-indigo-100 text-[10px] font-black tracking-widest rounded-full uppercase backdrop-blur-sm">Meaning</span>
             </div>

             <div className="flex-1 flex items-center justify-center p-2" style={{ transform: "translate3d(0,0,0)" }}>
                <h3 className="text-4xl md:text-6xl font-bold break-keep text-center leading-relaxed text-white drop-shadow-md">
                  {currentWord?.meaning || ''}
                </h3>
             </div>

             <div className="flex justify-center h-8">
               {currentIndex < shuffledWords.length - 1 ? (
                 <p className="text-xs text-indigo-200 font-bold animate-pulse">다음 단어로 넘어가기</p>
               ) : (
                 <p className="text-xs text-indigo-200 font-bold">마지막 단어입니다</p>
               )}
             </div>
          </div>

        </div>
      </div>

      {/* Controls - Grid Layout with Hierarchy */}
      <div className="grid grid-cols-[1fr_2fr] gap-3 mx-4 mb-2">
        {/* Previous: Outline Style */}
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
          disabled={currentIndex === 0}
          className="h-14 rounded-2xl border-2 border-gray-200 bg-white text-gray-500 font-bold text-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:hover:bg-white transition-all active:scale-[0.98]"
        >
          이전
        </button>
        
        {/* Next: Solid Primary Style */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }} 
          disabled={currentIndex === shuffledWords.length - 1}
          className="h-14 rounded-2xl bg-indigo-600 text-white font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          다음 단어 <span className="text-sm">→</span>
        </button>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-center gap-6 mt-4">
         <button onClick={handleShuffle} className="text-xs font-bold text-gray-400 hover:text-indigo-600 flex items-center gap-1.5 transition-colors py-2">
           <span className="text-base">🔀</span> 순서 섞기
         </button>
         <button onClick={onFinish} className="text-xs font-bold text-gray-400 hover:text-indigo-600 flex items-center gap-1.5 transition-colors py-2">
           <span className="text-base">🚪</span> 그만하기
         </button>
      </div>

    </div>
  );
};

export default FlashcardStudy;
