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
  questionGroupId?: string;
  questionNumber: number;
  passage?: string;
  questionText: string;
  image?: string;
  transcript?: string;
  audioUrl?: string;
  correctAnswer: string;
  options: Option[];
  testPart?: {
    id: string;
    partNumber: number;
    title: string;
  };
}

export interface QuestionGroup {
  id: string;
  testPartId: string;
  passage?: string;
  transcript?: string;
  audioUrl?: string;
  imageUrl?: string;
  groupOrder: number;
  questions: Question[];
}

export interface TestPart {
  id: string;
  testId: string;
  partNumber: number;
  title: string;
  instructions?: string;
  audioUrl?: string;
  questions: Question[];
  questionGroups?: QuestionGroup[];
}

export interface Test {
  id: string;
  title: string;
  description?: string;
  examType?: string;
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

export type IngestionStatus =
  | "QUEUED"
  | "EXTRACTING"
  | "CLASSIFYING"
  | "REVIEW_REQUIRED"
  | "IMPORTING"
  | "DONE"
  | "FAILED";

export type IngestionFileRole =
  | "EXAM_DOC"
  | "LISTENING_KEY_DOC"
  | "READING_KEY_IMAGE"
  | "AUDIO_FILE"
  | "UNKNOWN";

export interface IngestionFile {
  id: string;
  originalName: string;
  mimeType: string;
  storageKey: string;
  detectedRole: IngestionFileRole;
  confidence?: number;
}

export interface IngestionJob {
  id: string;
  status: IngestionStatus;
  reviewRequired: boolean;
  progressStep?: string;
  errorMessage?: string;
  files?: IngestionFile[];
}
