'use client';

import { useState, useEffect } from 'react';
import { QuizState } from '@/types';

export default function QuizPage() {
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    correct: boolean;
    explanation: string;
    correct_choice: string;
  } | null>(null);

  useEffect(() => {
    initializeQuiz();
  }, []);

  const initializeQuiz = async () => {
    try {
      // Create session
      const sessionResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!sessionResponse.ok) {
        throw new Error('Failed to create quiz session');
      }
      
      const sessionData = await sessionResponse.json();
      
      // Get questions
      const quizResponse = await fetch('/api/quiz');
      if (!quizResponse.ok) {
        throw new Error('Failed to fetch quiz questions');
      }
      
      const quizData = await quizResponse.json();
      
      setQuizState({
        session_id: sessionData.session_id,
        questions: quizData.questions,
        current_question_index: 0,
        responses: {},
        score: { correct: 0, total: 0 },
        is_completed: false
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!selectedChoice || !quizState) return;
    
    const currentQuestion = quizState.questions[quizState.current_question_index];
    
    try {
      const response = await fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: quizState.session_id,
          question_id: currentQuestion.id,
          choice_id: selectedChoice
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }
      
      const responseData = await response.json();
      
      setFeedbackData(responseData);
      setShowFeedback(true);
      
      // Update quiz state
      setQuizState(prev => prev ? {
        ...prev,
        responses: {
          ...prev.responses,
          [currentQuestion.id]: selectedChoice
        },
        score: responseData.running_score
      } : null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    }
  };

  const handleNextQuestion = () => {
    if (!quizState) return;
    
    setSelectedChoice(null);
    setShowFeedback(false);
    setFeedbackData(null);
    
    const nextIndex = quizState.current_question_index + 1;
    
    if (nextIndex >= quizState.questions.length) {
      // Quiz completed
      setQuizState(prev => prev ? { ...prev, is_completed: true } : null);
      window.location.href = `/quiz/results?session_id=${quizState.session_id}`;
    } else {
      setQuizState(prev => prev ? {
        ...prev,
        current_question_index: nextIndex
      } : null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!quizState || quizState.is_completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to results...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quizState.questions[quizState.current_question_index];
  const progress = ((quizState.current_question_index + 1) / quizState.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Healthcare Quiz</h1>
              <div className="text-sm text-gray-600">
                Quiz Question {quizState.current_question_index + 1} of {quizState.questions.length}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            {/* Score */}
            <div className="text-center text-sm text-gray-600">
              Score: {quizState.score.correct} / {quizState.score.total} correct
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {currentQuestion.prompt}
              </h2>
              
              {/* Article Source */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                <p className="text-sm text-blue-700">
                  <strong>Source:</strong> {currentQuestion.article_title || 'Unknown Article'}
                </p>
                {currentQuestion.article_source ? (
                  <p className="text-xs text-blue-600 mt-1">from {currentQuestion.article_source}</p>
                ) : (
                  <p className="text-xs text-blue-600 mt-1">from Healthcare Article</p>
                )}
              </div>
              
            </div>

            {!showFeedback ? (
              /* Answer Options */
              <div className="space-y-3 mb-8">
                {currentQuestion.choices.map((choice) => (
                  <label 
                    key={choice.id}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedChoice === choice.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="radio"
                        name="answer"
                        value={choice.id}
                        checked={selectedChoice === choice.id}
                        onChange={(e) => setSelectedChoice(e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <span className="text-gray-900">{choice.text}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              /* Feedback */
              <div className="mb-8">
                <div className={`p-4 rounded-lg mb-4 ${
                  feedbackData?.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center mb-2">
                    {feedbackData?.correct ? (
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`font-semibold ${feedbackData?.correct ? 'text-green-800' : 'text-red-800'}`}>
                      {feedbackData?.correct ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Explanation:</h4>
                  <p className="text-gray-700">{currentQuestion.explanation}</p>
                </div>
                
                {currentQuestion.source_quote && (
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <h4 className="font-semibold text-blue-900 mb-2">Source Quote:</h4>
                    <p className="text-blue-800 italic">&ldquo;{currentQuestion.source_quote}&rdquo;</p>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center">
              {!showFeedback ? (
                <button
                  onClick={handleAnswerSubmit}
                  disabled={!selectedChoice}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {quizState.current_question_index + 1 >= quizState.questions.length ? 'View Results' : 'Next Question'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}