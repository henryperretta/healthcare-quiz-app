import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// POST /api/admin/questions/bulk - Bulk operations on questions
export async function POST(request: NextRequest) {
  try {
    const { action, question_ids, reason, archived_by } = await request.json();

    if (!action || !question_ids || !Array.isArray(question_ids)) {
      return NextResponse.json(
        { error: 'Action and question_ids array are required' },
        { status: 400 }
      );
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const questionId of question_ids) {
      try {
        let success = false;

        if (action === 'archive') {
          const { data } = await supabaseAdmin
            .rpc('archive_question', {
              question_id: questionId,
              reason: reason || 'Bulk archived by admin',
              archived_by_user: archived_by || 'admin'
            });
          success = data;
        } else if (action === 'restore') {
          const { data } = await supabaseAdmin
            .rpc('restore_question', {
              question_id: questionId
            });
          success = data;
        } else {
          throw new Error(`Unknown action: ${action}`);
        }

        if (success) {
          results.push({ id: questionId, status: 'success' });
          successCount++;
        } else {
          results.push({ id: questionId, status: 'not_found' });
          errorCount++;
        }

      } catch (error) {
        results.push({ 
          id: questionId, 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      message: `Bulk ${action} completed`,
      summary: {
        total: question_ids.length,
        success: successCount,
        errors: errorCount
      },
      results
    });

  } catch (error) {
    console.error('Bulk questions operation error:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}