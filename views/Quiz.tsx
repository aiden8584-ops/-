import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../types';
import Button from '../components/Button';

interface QuizProps {
  questions: Question[];
  onComplete: (score: number, total: number, timeSeconds: number, wrongQuestions: Question[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [startTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(0); // seconds
  const [shake, setShake] = useState(false);
  
  // Track incorrect questions locally
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const currentQuestion = questions[currentIndex];

  const handleOptionClick = (optionIndex: number) => {
    if (isAnswered) return;

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const isCorrect = optionIndex === currentQuestion.correctAnswerIndex;

    if (isCorrect) {
      setScore(prev => prev + 1);
    } else {
      // Trigger shake animation for wrong answer
      setShake(true);
      setTimeout(() => setShake(false), 500);
      
      // Record the wrong question
      setWrongQuestions(prev => [...prev, currentQuestion]);
    }

    // Auto advance after 1.5 seconds
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        const finalTime = Math.floor((Date.now() - startTime) / 1000);
        // Pass wrongQuestions to onComplete
        onComplete(isCorrect ? score + 1 : score, questions.length, finalTime, isCorrect ? wrongQuestions : [...wrongQuestions, currentQuestion]);
      }
    }, 1500);
  };

  const getButtonClass = (index: number) => {
    if (!isAnswered) return "bg-white hover:bg-gray-50 border-gray-200 text-gray-700";
    
    // Correct Answer (always show green if answered)
    if (index === currentQuestion.correctAnswerIndex) {
      return "bg-green-100 border-green-500 text-green-800 ring-1 ring-green-500 font-semibold";
    }

    // Wrong selection
    if (index === selectedOption && index !== currentQuestion.correctAnswerIndex) {
      return "bg-red-100 border-red-500 text-red-800 ring-1 ring-red-500";
    }

    // Others
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
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progress</span>
          <span className="text-xl font-bold text-indigo-600">{currentIndex + 1} <span className="text-gray-400 text-base font-medium">/ {questions.length}</span></span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</span>
          <span className="text-xl font-mono font-bold text-gray-700">{formatTime(currentTime)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
        <div 
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Question Card */}
      <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-transform duration-200 ${shake ? 'animate-shake' : ''}`}>
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-sm">
            {currentQuestion.word}
          </h2>
          <p className="text-indigo-100 mt-2 text-sm font-medium">Choose the correct meaning</p>
        </div>

        <div className="p-6 grid gap-4">
          {currentQuestion.options.map((option, idx) => (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleOptionClick(idx)}
              className={`w-full text-left px-6 py-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${getButtonClass(idx)}`}
            >
              <span className="text-lg">{option}</span>
              {isAnswered && idx === currentQuestion.correctAnswerIndex && (
                 <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
              )}
              {isAnswered && idx === selectedOption && idx !== currentQuestion.correctAnswerIndex && (
                 <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-center">
         <span className="text-sm text-gray-400">Question {currentIndex + 1} of {questions.length}</span>
      </div>
    </div>
  );
};

export default Quiz;