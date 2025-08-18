import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ExtractedContent {
  title: string;
  cleanText: string;
  source: string;
  publishedAt: string;
}

export async function extractArticleContent(url: string): Promise<ExtractedContent> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, footer, header, aside, .advertisement, .ads, .social-share, .comments').remove();
    
    // Extract title
    const title = $('h1').first().text().trim() || 
                $('title').text().trim() || 
                $('meta[property="og:title"]').attr('content') || 
                'Untitled Article';
    
    // Extract main content
    let cleanText = '';
    
    // Try common article selectors
    const contentSelectors = [
      'article',
      '.article-content',
      '.post-content', 
      '.entry-content',
      '.content',
      'main',
      '.main-content'
    ];
    
    for (const selector of contentSelectors) {
      const content = $(selector).text().trim();
      if (content.length > cleanText.length) {
        cleanText = content;
      }
    }
    
    // Fallback to body if no content found
    if (!cleanText) {
      cleanText = $('body').text().trim();
    }
    
    // Clean up whitespace
    cleanText = cleanText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // Extract source domain
    const urlObj = new URL(url);
    const source = urlObj.hostname.replace('www.', '');
    
    // Try to extract published date
    let publishedAt = new Date().toISOString();
    const dateSelectors = [
      'time[datetime]',
      '.published-date',
      '.post-date',
      'meta[property="article:published_time"]',
      'meta[name="publish-date"]'
    ];
    
    for (const selector of dateSelectors) {
      const dateElement = $(selector);
      let dateStr = '';
      
      if (selector.includes('meta')) {
        dateStr = dateElement.attr('content') || '';
      } else if (selector.includes('time')) {
        dateStr = dateElement.attr('datetime') || dateElement.text();
      } else {
        dateStr = dateElement.text();
      }
      
      if (dateStr) {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toISOString();
          break;
        }
      }
    }
    
    return {
      title,
      cleanText,
      source,
      publishedAt
    };
    
  } catch (error) {
    console.error('Error extracting content from URL:', url, error);
    throw new Error(`Failed to extract content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateArticleContent(content: ExtractedContent): boolean {
  return (
    content.title.length > 0 &&
    content.cleanText.length > 500 && // Minimum article length
    content.source.length > 0
  );
}