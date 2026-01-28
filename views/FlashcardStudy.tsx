
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
    <div className="max-w-3xl mx-auto h-full flex flex-col relative pb-6 animate-pop">
      {/* Background Decoration - Subtle Blobs */}
      <div className="absolute top-10 -left-10 w-64 h-64 bg-indigo-200 rounded-full blur-3xl opacity-20 -z-10 mix-blend-multiply animate-pulse"></div>
      <div className="absolute top-40 -right-10 w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-20 -z-10 mix-blend-multiply animate-pulse delay-700"></div>

      {/* Header Info */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-gray-800 tracking-tight">{setTitle}</h2>
          <div className="flex items-center gap-1.5 mt-1">
             <div className={`w-2 h-2 rounded-full transition-colors ${isShuffled ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
             <span className="text-xs font-bold text-gray-500">{isShuffled ? '순서 섞임' : '기본 순서'}</span>
          </div>
        </div>
        
        {/* Badge Style Counter */}
        <div className="bg-white px-5 py-3 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100 flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-indigo-600 leading-none">{currentIndex + 1}</span>
          <span className="text-sm font-bold text-gray-400">/ {shuffledWords.length}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full mb-6 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Flashcard Area - HEIGHT REDUCED to ensure buttons are visible */}
      <div className="w-full relative perspective-1000 mb-6 group cursor-pointer select-none h-[45vh] min-h-[350px]" onClick={handleCardClick}>
        <div className={`relative w-full h-full transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform-style-3d will-change-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* FRONT (English) */}
          <div 
            className="absolute inset-0 backface-hidden bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgb(0,0,0,0.08)] border border-gray-100 flex flex-col justify-between p-6 md:p-10"
            style={{ 
              transform: "rotateY(0deg) translateZ(1px)", 
              WebkitBackfaceVisibility: "hidden",
              zIndex: isFlipped ? 0 : 2 
            }}
          >
             <div className="flex justify-center h-10">
                <span className="px-4 py-1.5 bg-gray-50 text-gray-400 text-xs font-black tracking-widest rounded-full uppercase border border-gray-100">English</span>
             </div>
             
             {/* Word Content - Font Size Adjusted */}
             <div className="flex-1 flex items-center justify-center p-4" style={{ transform: "translate3d(0,0,0)" }}>
                <h3 className="text-4xl md:text-6xl font-black text-gray-900 break-words text-center leading-tight tracking-tight drop-shadow-sm">
                  {currentWord?.word || ''}
                </h3>
             </div>

             <div className="flex justify-center h-10">
                <p className="text-sm text-gray-300 font-bold animate-pulse">탭하여 뜻 확인</p>
             </div>
          </div>

          {/* BACK (Meaning) */}
          <div 
            className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2.5rem] shadow-[0_20px_50px_rgb(79,70,229,0.3)] flex flex-col justify-between p-6 md:p-10 text-white ring-1 ring-white/10"
            style={{ 
              transform: "rotateY(180deg) translateZ(1px)", 
              WebkitBackfaceVisibility: "hidden",
              zIndex: isFlipped ? 2 : 0
            }}
          >
             <div className="flex justify-center h-10">
                <span className="px-4 py-1.5 bg-white/10 text-indigo-100 text-xs font-black tracking-widest rounded-full uppercase backdrop-blur-sm">Meaning</span>
             </div>

             {/* Meaning Content - Font Size Adjusted */}
             <div className="flex-1 flex items-center justify-center p-4" style={{ transform: "translate3d(0,0,0)" }}>
                <h3 className="text-2xl md:text-4xl font-bold break-keep text-center leading-relaxed text-white drop-shadow-md">
                  {currentWord?.meaning || ''}
                </h3>
             </div>

             <div className="flex justify-center h-10">
               {currentIndex < shuffledWords.length - 1 ? (
                 <p className="text-sm text-indigo-200 font-bold animate-pulse">다음 단어로 넘어가기</p>
               ) : (
                 <p className="text-sm text-indigo-200 font-bold">마지막 단어입니다</p>
               )}
             </div>
          </div>

        </div>
      </div>

      {/* Controls - Grid Layout with Hierarchy */}
      <div className="grid grid-cols-[1fr_2fr] gap-4 mb-4">
        {/* Previous: Outline Style */}
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
          disabled={currentIndex === 0}
          className="h-16 rounded-2xl border-2 border-gray-200 bg-white text-gray-500 font-bold text-xl hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:hover:bg-white transition-all active:scale-[0.98]"
        >
          이전
        </button>
        
        {/* Next: Solid Primary Style */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }} 
          disabled={currentIndex === shuffledWords.length - 1}
          className="h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          다음 단어 <span className="text-base">→</span>
        </button>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-center gap-8 mt-2">
         <button onClick={handleShuffle} className="text-sm font-bold text-gray-400 hover:text-indigo-600 flex items-center gap-2 transition-colors py-2">
           <span className="text-lg">🔀</span> 순서 섞기
         </button>
         <button onClick={onFinish} className="text-sm font-bold text-gray-400 hover:text-indigo-600 flex items-center gap-2 transition-colors py-2">
           <span className="text-lg">🚪</span> 그만하기
         </button>
      </div>

    </div>
  );
};

export default FlashcardStudy;
