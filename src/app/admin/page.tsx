'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Article {
  id: string;
  url: string;
  title: string;
  source: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUrls, setNewUrls] = useState('');
  const [newArticles, setNewArticles] = useState('');
  const [inputMode, setInputMode] = useState<'urls' | 'json'>('urls');
  const [ingesting, setIngesting] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await fetch('/api/articles');
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      const data = await response.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError('Failed to fetch articles');
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputMode === 'urls' && !newUrls.trim()) return;
    if (inputMode === 'json' && !newArticles.trim()) return;
    
    setIngesting(true);
    try {
      let requestBody;
      
      if (inputMode === 'urls') {
        const urls = newUrls
          .split('\n')
          .map(url => url.trim())
          .filter(url => url.length > 0);
        requestBody = { urls };
      } else {
        try {
          const articles = JSON.parse(newArticles);
          // Ensure it's an array
          const articlesArray = Array.isArray(articles) ? articles : [articles];
          requestBody = { articles: articlesArray };
        } catch {
          alert('Invalid JSON format. Please check your JSON syntax.');
          return;
        }
      }
      
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error('Failed to ingest URLs');
      }
      
      const result = await response.json();
      console.log('Ingestion result:', result);
      
      const successCount = result.results.filter((r: any) => r.status === 'success').length;
      const failedResults = result.results.filter((r: any) => r.status === 'failed');
      const skippedResults = result.results.filter((r: any) => r.status === 'skipped');
      
      let message = `Results:\n• ${successCount} articles ingested successfully`;
      if (skippedResults.length > 0) {
        message += `\n• ${skippedResults.length} articles skipped (already exist)`;
      }
      if (failedResults.length > 0) {
        message += `\n• ${failedResults.length} articles failed\n\nErrors:`;
        failedResults.forEach((r: any) => {
          message += `\n${r.url}: ${r.message}`;
        });
      }
      
      alert(message);
      console.log('Full results:', result.results);
      
      if (inputMode === 'urls') {
        setNewUrls('');
      } else {
        setNewArticles('');
      }
      fetchArticles();
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to ingest URLs');
    } finally {
      setIngesting(false);
    }
  };

  const handleGenerateQuestions = async (articleId: string) => {
    setGenerating(articleId);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }
      
      const result = await response.json();
      alert(`Generated ${result.results.length} questions successfully`);
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
            <p className="text-gray-600">Manage healthcare articles and quiz questions</p>
          </div>

          {/* Article Ingestion */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Articles</h2>
            
            {/* Mode Selector */}
            <div className="mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setInputMode('urls')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    inputMode === 'urls' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  URLs
                </button>
                <button
                  onClick={() => setInputMode('json')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    inputMode === 'json' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>
            
            <form onSubmit={handleIngest}>
              {inputMode === 'urls' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Article URLs (one per line)
                  </label>
                  <textarea
                    value={newUrls}
                    onChange={(e) => setNewUrls(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/healthcare-article-1&#10;https://example.com/healthcare-article-2&#10;..."
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Article JSON Data (single object or array)
                  </label>
                  <textarea
                    value={newArticles}
                    onChange={(e) => setNewArticles(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder={`{
  "title": "Article Title",
  "articleURL": "https://example.com/article",
  "dateArticleAdded": "2025-08-17",
  "date": "2025-08-17",
  "takeaway": "Key takeaway from the article",
  "summary": "Full article summary...",
  "organizations": ["Organization 1", "Organization 2"],
  "publisher": "Publisher Name",
  "locations": ["Location 1", "Location 2"],
  "matching_terms": ["term1", "term2", "term3"]
}`}
                  />
                </div>
              )}
              
              <button
                type="submit"
                disabled={ingesting || (inputMode === 'urls' ? !newUrls.trim() : !newArticles.trim())}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {ingesting ? 'Ingesting...' : 'Ingest Articles'}
              </button>
            </form>

            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Only add healthcare articles from reputable sources. 
                    You can either provide URLs for automatic extraction or supply structured JSON data directly.
                    JSON format ensures more reliable content ingestion and avoids scraping limitations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sample Articles */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sample Healthcare Articles</h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading articles...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <p>Error: {error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.length > 0 ? (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Ingested Articles ({articles.length})</h3>
                    {articles.map((article) => (
                      <div key={article.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 flex-1 mr-4">{article.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            article.status === 'processed' ? 'bg-green-100 text-green-800' :
                            article.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {article.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Source: {article.source}</p>
                        <p className="text-xs text-gray-500 mb-3">Added: {new Date(article.created_at).toLocaleDateString()}</p>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleGenerateQuestions(article.id)}
                            disabled={generating === article.id}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          >
                            {generating === article.id ? 'Generating...' : 'Generate Questions'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mb-4">No articles found. Add some URLs above to get started.</p>
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400 text-left max-w-md mx-auto">
                      <p className="text-sm text-blue-800">
                        <strong>Try these sample URLs:</strong><br/>
                        • https://www.mayoclinic.org/healthy-living/nutrition-and-healthy-eating/in-depth/water/art-20044256<br/>
                        • https://www.cdc.gov/handwashing/when-how-handwashing.html<br/>
                        • https://www.heart.org/en/healthy-living/fitness/fitness-basics/aha-recs-for-physical-activity-in-adults
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {articles.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No articles found. Add some URLs above to get started.</p>
              </div>
            )}
          </div>

          {/* Admin Navigation */}
          <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Tools</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Link 
                href="/admin/questions"
                className="block p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Manage Questions</h3>
                    <p className="text-sm text-gray-600">Archive, restore, and organize quiz questions</p>
                  </div>
                </div>
              </Link>

              <Link 
                href="/"
                className="block p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Take Quiz</h3>
                    <p className="text-sm text-gray-600">Test the quiz experience as a user</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}