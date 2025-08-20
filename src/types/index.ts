export interface Article {
  id: string;
  url: string;
  title: string;
  source: string;
  published_at: string;
  raw_html: string;
  clean_text: string;
  status: 'pending' | 'processed' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  article_id: string;
  prompt: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  reviewed: boolean;
  source_span: string;
  status: 'active' | 'archived' | 'deleted';
  archived_at?: string;
  archived_by?: string;
  archived_reason?: string;
  scheduled_deletion_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminQuestion extends Question {
  article_title: string;
  article_source: string;
  recent_response_count: number;
  total_response_count: number;
}

export interface Choice {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
}

export interface QuizSession {
  id: string;
  started_at: string;
  finished_at?: string;
  email?: string;
  total_questions: number;
  correct_answers: number;
}

export interface Response {
  id: string;
  session_id: string;
  question_id: string;
  choice_id: string;
  is_correct: boolean;
  answered_at: string;
}

export interface PrizeClaim {
  id: string;
  session_id: string;
  status: 'pending' | 'delivered' | 'failed';
  delivered_at?: string;
}

// LLM Generation Types
export interface MCQGenerationRequest {
  article_url: string;
  clean_text: string;
}

export interface GeneratedMCQ {
  prompt: string;
  choices: string[];
  answer_index: number;
  explanation: string;
  source_quote: string;
}

export interface MCQGenerationResponse {
  article_url: string;
  questions: GeneratedMCQ[];
}

// Quiz Flow Types
export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: Choice[];
  explanation: string;
  source_quote: string;
  article_title: string;
  article_source: string;
  article_url: string;
}

export interface QuizState {
  session_id: string;
  questions: QuizQuestion[];
  current_question_index: number;
  responses: { [question_id: string]: string };
  score: { correct: number; total: number };
  is_completed: boolean;
}