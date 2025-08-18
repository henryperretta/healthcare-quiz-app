'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminQuestion } from '@/types';

interface QuestionManagementPageState {
  questions: AdminQuestion[];
  loading: boolean;
  error: string | null;
  statusFilter: 'all' | 'active' | 'archived' | 'deleted';
  selectedQuestions: Set<string>;
  currentPage: number;
  totalPages: number;
  showArchiveModal: boolean;
  showRestoreModal: boolean;
  archiveReason: string;
  bulkOperation: boolean;
}

export default function QuestionManagementPage() {
  const [state, setState] = useState<QuestionManagementPageState>({
    questions: [],
    loading: true,
    error: null,
    statusFilter: 'all',
    selectedQuestions: new Set(),
    currentPage: 1,
    totalPages: 1,
    showArchiveModal: false,
    showRestoreModal: false,
    archiveReason: '',
    bulkOperation: false
  });

  useEffect(() => {
    fetchQuestions();
  }, [state.statusFilter, state.currentPage]);

  const fetchQuestions = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const params = new URLSearchParams({
        status: state.statusFilter,
        page: state.currentPage.toString(),
        limit: '20'
      });

      const response = await fetch(`/api/admin/questions?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        questions: data.questions || [],
        totalPages: data.pagination?.pages || 1,
        loading: false
      }));
      
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to load questions',
        loading: false
      }));
    }
  };

  const handleStatusFilterChange = (status: typeof state.statusFilter) => {
    setState(prev => ({
      ...prev,
      statusFilter: status,
      currentPage: 1,
      selectedQuestions: new Set()
    }));
  };

  const handleSelectQuestion = (questionId: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedQuestions);
      if (newSelected.has(questionId)) {
        newSelected.delete(questionId);
      } else {
        newSelected.add(questionId);
      }
      return { ...prev, selectedQuestions: newSelected };
    });
  };

  const handleSelectAll = () => {
    setState(prev => {
      const allIds = new Set(prev.questions.map(q => q.id));
      const allSelected = prev.questions.every(q => prev.selectedQuestions.has(q.id));
      return {
        ...prev,
        selectedQuestions: allSelected ? new Set() : allIds
      };
    });
  };

  const handleArchiveQuestions = async (questionIds: string[], reason: string) => {
    setState(prev => ({ ...prev, bulkOperation: true }));
    
    try {
      const response = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive',
          question_ids: questionIds,
          reason,
          archived_by: 'admin'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to archive questions');
      }

      const result = await response.json();
      alert(`Archived ${result.summary.success} questions successfully`);
      
      fetchQuestions();
      setState(prev => ({
        ...prev,
        selectedQuestions: new Set(),
        showArchiveModal: false,
        archiveReason: ''
      }));
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to archive questions');
    } finally {
      setState(prev => ({ ...prev, bulkOperation: false }));
    }
  };

  const handleRestoreQuestions = async (questionIds: string[]) => {
    setState(prev => ({ ...prev, bulkOperation: true }));
    
    try {
      const response = await fetch('/api/admin/questions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          question_ids: questionIds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to restore questions');
      }

      const result = await response.json();
      alert(`Restored ${result.summary.success} questions successfully`);
      
      fetchQuestions();
      setState(prev => ({
        ...prev,
        selectedQuestions: new Set(),
        showRestoreModal: false
      }));
      
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to restore questions');
    } finally {
      setState(prev => ({ ...prev, bulkOperation: false }));
    }
  };

  const getStatusBadge = (question: AdminQuestion) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    
    switch (question.status) {
      case 'active':
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>Active</span>;
      case 'archived':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Archived</span>;
      case 'deleted':
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>Deleted</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>Unknown</span>;
    }
  };

  const getDaysUntilDeletion = (scheduledDeletionAt: string | undefined) => {
    if (!scheduledDeletionAt) return null;
    
    const deletionDate = new Date(scheduledDeletionAt);
    const now = new Date();
    const diffTime = deletionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  if (state.loading && state.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Question Management</h1>
                <p className="text-gray-600">Archive, restore, and manage quiz questions</p>
              </div>
              <Link 
                href="/admin"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Admin
              </Link>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              
              {/* Status Filter */}
              <div className="flex space-x-2">
                {(['all', 'active', 'archived', 'deleted'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => handleStatusFilterChange(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      state.statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {/* Bulk Actions */}
              {state.selectedQuestions.size > 0 && (
                <div className="flex space-x-2">
                  {state.statusFilter !== 'archived' && (
                    <button
                      onClick={() => setState(prev => ({ ...prev, showArchiveModal: true }))}
                      disabled={state.bulkOperation}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
                    >
                      Archive Selected ({state.selectedQuestions.size})
                    </button>
                  )}
                  
                  {state.statusFilter === 'archived' && (
                    <button
                      onClick={() => setState(prev => ({ ...prev, showRestoreModal: true }))}
                      disabled={state.bulkOperation}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                    >
                      Restore Selected ({state.selectedQuestions.size})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Questions List */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {state.error ? (
              <div className="p-8 text-center text-red-600">
                <p>Error: {state.error}</p>
                <button 
                  onClick={fetchQuestions}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : state.questions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No questions found for the selected filter.</p>
              </div>
            ) : (
              <>
                {/* Table Header */}
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={state.questions.length > 0 && state.questions.every(q => state.selectedQuestions.has(q.id))}
                      onChange={handleSelectAll}
                      className="mr-4"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All ({state.questions.length} questions)
                    </span>
                  </div>
                </div>

                {/* Questions */}
                <div className="divide-y divide-gray-200">
                  {state.questions.map((question) => {
                    const daysUntilDeletion = getDaysUntilDeletion(question.scheduled_deletion_at);
                    
                    return (
                      <div key={question.id} className="p-6 hover:bg-gray-50">
                        <div className="flex items-start space-x-4">
                          
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={state.selectedQuestions.has(question.id)}
                            onChange={() => handleSelectQuestion(question.id)}
                            className="mt-1"
                          />

                          {/* Question Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3">
                                {getStatusBadge(question)}
                                <span className="text-sm text-gray-500">
                                  {question.total_response_count} responses 
                                  ({question.recent_response_count} recent)
                                </span>
                              </div>
                              
                              {question.status === 'archived' && daysUntilDeletion !== null && (
                                <span className={`text-sm font-medium ${
                                  daysUntilDeletion <= 5 ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                  {daysUntilDeletion > 0 
                                    ? `${daysUntilDeletion} days until deletion`
                                    : 'Scheduled for deletion'
                                  }
                                </span>
                              )}
                            </div>
                            
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {question.prompt}
                            </h3>
                            
                            <div className="text-sm text-gray-600 mb-2">
                              <strong>Article:</strong> {question.article_title}
                            </div>
                            
                            {question.archived_reason && (
                              <div className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                                <strong>Archive reason:</strong> {question.archived_reason}
                                {question.archived_by && (
                                  <span> (by {question.archived_by})</span>
                                )}
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 mt-2">
                              Created: {new Date(question.created_at).toLocaleDateString()}
                              {question.archived_at && (
                                <span> • Archived: {new Date(question.archived_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>

                          {/* Individual Actions */}
                          <div className="flex space-x-2">
                            {question.status === 'active' && (
                              <button
                                onClick={() => {
                                  setState(prev => ({ 
                                    ...prev, 
                                    selectedQuestions: new Set([question.id]),
                                    showArchiveModal: true 
                                  }));
                                }}
                                className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                              >
                                Archive
                              </button>
                            )}
                            
                            {question.status === 'archived' && (
                              <button
                                onClick={() => handleRestoreQuestions([question.id])}
                                className="text-green-600 hover:text-green-800 text-sm font-medium"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {state.totalPages > 1 && (
                  <div className="px-6 py-4 border-t bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Page {state.currentPage} of {state.totalPages}
                      </span>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                          disabled={state.currentPage === 1}
                          className="px-3 py-1 border rounded text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                          disabled={state.currentPage === state.totalPages}
                          className="px-3 py-1 border rounded text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Archive Modal */}
      {state.showArchiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Archive {state.selectedQuestions.size} Question(s)
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for archiving (optional)
              </label>
              <textarea
                value={state.archiveReason}
                onChange={(e) => setState(prev => ({ ...prev, archiveReason: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Outdated information, poor performance, etc."
              />
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-yellow-800">
                Questions will be archived and scheduled for deletion in 30 days. 
                You can restore them anytime before then.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  showArchiveModal: false, 
                  archiveReason: '' 
                }))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchiveQuestions(Array.from(state.selectedQuestions), state.archiveReason)}
                disabled={state.bulkOperation}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400"
              >
                {state.bulkOperation ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {state.showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Restore {state.selectedQuestions.size} Question(s)
            </h3>
            
            <div className="bg-green-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-green-800">
                Questions will be restored to active status and will appear in quizzes again.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setState(prev => ({ ...prev, showRestoreModal: false }))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestoreQuestions(Array.from(state.selectedQuestions))}
                disabled={state.bulkOperation}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {state.bulkOperation ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}