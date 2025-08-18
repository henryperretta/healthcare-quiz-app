import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateMCQs, verifyMCQ } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { article_id }: { article_id: string } = await request.json();
    
    if (!article_id) {
      return NextResponse.json(
        { error: 'Article ID is required' },
        { status: 400 }
      );
    }

    // Get article details
    const { data: article, error: articleError } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('id', article_id)
      .single();
      
    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }
    
    // Check if questions already exist for this article
    const { data: existingQuestions } = await supabaseAdmin
      .from('questions')
      .select('id')
      .eq('article_id', article_id);
      
    if (existingQuestions && existingQuestions.length > 0) {
      return NextResponse.json(
        { 
          message: 'Questions already exist for this article',
          questionCount: existingQuestions.length
        },
        { status: 200 }
      );
    }

    console.log(`Generating MCQs for article: ${article.title}`);
    
    // Generate MCQs using OpenAI
    const generatedMCQs = await generateMCQs(
      article.url,
      article.clean_text,
      article.title
    );
    
    const results = [];
    
    for (const mcq of generatedMCQs.questions) {
      try {
        // Verify the generated MCQ
        const verificationStatus = await verifyMCQ(mcq);
        
        // Insert question
        const { data: question, error: questionError } = await supabaseAdmin
          .from('questions')
          .insert({
            article_id: article.id,
            prompt: mcq.prompt,
            explanation: mcq.explanation,
            difficulty: 'medium', // Default difficulty
            tags: [], // No tags for now
            reviewed: true, // Auto-approve for development
            source_span: mcq.source_quote
          })
          .select()
          .single();
          
        if (questionError) {
          throw questionError;
        }
        
        // Insert choices
        const choices = mcq.choices.map((choiceText, index) => ({
          question_id: question.id,
          text: choiceText,
          is_correct: index === mcq.answer_index,
          order_index: index
        }));
        
        const { error: choicesError } = await supabaseAdmin
          .from('choices')
          .insert(choices);
          
        if (choicesError) {
          throw choicesError;
        }
        
        results.push({
          questionId: question.id,
          prompt: mcq.prompt,
          status: verificationStatus,
          choiceCount: choices.length
        });
        
      } catch (error) {
        console.error('Failed to save MCQ:', error);
        results.push({
          prompt: mcq.prompt,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      message: `Generated ${generatedMCQs.questions.length} questions for article: ${article.title}`,
      articleTitle: article.title,
      results
    });
    
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate MCQs' },
      { status: 500 }
    );
  }
}