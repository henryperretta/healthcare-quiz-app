import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/admin/questions/[id]/restore - Restore an archived question
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questionId = params.id;

    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Use our database function to restore the question
    const { data: success, error } = await supabaseAdmin
      .rpc('restore_question', {
        question_id: questionId
      });

    if (error) {
      throw error;
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Question not found or not archived' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Question restored successfully',
      restored_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Restore question error:', error);
    return NextResponse.json(
      { error: 'Failed to restore question' },
      { status: 500 }
    );
  }
}