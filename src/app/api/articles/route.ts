import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // First try basic select to see what columns exist
    const { data: articles, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
      console.error('Supabase error:', error);
      throw error;
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
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}