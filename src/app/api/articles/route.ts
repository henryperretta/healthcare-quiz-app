import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('Articles API: Starting request');
    
    // First try basic select to see what columns exist
    const { data: articles, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    console.log('Articles API: Query result', { articles, error });
      
    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { 
          error: 'Supabase query failed',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      articles: articles || [],
      count: articles?.length || 0
    });
    
  } catch (error) {
    console.error('Articles API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch articles',
        details: error instanceof Error ? error.message : JSON.stringify(error),
        type: typeof error
      },
      { status: 500 }
    );
  }
}