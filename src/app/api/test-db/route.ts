import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Test database connection
    const { error: articlesError } = await supabaseAdmin
      .from('articles')
      .select('count')
      .limit(1);
      
    const { error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('count')
      .limit(1);
      
    const { error: choicesError } = await supabaseAdmin
      .from('choices')
      .select('count')
      .limit(1);
      
    const { error: sessionsError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('count')
      .limit(1);

    return NextResponse.json({
      status: 'success',
      tables: {
        articles: articlesError ? `Error: ${articlesError.message}` : 'OK',
        questions: questionsError ? `Error: ${questionsError.message}` : 'OK',
        choices: choicesError ? `Error: ${choicesError.message}` : 'OK',
        quiz_sessions: sessionsError ? `Error: ${sessionsError.message}` : 'OK'
      },
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
        supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
        openai_key: process.env.OPENAI_API_KEY ? 'Set' : 'Missing'
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        environment: {
          supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabase_anon_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
          supabase_service_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
          openai_key: process.env.OPENAI_API_KEY ? 'Set' : 'Missing'
        }
      },
      { status: 500 }
    );
  }
}