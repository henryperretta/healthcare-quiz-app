import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractArticleContent, validateArticleContent } from '@/lib/content-extractor';

interface ArticleData {
  title: string;
  articleURL: string;
  dateArticleAdded: string;
  date: string;
  takeaway: string;
  summary: string;
  organizations: string[];
  publisher: string;
  locations: string[];
  matching_terms: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both URL-based and JSON-based ingestion
    if (body.urls) {
      return await handleUrlIngestion(body.urls);
    } else if (body.articles) {
      return await handleJsonIngestion(body.articles);
    } else {
      return NextResponse.json(
        { error: 'Either urls array or articles array is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Ingest API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleUrlIngestion(urls: string[]) {
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json(
      { error: 'URLs array is required' },
      { status: 400 }
    );
  }

  const results = [];
  
  for (const url of urls) {
    try {
      console.log(`Processing URL: ${url}`);
      
      // Check if article already exists
      const { data: existingArticle } = await supabaseAdmin
        .from('articles')
        .select('id, url')
        .eq('url', url)
        .single();
        
      if (existingArticle) {
        results.push({
          url,
          status: 'skipped',
          message: 'Article already exists',
          articleId: existingArticle.id
        });
        continue;
      }
      
      // Extract content
      const content = await extractArticleContent(url);
      
      // Validate content
      if (!validateArticleContent(content)) {
        results.push({
          url,
          status: 'failed',
          message: 'Content validation failed - article too short or missing required fields'
        });
        continue;
      }
      
      // Save to database
      const { data: article, error } = await supabaseAdmin
        .from('articles')
        .insert({
          url,
          title: content.title,
          source: content.source,
          published_at: content.publishedAt,
          raw_html: '', // We don't store raw HTML for now
          clean_text: content.cleanText,
          status: 'processed'
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      results.push({
        url,
        status: 'success',
        message: 'Article ingested successfully',
        articleId: article.id,
        title: content.title
      });
      
    } catch (error) {
      console.error(`Failed to process URL ${url}:`, error);
      results.push({
        url,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No details available'
      });
    }
  }
  
  return NextResponse.json({
    message: `Processed ${urls.length} URLs`,
    results
  });
}

async function handleJsonIngestion(articles: ArticleData[]) {
  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json(
      { error: 'Articles array is required' },
      { status: 400 }
    );
  }

  const results = [];
  
  for (const articleData of articles) {
    try {
      console.log(`Processing article: ${articleData.title}`);
      
      // Check if article already exists by URL
      const { data: existingArticle } = await supabaseAdmin
        .from('articles')
        .select('id, url')
        .eq('url', articleData.articleURL)
        .single();
        
      if (existingArticle) {
        results.push({
          url: articleData.articleURL,
          status: 'skipped',
          message: 'Article already exists',
          articleId: existingArticle.id
        });
        continue;
      }
      
      // Create clean text from summary and takeaway
      const cleanText = `${articleData.takeaway}\n\n${articleData.summary}\n\nOrganizations: ${articleData.organizations.join(', ')}\nLocations: ${articleData.locations.join(', ')}\nRelevant Terms: ${articleData.matching_terms.join(', ')}`;
      
      // Save to database
      const { data: article, error } = await supabaseAdmin
        .from('articles')
        .insert({
          url: articleData.articleURL,
          title: articleData.title,
          source: articleData.publisher,
          published_at: articleData.date,
          raw_html: '', // Not applicable for JSON ingestion
          clean_text: cleanText,
          status: 'processed'
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      results.push({
        url: articleData.articleURL,
        status: 'success',
        message: 'Article ingested successfully',
        articleId: article.id,
        title: articleData.title
      });
      
    } catch (error) {
      console.error(`Failed to process article ${articleData.title}:`, error);
      results.push({
        url: articleData.articleURL,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No details available'
      });
    }
  }
  
  return NextResponse.json({
    message: `Processed ${articles.length} articles`,
    results
  });
}