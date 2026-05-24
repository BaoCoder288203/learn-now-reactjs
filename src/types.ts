export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface Option {
  id: string;
  questionId: string;
  letter: string; // "A", "B", "C", "D"
  text: string;
}

export interface Question {
  id: string;
  testPartId: string;
  questionNumber: number;
  passage?: string;
  questionText: string;
  image?: string;
  transcript?: string;
  audioUrl?: string;
  correctAnswer: string;
  options: Option[];
}

export interface TestPart {
  id: string;
  testId: string;
  partNumber: number;
  title: string;
  instructions?: string;
  questions: Question[];
}

export interface Test {
  id: string;
  title: string;
  description?: string;
  published: boolean;
  parts?: TestPart[];
  _count?: {
    testAttempts: number;
  };
}

export interface Answer {
  id: string;
  testAttemptId: string;
  questionId: string;
  selectedOption: string;
  isCorrect: boolean;
  question?: Question;
}

export interface TestAttempt {
  id: string;
  userId: string;
  testId: string;
  score: number;
  status: "STARTED" | "COMPLETED";
  startedAt: string;
  completedAt?: string;
  answers?: Answer[];
  test?: {
    title: string;
    description?: string;
  };
}

export interface SelectedWord {
  id: string;
  userId: string;
  testAttemptId: string;
  questionId: string;
  word: string;
  sentenceContext: string;
  partNumber: number;
  createdAt: string;
  question?: {
    questionNumber: number;
    questionText: string;
  };
}

export interface UserVocabulary {
  id: string;
  userId: string;
  word: string;
  sentenceContext?: string;
  partNumber?: number;
  status: "new" | "learning" | "mastered";
  createdAt: string;
  updatedAt: string;
}
