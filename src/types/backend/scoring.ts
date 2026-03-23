// Shared scoring types between frontend and backend
// This file should be the single source of truth for scoring-related types

/**
 * Represents a single question answer
 */
export interface QuestionAnswer {
  [key: string]: string | number | null;
}

/**
 * Represents form data with questions grouped by sections
 */
export interface FormQuestions {
  [sectionKey: string]: QuestionAnswer;
}

/**
 * Represents a subscale score (e.g., Walking & Standing, Pain, Social Interaction)
 */
export interface SubscaleScore {
  name: string;
  description?: string | null;
  rawScore: number;
  normalizedScore?: number;
  maxScore?: number;
  minScore?: number;
  answeredQuestions?: number;
  totalQuestions?: number;
  completionPercentage?: number;
  isComplete: boolean;
}

export interface FormAnswerComment {
  questionKey?: string | null;
  questionLabel?: string | null;
  content: string;
  createdAt: Date | string;
  createdByUserId?: string | null;
  createdByUsername?: string | null;
  source: 'patient' | 'staff';
}

/**
 * Main scoring data structure used for all forms
 * This is a subset of PatientFormData focused on scoring information
 */
export interface ScoringData {
  rawFormData: FormQuestions;
  subscales?: {
    [key: string]: SubscaleScore | null;
  };
  totalScore?: SubscaleScore | null;
}

/**
 * Patient form data structure
 * This is what gets stored in the PatientForm.patientFormData field
 */
export interface PatientFormData {
  rawFormData: FormQuestions;
  subscales?: {
    [key: string]: SubscaleScore | null;
  };
  totalScore?: SubscaleScore | null;
  fillStatus: 'draft' | 'incomplete' | 'complete';
  completedAt: Date | string | null;
  beginFill: Date | string | null;
  comments?: FormAnswerComment[];
}
