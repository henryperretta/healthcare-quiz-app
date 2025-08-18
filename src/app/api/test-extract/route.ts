import { NextRequest, NextResponse } from 'next/server';
import { extractArticleContent } from '@/lib/content-extractor';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url') || 'https://www.mayoclinic.org/healthy-living/nutrition-and-healthy-eating/in-depth/water/art-20044256';
  
  try {
    console.log(`Testing extraction for: ${url}`);
    
    const content = await extractArticleContent(url);
    
    return NextResponse.json({
      status: 'success',
      url,
      title: content.title,
      source: content.source,
      publishedAt: content.publishedAt,
      contentLength: content.cleanText.length,
      contentPreview: content.cleanText.substring(0, 500) + '...'
    });
    
  } catch (error) {
    console.error('Extraction failed:', error);
    return NextResponse.json({
      status: 'error',
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
  }
}