
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
    <div className="max-w-md mx-auto h-full flex flex-col animate-pop">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-4 px-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{setTitle}</h2>
          <p className="text-xs text-gray-500 font-medium">
             {isShuffled ? '🔀 순서 섞임' : '🔢 기본 순서'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xl font-black text-indigo-600">{currentIndex + 1}</span>
          <span className="text-sm font-medium text-gray-400"> / {shuffledWords.length}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
        <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 relative perspective-1000 min-h-[400px] mb-8 group cursor-pointer" onClick={handleCardClick}>
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* FRONT (English) */}
          <div 
            className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl border-2 border-indigo-50 flex flex-col p-6"
            style={{ zIndex: isFlipped ? 0 : 10 }}
          >
             <div className="shrink-0 h-12 flex items-center justify-center">
                <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">English</span>
             </div>
             
             <div className="flex-1 flex items-center justify-center w-full px-2 overflow-hidden">
                <h3 className="text-3xl md:text-5xl font-black text-gray-900 break-words text-center leading-tight">
                  {currentWord?.word || ''}
                </h3>
             </div>

             <div className="shrink-0 h-12 flex items-center justify-center">
                <p className="text-xs text-gray-400 font-medium animate-pulse">터치해서 뜻 확인하기</p>
             </div>
          </div>

          {/* BACK (Meaning) */}
          <div 
            className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 rounded-3xl shadow-xl flex flex-col p-6 text-white"
            style={{ zIndex: isFlipped ? 10 : 0 }}
          >
             <div className="shrink-0 h-12 flex items-center justify-center">
                <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">Meaning</span>
             </div>

             <div className="flex-1 flex items-center justify-center w-full px-2 overflow-hidden">
                <h3 className="text-2xl md:text-4xl font-bold break-keep text-center leading-snug text-white">
                  {currentWord?.meaning || ''}
                </h3>
             </div>

             <div className="shrink-0 h-12 flex items-center justify-center">
               {currentIndex < shuffledWords.length - 1 ? (
                 <p className="text-xs text-indigo-200 font-medium animate-pulse">터치해서 다음 단어</p>
               ) : (
                 <p className="text-xs text-indigo-200 font-medium">마지막 단어입니다</p>
               )}
             </div>
          </div>

        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Button 
          onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
          disabled={currentIndex === 0}
          variant="secondary"
          className="rounded-xl h-14 text-lg font-bold"
        >
          ← 이전
        </Button>
        <Button 
          onClick={(e) => { e.stopPropagation(); handleNext(); }} 
          disabled={currentIndex === shuffledWords.length - 1}
          variant="primary"
          className="rounded-xl h-14 text-lg font-bold"
        >
          다음 →
        </Button>
      </div>

      <div className="flex justify-between gap-4">
         <button onClick={handleShuffle} className="text-xs font-bold text-gray-500 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex-1">
           🔀 순서 섞기
         </button>
         <button onClick={onFinish} className="text-xs font-bold text-gray-500 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex-1">
           🚪 목록으로
         </button>
      </div>

    </div>
  );
};

export default FlashcardStudy;
