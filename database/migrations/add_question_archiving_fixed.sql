-- Migration: Add Question Archiving Support (Fixed Dependencies)
-- Run this in your Supabase SQL editor

-- First, drop the dependent function
DROP FUNCTION IF EXISTS get_random_quiz_questions(integer);

-- Then drop and recreate the view
DROP VIEW IF EXISTS quiz_questions_with_choices CASCADE;

-- Add archiving columns to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'archived', 'deleted')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_by TEXT,
ADD COLUMN IF NOT EXISTS archived_reason TEXT,
ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

-- Update existing questions to have 'active' status
UPDATE questions SET status = 'active' WHERE status IS NULL;

-- Add indexes for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_archived_at ON questions(archived_at);
CREATE INDEX IF NOT EXISTS idx_questions_scheduled_deletion ON questions(scheduled_deletion_at);

-- Recreate the quiz_questions_with_choices view to exclude archived questions
CREATE VIEW quiz_questions_with_choices AS
SELECT 
    q.id,
    q.prompt,
    q.explanation,
    q.source_span,
    q.article_id,
    a.title as article_title,
    a.source as article_source,
    jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'text', c.text,
            'is_correct', c.is_correct,
            'order_index', c.order_index
        ) ORDER BY c.order_index
    ) as choices
FROM questions q
JOIN articles a ON q.article_id = a.id
JOIN choices c ON q.id = c.question_id
WHERE q.reviewed = true AND q.status = 'active'  -- Only show active questions
GROUP BY q.id, q.prompt, q.explanation, q.source_span, q.article_id, a.title, a.source;

-- Recreate the random quiz function to only use active questions
CREATE OR REPLACE FUNCTION get_random_quiz_questions(question_count INTEGER DEFAULT 10)
RETURNS SETOF quiz_questions_with_choices AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM quiz_questions_with_choices
    ORDER BY RANDOM()
    LIMIT question_count;
END;
$$ LANGUAGE plpgsql;

-- Create admin view for all questions (including archived)
CREATE OR REPLACE VIEW admin_questions_view AS
SELECT 
    q.id,
    q.prompt,
    q.explanation,
    q.source_span,
    q.article_id,
    q.status,
    q.archived_at,
    q.archived_by,
    q.archived_reason,
    q.scheduled_deletion_at,
    q.created_at,
    q.updated_at,
    a.title as article_title,
    a.source as article_source,
    -- Count recent responses (last 90 days)
    (
        SELECT COUNT(*)
        FROM responses r
        WHERE r.question_id = q.id 
        AND r.answered_at > NOW() - INTERVAL '90 days'
    ) as recent_response_count,
    -- Count total responses
    (
        SELECT COUNT(*)
        FROM responses r
        WHERE r.question_id = q.id
    ) as total_response_count
FROM questions q
JOIN articles a ON q.article_id = a.id;

-- Function to archive a question
CREATE OR REPLACE FUNCTION archive_question(
    question_id UUID,
    reason TEXT DEFAULT NULL,
    archived_by_user TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE questions
    SET 
        status = 'archived',
        archived_at = NOW(),
        archived_by = archived_by_user,
        archived_reason = reason,
        scheduled_deletion_at = NOW() + INTERVAL '30 days'
    WHERE id = question_id AND status = 'active';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to restore an archived question
CREATE OR REPLACE FUNCTION restore_question(question_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE questions
    SET 
        status = 'active',
        archived_at = NULL,
        archived_by = NULL,
        archived_reason = NULL,
        scheduled_deletion_at = NULL
    WHERE id = question_id AND status = 'archived';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to permanently delete old archived questions
CREATE OR REPLACE FUNCTION cleanup_old_archived_questions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    question_record RECORD;
BEGIN
    -- Only delete questions that:
    -- 1. Are archived
    -- 2. Have passed their scheduled deletion date
    -- 3. Have no responses in the last 90 days (safety check)
    
    FOR question_record IN 
        SELECT q.id
        FROM questions q
        WHERE q.status = 'archived'
        AND q.scheduled_deletion_at < NOW()
        AND (
            SELECT COUNT(*)
            FROM responses r
            WHERE r.question_id = q.id 
            AND r.answered_at > NOW() - INTERVAL '90 days'
        ) = 0
    LOOP
        -- Mark as deleted instead of actually deleting to preserve referential integrity
        UPDATE questions
        SET status = 'deleted'
        WHERE id = question_record.id;
        
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get questions by status for admin
CREATE OR REPLACE FUNCTION get_questions_by_status(filter_status TEXT DEFAULT 'all')
RETURNS SETOF admin_questions_view AS $$
BEGIN
    IF filter_status = 'all' THEN
        RETURN QUERY SELECT * FROM admin_questions_view ORDER BY created_at DESC;
    ELSE
        RETURN QUERY SELECT * FROM admin_questions_view WHERE status = filter_status ORDER BY created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_question IS 'Archives a question with reason and sets 30-day deletion schedule';
COMMENT ON FUNCTION restore_question IS 'Restores an archived question to active status';
COMMENT ON FUNCTION cleanup_old_archived_questions IS 'Marks old archived questions as deleted (soft delete)';
COMMENT ON FUNCTION get_questions_by_status IS 'Returns questions filtered by status for admin interface';