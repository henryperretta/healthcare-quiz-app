import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { 
      session_id, 
      question_id, 
      choice_id 
    }: { 
      session_id: string;
      question_id: string;
      choice_id: string;
    } = await request.json();
    
    if (!session_id || !question_id || !choice_id) {
      return NextResponse.json(
        { error: 'session_id, question_id, and choice_id are required' },
        { status: 400 }
      );
    }

    // Get the choice to check if it's correct
    const { data: choice, error: choiceError } = await supabaseAdmin
      .from('choices')
      .select('is_correct')
      .eq('id', choice_id)
      .single();
      
    if (choiceError || !choice) {
      return NextResponse.json(
        { error: 'Invalid choice' },
        { status: 400 }
      );
    }
    
    const isCorrect = choice.is_correct;
    
    // Check if this question has already been answered for this session
    const { data: existingResponse } = await supabaseAdmin
      .from('responses')
      .select('id, is_correct, choice_id')
      .eq('session_id', session_id)
      .eq('question_id', question_id)
      .single();
    
    if (existingResponse) {
      // Question already answered - get current session stats
      const { data: sessionStats } = await supabaseAdmin
        .from('quiz_sessions')
        .select('correct_answers, total_questions')
        .eq('id', session_id)
        .single();
        
      const { count: responseCount } = await supabaseAdmin
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session_id);
      
      return NextResponse.json({
        correct: existingResponse.is_correct,
        already_answered: true,
        running_score: {
          correct: sessionStats?.correct_answers || 0,
          answered: responseCount || 0,
          total: sessionStats?.total_questions || 10
        }
      });
    }
    
    // Record the response
    const { error: responseError } = await supabaseAdmin
      .from('responses')
      .insert({
        session_id,
        question_id,
        choice_id,
        is_correct: isCorrect,
        answered_at: new Date().toISOString()
      });
      
    if (responseError) {
      throw responseError;
    }
    
    // Update session score if correct
    if (isCorrect) {
      // First get the current correct_answers count
      const { data: currentSession, error: getError } = await supabaseAdmin
        .from('quiz_sessions')
        .select('correct_answers')
        .eq('id', session_id)
        .single();
        
      if (!getError && currentSession) {
        const { error: updateError } = await supabaseAdmin
          .from('quiz_sessions')
          .update({
            correct_answers: currentSession.correct_answers + 1
          })
          .eq('id', session_id);
          
        if (updateError) {
          console.error('Failed to update session score:', updateError);
        }
      }
    }
    
    // Get current session stats
    const { data: sessionStats, error: statsError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('correct_answers, total_questions')
      .eq('id', session_id)
      .single();
      
    if (statsError) {
      console.error('Failed to get session stats:', statsError);
    }
    
    // Get total responses for this session
    const { count: responseCount, error: countError } = await supabaseAdmin
      .from('responses')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id);
      
    if (countError) {
      console.error('Failed to get response count:', countError);
    }
    
    return NextResponse.json({
      correct: isCorrect,
      running_score: {
        correct: sessionStats?.correct_answers || 0,
        answered: responseCount || 0,
        total: sessionStats?.total_questions || 10
      }
    });
    
  } catch (error) {
    console.error('Response API error:', error);
    return NextResponse.json(
      { error: 'Failed to record response' },
      { status: 500 }
    );
  }
}