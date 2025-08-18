import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractArticleContent, validateArticleContent } from '@/lib/content-extractor';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url') || 'https://www.mayoclinic.org/healthy-living/nutrition-and-healthy-eating/in-depth/water/art-20044256';
  
  try {
    console.log(`Step 1: Testing extraction for: ${url}`);
    
    // Step 1: Extract content
    const content = await extractArticleContent(url);
    console.log(`Step 2: Content extracted, length: ${content.cleanText.length}`);
    
    // Step 2: Validate content
    const isValid = validateArticleContent(content);
    console.log(`Step 3: Content validation: ${isValid}`);
    
    if (!isValid) {
      return NextResponse.json({
        status: 'validation_failed',
        content,
        validation: {
          title_length: content.title.length,
          text_length: content.cleanText.length,
          source_length: content.source.length,
          min_required: 500
        }
      });
    }
    
    // Step 3: Check if already exists
    console.log(`Step 4: Checking if URL already exists in database`);
    const { data: existingArticle, error: checkError } = await supabaseAdmin
      .from('articles')
      .select('id, url')
      .eq('url', url)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found, which is ok
      console.error('Database check error:', checkError);
      return NextResponse.json({
        status: 'database_check_error',
        error: checkError
      });
    }
    
    if (existingArticle) {
      return NextResponse.json({
        status: 'already_exists',
        articleId: existingArticle.id
      });
    }
    
    // Step 4: Insert into database
    console.log(`Step 5: Inserting into database`);
    const { data: article, error: insertError } = await supabaseAdmin
      .from('articles')
      .insert({
        url,
        title: content.title,
        source: content.source,
        published_at: content.publishedAt,
        raw_html: '',
        clean_text: content.cleanText,
        status: 'processed'
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({
        status: 'database_insert_error',
        error: insertError
      });
    }
    
    return NextResponse.json({
      status: 'success',
      articleId: article.id,
      title: content.title,
      contentLength: content.cleanText.length
    });
    
  } catch (error) {
    console.error('Test ingestion failed:', error);
    return NextResponse.json({
      status: 'error',
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
  }
}