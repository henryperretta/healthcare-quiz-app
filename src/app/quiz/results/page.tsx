'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface QuizResults {
  session_id: string;
  correct_answers: number;
  total_questions: number;
  percentage: number;
  started_at: string;
  finished_at: string;
  email?: string;
  responses: Array<{
    question: string;
    selected_answer: string;
    is_correct: boolean;
    explanation: string;
    source: string;
    article_title: string;
    article_url: string;
  }>;
}

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [results, setResults] = useState<QuizResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch('/api/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }
      
      const data = await response.json();
      setResults(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      fetchResults();
    } else {
      setError('No session ID provided');
      setLoading(false);
    }
  }, [sessionId, fetchResults]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !sessionId) return;
    
    try {
      const response = await fetch('/api/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, email })
      });
      
      if (response.ok) {
        setEmailSubmitted(true);
      }
      
    } catch (err) {
      console.error('Failed to submit email:', err);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = (percentage: number) => {
    if (percentage >= 90) return 'Excellent! You have strong healthcare knowledge.';
    if (percentage >= 80) return 'Great job! Your healthcare knowledge is quite good.';
    if (percentage >= 70) return 'Good work! You have a solid foundation.';
    if (percentage >= 60) return 'Not bad! Consider reviewing some healthcare topics.';
    return 'Keep learning! Healthcare knowledge is important for everyone.';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Results</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href="/"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Results Header */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Complete!</h1>
              
              <div className="mb-6">
                <div className={`text-6xl font-bold mb-2 ${getScoreColor(results.percentage)}`}>
                  {results.percentage}%
                </div>
                <div className="text-xl text-gray-600 mb-4">
                  {results.correct_answers} out of {results.total_questions} correct
                </div>
                <p className="text-lg text-gray-700">
                  {getScoreMessage(results.percentage)}
                </p>
              </div>

              {/* Score Visualization */}
              <div className="max-w-md mx-auto mb-6">
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-1000 ${
                      results.percentage >= 80 ? 'bg-green-500' :
                      results.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${results.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Email Capture */}
            {!emailSubmitted && (
              <div className="border-t pt-6">
                <div className="max-w-md mx-auto text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Get Your Results via Email
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Receive your detailed quiz results and stay updated with new healthcare quizzes.
                  </p>
                  
                  <form onSubmit={handleEmailSubmit} className="flex gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Submit
                    </button>
                  </form>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    We respect your privacy. No spam, unsubscribe anytime.
                  </p>
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      <strong>Note:</strong> Office 365/Outlook users - emails may initially go to your Junk folder. 
                      Please check your Junk folder and mark the email as &quot;Not Junk&quot; or add quiz@fhir-engine.com to your safe senders list. 
                      This helps train the system for future deliveries. Gmail and most other providers deliver directly to inbox.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {emailSubmitted && (
              <div className="border-t pt-6 text-center">
                <div className="text-green-600 mb-2">
                  <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-700 font-semibold">Thank you! Results sent to your email.</p>
              </div>
            )}
          </div>

          {/* Detailed Results */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Question Review</h2>
            </div>


            <div className="space-y-6">
              {results.responses.map((response, index) => (
                <div key={index} className="border-b pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Question {index + 1}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      response.is_correct 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {response.is_correct ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{response.question}</p>
                  
                  <div className="bg-gray-50 p-3 rounded-lg mb-3">
                    <p className="text-sm">
                      <span className="font-medium">Your answer:</span> {response.selected_answer || 'No answer recorded'}
                    </p>
                  </div>
                  
                  {response.explanation && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                      <p className="text-sm">
                        <span className="font-medium">Explanation:</span> {response.explanation}
                      </p>
                    </div>
                  )}
                  
                  {response.article_title && (
                    <p className="text-xs text-gray-500">
                      Source: {response.article_url ? (
                        <a 
                          href={response.article_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {response.article_title}
                        </a>
                      ) : (
                        response.article_title
                      )}
                    </p>
                  )}
                  
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center">
            <a 
              href="https://fhir-engine.com/meta-crap/" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Return to C.R.A.P.
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading results...</p>
      </div>
    </div>}>
      <ResultsPageContent />
    </Suspense>
  );
}