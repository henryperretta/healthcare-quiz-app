import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/admin/questions - List all questions with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get questions by status (fallback query if function doesn't exist)
    let query = supabaseAdmin
      .from('questions')
      .select(`
        *,
        articles!inner(title, source)
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: questions, error } = await query;

    if (error) {
      throw error;
    }

    // Transform the data to match expected format
    const transformedQuestions = questions?.map(q => ({
      ...q,
      article_title: q.articles?.title || 'Unknown',
      article_source: q.articles?.source || 'Unknown',
      recent_response_count: 0, // Will be updated when migration is run
      total_response_count: 0   // Will be updated when migration is run
    })) || [];

    // Apply pagination
    const paginatedQuestions = transformedQuestions.slice(offset, offset + limit);
    const totalCount = transformedQuestions.length;

    return NextResponse.json({
      questions: paginatedQuestions,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Admin questions API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}