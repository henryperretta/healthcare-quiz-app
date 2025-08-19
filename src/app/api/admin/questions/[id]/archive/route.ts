import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/admin/questions/[id]/archive - Archive a question
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { reason, archived_by } = await request.json();
    const params = await context.params;
    const questionId = params.id;

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Use our database function to archive the question
    const { data: success, error } = await supabaseAdmin
      .rpc('archive_question', {
        question_id: questionId,
        reason: reason || 'Archived by admin',
        archived_by_user: archived_by || 'admin'
      });

    if (error) {
      throw error;
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Question not found or already archived' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Question archived successfully',
      archived_at: new Date().toISOString(),
      scheduled_deletion_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

  } catch (error) {
    console.error('Archive question error:', error);
    return NextResponse.json(
      { error: 'Failed to archive question' },
      { status: 500 }
    );
  }
}