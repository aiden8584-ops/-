
import React, { useState, useEffect, useRef } from 'react';
import { Question, QuizSettings } from '../types';
import { playSound } from '../services/audioService';

interface QuizProps {
  questions: Question[];
  settings: QuizSettings;
  onComplete: (score: number, total: number, timeSeconds: number, wrongQuestions: Question[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, settings, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [startTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(0);
  const [shake, setShake] = useState(false);
  
  // Per-question timer
  const [timeLeft, setTimeLeft] = useState(settings.timeLimitPerQuestion);
  const timerRef = useRef<number | null>(null);
  
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);

  // Overall test timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  // Per-question timer logic
  useEffect(() => {
    if (settings.timeLimitPerQuestion > 0 && !isAnswered) {
      setTimeLeft(settings.timeLimitPerQuestion);
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, isAnswered]);

  const handleTimeOut = () => {
    if (isAnswered) return;
    handleOptionClick(-1); // Use -1 to indicate timeout (forced wrong)
  };

  const currentQuestion = questions[currentIndex];

  const handleOptionClick = (optionIndex: number) => {
    if (isAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const isCorrect = optionIndex === currentQuestion.correctAnswerIndex;

    if (isCorrect) {
      playSound('correct');
      setScore(prev => prev + 1);
    } else {
      playSound('incorrect');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setWrongQuestions(prev => [...prev, currentQuestion]);
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        playSound('complete');
        const finalTime = Math.floor((Date.now() - startTime) / 1000);
        onComplete(isCorrect ? score + 1 : score, questions.length, finalTime, isCorrect ? wrongQuestions : [...wrongQuestions, currentQuestion]);
      }
    }, 1500);
  };

  const getButtonClass = (index: number) => {
    if (!isAnswered) return "bg-white hover:bg-gray-50 border-gray-200 text-gray-700";
    if (index === currentQuestion.correctAnswerIndex) return "bg-green-100 border-green-500 text-green-800 ring-1 ring-green-500 font-semibold";
    if (index === selectedOption) return "bg-red-100 border-red-500 text-red-800 ring-1 ring-red-500";
    return "bg-gray-50 border-gray-200 text-gray-400 opacity-60";
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto animate-pop">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progress</span>
          <span className="text-xl font-bold text-indigo-600">{currentIndex + 1} <span className="text-gray-400 text-base font-medium">/ {questions.length}</span></span>
        </div>
        
        {settings.timeLimitPerQuestion > 0 && !isAnswered && (
          <div className="flex flex-col items-center">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time Left</span>
             <div className={`text-2xl font-black ${timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
               {timeLeft}s
             </div>
          </div>
        )}

        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</span>
          <span className="text-xl font-mono font-bold text-gray-700">{formatTime(currentTime)}</span>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
        <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
      </div>

      <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-transform duration-200 ${shake ? 'animate-shake' : ''}`}>
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-10 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight break-keep">
            {currentQuestion.word}
          </h2>
          {selectedOption === -1 && <p className="text-red-200 mt-3 text-sm font-bold animate-bounce">Time Up!</p>}
          {!isAnswered && settings.timeLimitPerQuestion === 0 && <p className="text-indigo-100 mt-3 text-sm font-medium">Choose the correct answer</p>}
        </div>

        <div className="p-6 grid gap-4">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleOptionClick(idx)}
              className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${getButtonClass(idx)}`}
            >
              <span className="text-lg font-medium">{option}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
