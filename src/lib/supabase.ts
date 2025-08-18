import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export type Database = {
  public: {
    Tables: {
      articles: {
        Row: {
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
        };
        Insert: Omit<Database['public']['Tables']['articles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['articles']['Insert']>;
      };
      questions: {
        Row: {
          id: string;
          article_id: string;
          prompt: string;
          explanation: string;
          difficulty: 'easy' | 'medium' | 'hard';
          tags: string[];
          reviewed: boolean;
          source_span: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['questions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['questions']['Insert']>;
      };
      choices: {
        Row: {
          id: string;
          question_id: string;
          text: string;
          is_correct: boolean;
          order_index: number;
        };
        Insert: Omit<Database['public']['Tables']['choices']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['choices']['Insert']>;
      };
      quiz_sessions: {
        Row: {
          id: string;
          started_at: string;
          finished_at: string | null;
          email: string | null;
          total_questions: number;
          correct_answers: number;
        };
        Insert: Omit<Database['public']['Tables']['quiz_sessions']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['quiz_sessions']['Insert']>;
      };
      responses: {
        Row: {
          id: string;
          session_id: string;
          question_id: string;
          choice_id: string;
          is_correct: boolean;
          answered_at: string;
        };
        Insert: Omit<Database['public']['Tables']['responses']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['responses']['Insert']>;
      };
      prize_claims: {
        Row: {
          id: string;
          session_id: string;
          status: 'pending' | 'delivered' | 'failed';
          delivered_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['prize_claims']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['prize_claims']['Insert']>;
      };
    };
  };
};