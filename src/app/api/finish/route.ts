import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendQuizResults } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { 
      session_id, 
      email 
    }: { 
      session_id: string;
      email?: string;
    } = await request.json();
    
    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id is required' },
        { status: 400 }
      );
    }

    // Update session with completion time and email
    const { data: session, error: updateError } = await supabaseAdmin
      .from('quiz_sessions')
      .update({
        finished_at: new Date().toISOString(),
        email: email || null
      })
      .eq('id', session_id)
      .select()
      .single();
      
    if (updateError || !session) {
      throw updateError || new Error('Session not found');
    }
    
    // Get detailed results
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from('responses')
      .select(`
        question_id,
        choice_id,
        is_correct,
        answered_at,
        questions!inner (
          prompt,
          explanation,
          source_span,
          articles!inner (
            title,
            source
          )
        ),
        choices!inner (
          text
        )
      `)
      .eq('session_id', session_id)
      .order('answered_at');
      
    if (responsesError) {
      console.error('Failed to get detailed responses:', responsesError);
    }
    
    const finalStats = {
      session_id,
      correct_answers: session.correct_answers,
      total_questions: session.total_questions,
      percentage: Math.round((session.correct_answers / session.total_questions) * 100),
      started_at: session.started_at,
      finished_at: session.finished_at,
      email: session.email,
      responses: responses?.map(r => ({
        question: r.questions.prompt,
        selected_answer: r.choices.text,
        is_correct: r.is_correct,
        explanation: r.questions.explanation,
        source: r.questions.source_span,
        article_title: r.questions.articles.title
      })) || []
    };
    
    // Send email if email address was provided
    if (email && finalStats.email) {
      try {
        await sendQuizResults(finalStats as any);
        console.log(`Quiz results email sent to ${finalStats.email}`);
      } catch (emailError) {
        console.error('Failed to send quiz results email:', emailError);
        // Don't fail the API call if email fails - just log it
      }
    }
    
    return NextResponse.json(finalStats);
    
  } catch (error) {
    console.error('Finish API error:', error);
    return NextResponse.json(
      { error: 'Failed to finish quiz session' },
      { status: 500 }
    );
  }
}