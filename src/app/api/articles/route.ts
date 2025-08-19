import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: articles, error } = await supabaseAdmin
      .from('articles')
      .select('id, url, title, source, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      articles: articles || [],
      count: articles?.length || 0
    });
    
  } catch (error) {
    console.error('Articles API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}