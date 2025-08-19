import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const QUESTIONS_PER_QUIZ = parseInt(process.env.QUIZ_QUESTIONS_PER_SESSION || '10');

export async function GET() {
  try {
    // Get approved AND active questions with their choices
    const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select(`
        id,
        prompt,
        explanation,
        source_span,
        article_id,
        articles!inner (
          title,
          source
        ),
        choices (
          id,
          text,
          is_correct,
          order_index
        )
      `)
      .eq('reviewed', true)
      .eq('status', 'active')  // Only get active questions
      .limit(50); // Get more than needed for randomization
      
    if (error) {
      throw error;
    }
    
    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No active questions available. Please check with administrator.' },
        { status: 404 }
      );
    }
    
    // Randomize and limit questions (use available questions if less than target)
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
    const questionsToUse = Math.min(QUESTIONS_PER_QUIZ, questions.length);
    const selectedQuestions = shuffledQuestions.slice(0, questionsToUse);
    
    console.log(`Quiz: Found ${questions.length} active questions, using ${questionsToUse} for quiz`);
    
    // Format for frontend
    const formattedQuestions = selectedQuestions.map(q => ({
      id: q.id,
      prompt: q.prompt,
      explanation: q.explanation,
      source_quote: q.source_span,
      article_title: q.articles.title,
      article_source: q.articles.source,
      choices: q.choices
        .sort((a, b) => a.order_index - b.order_index)
        .map(choice => ({
          id: choice.id,
          text: choice.text,
          is_correct: choice.is_correct
        }))
    }));
    
    return NextResponse.json({
      questions: formattedQuestions,
      total_questions: formattedQuestions.length
    });
    
  } catch (error) {
    console.error('Quiz API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz questions' },
      { status: 500 }
    );
  }
}