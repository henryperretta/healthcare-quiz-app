import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendQuizResults } from '@/lib/email';

interface ResponseRow {
  question_id: string;
  choice_id: string;
  is_correct: boolean;
  answered_at: string;
  questions: {
    prompt: string;
    explanation: string;
    source_span: string;
    articles: {
      title: string;
      source: string;
      url: string;
    } | {
      title: string;
      source: string;
      url: string;
    }[];
  } | {
    prompt: string;
    explanation: string;
    source_span: string;
    articles: {
      title: string;
      source: string;
      url: string;
    } | {
      title: string;
      source: string;
      url: string;
    }[];
  }[];
  choices: {
    text: string;
  } | {
    text: string;
  }[];
}

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
            source,
            url
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
      responses: responses?.map((r: ResponseRow) => {
        const question = Array.isArray(r.questions) ? r.questions[0] : r.questions;
        const choice = Array.isArray(r.choices) ? r.choices[0] : r.choices;
        const article = question ? (Array.isArray(question.articles) ? question.articles[0] : question.articles) : null;
        
        return {
          question: question?.prompt || '',
          selected_answer: choice?.text || '',
          is_correct: r.is_correct,
          explanation: question?.explanation || '',
          source: question?.source_span || '',
          article_title: article?.title || '',
          article_url: article?.url || ''
        };
      }) || []
    };
    
    // Send email if email address was provided
    if (email && finalStats.email) {
      try {
        console.log('Attempting to send email to:', finalStats.email);
        console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
        await sendQuizResults(finalStats);
        console.log(`Quiz results email sent successfully to ${finalStats.email}`);
      } catch (emailError) {
        console.error('Failed to send quiz results email:', emailError);
        // Don't fail the API call if email fails - just log it
      }
    } else {
      console.log('No email sending - email param:', email, 'finalStats.email:', finalStats.email);
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