import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const { data: session, error } = await supabaseAdmin
      .from('quiz_sessions')
      .insert({
        started_at: new Date().toISOString(),
        finished_at: null,
        email: null,
        total_questions: parseInt(process.env.QUIZ_QUESTIONS_PER_SESSION || '10'),
        correct_answers: 0
      })
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      session_id: session.id,
      started_at: session.started_at
    });
    
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create quiz session' },
      { status: 500 }
    );
  }
}