
import React, { useState, useEffect, useRef } from 'react';
import { SheetWord } from '../types';

interface FlashcardStudyProps {
  words: SheetWord[];
  setTitle: string;
  onFinish: () => void;
}

const FlashcardStudy: React.FC<FlashcardStudyProps> = ({ words, setTitle, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Data State
  const [currentQueue, setCurrentQueue] = useState<SheetWord[]>([]);
  const [markedWords, setMarkedWords] = useState<Set<string>>(new Set());
  const [isShuffled, setIsShuffled] = useState(false);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(5);
  const autoNextTimeoutRef = useRef<number | null>(null);

  // Initialize
  useEffect(() => {
    setCurrentQueue([...words]);
    setMarkedWords(new Set());
    setIsSessionEnded(false);
    setCurrentIndex(0);
  }, [words]);

  // Timer Logic
  useEffect(() => {
    // Reset timer when index changes
    setTimeLeft(5);
    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = null;
    }
  }, [currentIndex, isSessionEnded]);

  useEffect(() => {
    // Stop timer if answered, flipped, or session ended
    if (isFlipped || isSessionEnded) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoFlip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, isFlipped, isSessionEnded]);

  const handleAutoFlip = () => {
    setIsFlipped(true); // Show Meaning
    
    // Auto advance after 1.5 seconds
    autoNextTimeoutRef.current = window.setTimeout(() => {
      handleNext();
    }, 1500);
  };

  const handleNext = () => {
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    
    if (currentIndex < currentQueue.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      // End of session
      setIsSessionEnded(true);
    }
  };

  const handlePrev = () => {
    if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  const handleShuffle = () => {
    const newOrder = [...currentQueue];
    for (let i = newOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    }
    setCurrentQueue(newOrder);
    setIsShuffled(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsSessionEnded(false);
  };

  const handleCardClick = () => {
    if (isSessionEnded) return;

    if (!isFlipped) {
      setIsFlipped(true);
    } else {
      handleNext();
    }
  };

  const toggleMarkWord = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentWord = currentQueue[currentIndex];
    const newSet = new Set(markedWords);
    if (newSet.has(currentWord.word)) {
      newSet.delete(currentWord.word);
    } else {
      newSet.add(currentWord.word);
    }
    setMarkedWords(newSet);
  };

  const startReviewMode = () => {
    // Filter only marked words
    const markedList = currentQueue.filter(w => markedWords.has(w.word));
    setCurrentQueue(markedList);
    // Optional: Clear marks to let user unmark them as they learn, 
    // OR keep marks? Let's keep marks so they can toggle off what they learned.
    // If we want to narrow down, we should probably keep them marked and let user uncheck.
    
    setIsSessionEnded(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsShuffled(false); // Reset shuffle state since it's a new subset
  };

  // --- RENDER: SESSION SUMMARY ---
  if (isSessionEnded) {
    const markedCount = markedWords.size;
    return (
      <div className="max-w-md mx-auto h-full flex flex-col items-center justify-center animate-pop min-h-[60vh]">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full border border-gray-100 text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            🎉
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">학습 완료!</h2>
          <p className="text-gray-500 mb-8">모든 단어를 확인했습니다.</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-2xl">
              <div className="text-xs font-bold text-gray-400 uppercase">전체 단어</div>
              <div className="text-2xl font-black text-gray-800">{currentQueue.length}</div>
            </div>
            <div className={`p-4 rounded-2xl border-2 ${markedCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <div className={`text-xs font-bold uppercase ${markedCount > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                {markedCount > 0 ? '모르는 단어' : '완벽해요!'}
              </div>
              <div className={`text-2xl font-black ${markedCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {markedCount}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {markedCount > 0 && (
              <button 
                onClick={startReviewMode}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2"
              >
                <span>⚡ 모르는 단어만 다시 하기</span>
              </button>
            )}
            
            <button 
              onClick={handleShuffle}
              className="w-full py-4 bg-white border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold transition-all"
            >
              🔄 전체 다시 학습 (순서 섞기)
            </button>

            <button 
              onClick={onFinish}
              className="w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
            >
              목록으로 나가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: STUDY MODE ---
  const currentWord = currentQueue[currentIndex];
  const progress = ((currentIndex + 1) / currentQueue.length) * 100;
  const isMarked = markedWords.has(currentWord?.word);

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col relative pb-6 animate-pop">
      {/* Background Decoration */}
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
        
        <div className="flex items-center gap-3">
            {/* Timer Badge */}
            {!isFlipped && (
                <div className={`flex flex-col items-center px-3 py-1 rounded-xl border-2 transition-colors ${timeLeft <= 3 ? 'border-red-100 bg-red-50' : 'border-indigo-100 bg-indigo-50'}`}>
                    <span className={`text-[10px] font-black uppercase ${timeLeft <= 3 ? 'text-red-400' : 'text-indigo-400'}`}>Time</span>
                    <span className={`text-xl font-black leading-none ${timeLeft <= 3 ? 'text-red-600 animate-pulse' : 'text-indigo-600'}`}>{timeLeft}s</span>
                </div>
            )}

            {/* Counter */}
            <div className="bg-white px-5 py-3 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-gray-100 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-indigo-600 leading-none">{currentIndex + 1}</span>
              <span className="text-sm font-bold text-gray-400">/ {currentQueue.length}</span>
            </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full mb-6 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Flashcard Area */}
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
             <div className="flex justify-between items-start h-10">
                <div className="w-10"></div> {/* Spacer for centering */}
                <span className="px-4 py-1.5 bg-gray-50 text-gray-400 text-xs font-black tracking-widest rounded-full uppercase border border-gray-100">English</span>
                <button 
                  onClick={toggleMarkWord} 
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${isMarked ? 'bg-amber-100 text-amber-500' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                </button>
             </div>
             
             {/* Word Content */}
             <div className="flex-1 flex items-center justify-center p-4" style={{ transform: "translate3d(0,0,0)" }}>
                <h3 className="text-4xl md:text-6xl font-black text-gray-900 break-words text-center leading-tight tracking-tight drop-shadow-sm">
                  {currentWord?.word || ''}
                </h3>
             </div>

             <div className="flex justify-center h-10">
                <p className="text-sm text-gray-300 font-bold animate-pulse">
                    {timeLeft > 0 ? `${timeLeft}초 후 자동 공개` : '탭하여 뜻 확인'}
                </p>
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
             <div className="flex justify-between items-start h-10">
                <div className="w-10"></div>
                <span className="px-4 py-1.5 bg-white/10 text-indigo-100 text-xs font-black tracking-widest rounded-full uppercase backdrop-blur-sm">Meaning</span>
                <button 
                  onClick={toggleMarkWord} 
                  className={`w-10 h-10 flex items-center justify-center rounded-full transition-all backdrop-blur-sm ${isMarked ? 'bg-amber-400 text-white shadow-lg' : 'bg-white/10 text-indigo-200 hover:bg-white/20'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </svg>
                </button>
             </div>

             {/* Meaning Content */}
             <div className="flex-1 flex items-center justify-center p-4" style={{ transform: "translate3d(0,0,0)" }}>
                <h3 className="text-2xl md:text-4xl font-bold break-keep text-center leading-relaxed text-white drop-shadow-md">
                  {currentWord?.meaning || ''}
                </h3>
             </div>

             <div className="flex justify-center h-10">
               {currentIndex < currentQueue.length - 1 ? (
                 <p className="text-sm text-indigo-200 font-bold animate-pulse">다음 단어로 넘어가는 중...</p>
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
          disabled={currentIndex === currentQueue.length - 1}
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
           <span className="text-lg">🚪 그만하기</span>
         </button>
      </div>

    </div>
  );
};

export default FlashcardStudy;
