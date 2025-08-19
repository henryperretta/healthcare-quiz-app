import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/admin/cleanup - Clean up old archived questions
export async function POST() {
  try {
    // Use our database function to cleanup old archived questions
    const { data: deletedCount, error } = await supabaseAdmin
      .rpc('cleanup_old_archived_questions');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'Cleanup completed successfully',
      deleted_count: deletedCount || 0,
      cleanup_date: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cleanup operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform cleanup' },
      { status: 500 }
    );
  }
}

// GET /api/admin/cleanup - Preview what would be cleaned up
export async function GET() {
  try {
    // Get questions that would be deleted
    const { data: questionsToDelete, error } = await supabaseAdmin
      .from('questions')
      .select(`
        id,
        prompt,
        archived_at,
        scheduled_deletion_at,
        article_id,
        articles!inner(title)
      `)
      .eq('status', 'archived')
      .lt('scheduled_deletion_at', new Date().toISOString());

    if (error) {
      throw error;
    }

    // Also check for questions with recent responses (these would be protected)
    const questionsWithProtection = [];
    for (const question of questionsToDelete || []) {
      const { count } = await supabaseAdmin
        .from('responses')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', question.id)
        .gte('answered_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      questionsWithProtection.push({
        ...question,
        recent_responses: count || 0,
        protected: (count || 0) > 0
      });
    }

    return NextResponse.json({
      preview: true,
      questions_ready_for_deletion: questionsWithProtection.filter(q => !q.protected),
      protected_questions: questionsWithProtection.filter(q => q.protected),
      total_archived: questionsToDelete?.length || 0
    });

  } catch (error) {
    console.error('Cleanup preview error:', error);
    return NextResponse.json(
      { error: 'Failed to preview cleanup' },
      { status: 500 }
    );
  }
}