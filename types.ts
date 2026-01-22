
export interface Question {
  id: number;
  word: string;
  options: string[];
  correctAnswerIndex: number;
}

export type QuestionType = 'mixed' | 'engToKor' | 'korToEng' | 'context';

export interface TypeDistribution {
  engToKor: number;
  korToEng: number;
  context: number;
}

export interface QuizSettings {
  totalQuestions: number; // Derived from distribution
  timeLimitPerQuestion: number; // 0 for no limit
  questionType: QuestionType; // Kept for legacy/display purposes
  typeDistribution: TypeDistribution;
}

export interface QuizResult {
  studentName: string;
  className: string;
  date: string; // Test Date (YYYY-MM-DD)
  score: number;
  totalQuestions: number;
  timeTakenSeconds: number;
  timestamp: string; // ISO string
  incorrectQuestions?: Question[]; // Added for immediate review
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
  settings: QuizSettings;
}

export interface SheetWord {
  word: string;
  meaning: string;
}
