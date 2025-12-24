export interface Question {
  id: number;
  word: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface QuizResult {
  studentName: string;
  className: string;
  date: string; // Test Date (YYYY-MM-DD)
  score: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  timestamp: string; // ISO string
}

export interface IncorrectWord {
  question: Question;
  wrongCount: number;
  lastMissedDate: string;
}

export interface StudentIncorrectRecord {
  studentName: string;
  words: IncorrectWord[];
}

export enum AppView {
  LANDING = 'LANDING',
  QUIZ = 'QUIZ',
  RESULT = 'RESULT',
  TEACHER_LOGIN = 'TEACHER_LOGIN',
  TEACHER_DASHBOARD = 'TEACHER_DASHBOARD',
  INCORRECT_NOTE = 'INCORRECT_NOTE',
}

export interface UserSession {
  name: string;
  className: string;
  testDate: string;
}

export interface SheetWord {
  word: string;
  meaning: string;
}