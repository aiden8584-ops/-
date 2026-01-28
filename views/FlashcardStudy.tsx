
import React, { useState, useEffect } from 'react';
import { SheetWord } from '../types';
import Button from '../components/Button';

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
    <div className="max-w-md mx-auto h-full flex flex-col animate-pop relative">
      {/* Background Decoration */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-indigo-300 rounded-full blur-3xl opacity-20 -z-10 animate-pulse"></div>
      <div className="absolute bottom-40 right-10 w-40 h-40 bg-purple-300 rounded-full blur-3xl opacity-20 -z-10 animate-pulse delay-1000"></div>

      {/* Header Info */}
      <div className="flex justify-between items-end mb-6 px-4 pt-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-none">{setTitle}</h2>
          <div className="flex items-center gap-2 mt-2">
             <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${isShuffled ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                {isShuffled ? '🔀 순서 섞임' : '🔢 기본 순서'}
             </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-4xl font-black text-indigo-600 leading-none tracking-tighter">{currentIndex + 1}</span>
          <span className="text-sm font-bold text-gray-300 ml-1">/ {shuffledWords.length}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mx-4 mb-8 bg-gray-100 rounded-full h-1.5 overflow-hidden ring-1 ring-gray-100">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 relative perspective-1000 min-h-[420px] mb-8 mx-4 group cursor-pointer select-none" onClick={handleCardClick}>
        <div className={`relative w-full h-full transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) transform-style-3d will-change-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* FRONT (English) */}
          <div 
            className="absolute inset-0 backface-hidden bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-white ring-1 ring-gray-100 flex flex-col justify-between p-8"
            style={{ 
              transform: "rotateY(0deg) translateZ(1px)", 
              WebkitBackfaceVisibility: "hidden",
              zIndex: isFlipped ? 0 : 2 
            }}
          >
             <div className="flex items-center justify-center h-10">
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-[10px] font-black text-indigo-400 uppercase tracking-widest">English</span>
             </div>
             
             {/* Content */}
             <div className="flex-1 flex items-center justify-center p-2" style={{ transform: "translate3d(0,0,0)" }}>
                <h3 className="text-4xl md:text-5xl font-black text-gray-800 break-words text-center leading-tight tracking-tight drop-shadow-sm">
                  {currentWord?.word || ''}
                </h3>
             </div>

             <div className="flex items-center justify-center h-10">
                <p className="text-xs text-gray-300 font-bold animate-pulse">터치해서 뜻 확인</p>
             </div>
          </div>

          {/* BACK (Meaning) */}
          <div 
            className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(79,70,229,0.4)] flex flex-col justify-between p-8 text-white ring-1 ring-white/20"
            style={{ 
              transform: "rotateY(180deg) translateZ(1px)", 
              WebkitBackfaceVisibility: "hidden",
              zIndex: isFlipped ? 2 : 0
            }}
          >
             <div className="flex items-center justify-center h-10">
                <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-black text-indigo-100 uppercase tracking-widest backdrop-blur-sm">Meaning</span>
             </div>

             <div className="flex-1 flex items-center justify-center p-2" style={{ transform: "translate3d(0,0,0)" }}>
                <h3 className="text-3xl md:text-4xl font-bold break-keep text-center leading-relaxed text-white drop-shadow-md">
                  {currentWord?.meaning || ''}
                </h3>
             </div>

             <div className="flex items-center justify-center h-10">
               {currentIndex < shuffledWords.length - 1 ? (
                 <p className="text-xs text-indigo-200 font-bold animate-pulse">화면을 눌러 다음 단어</p>
               ) : (
                 <p className="text-xs text-indigo-200 font-bold">마지막 단어입니다</p>
               )}
             </div>
          </div>

        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 mb-4 mx-4">
        <Button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
          disabled={currentIndex === 0}
          variant="secondary"
          className="rounded-2xl h-14 text-base font-bold border-0 shadow-sm bg-white text-gray-600 hover:bg-gray-50 active:scale-95 transition-transform"
        >
          ← 이전
        </Button>
        <Button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }} 
          disabled={currentIndex === shuffledWords.length - 1}
          variant="primary"
          className="rounded-2xl h-14 text-base font-bold shadow-indigo-200 shadow-lg active:scale-95 transition-transform"
        >
          다음 →
        </Button>
      </div>

      <div className="flex justify-between gap-3 mx-4">
         <button onClick={handleShuffle} className="text-[10px] font-bold text-gray-400 py-3 px-4 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 transition-colors flex-1 shadow-sm">
           🔀 순서 섞기
         </button>
         <button onClick={onFinish} className="text-[10px] font-bold text-gray-400 py-3 px-4 rounded-xl bg-white border border-gray-100 hover:bg-gray-50 transition-colors flex-1 shadow-sm">
           🚪 목록으로
         </button>
      </div>

    </div>
  );
};

export default FlashcardStudy;
