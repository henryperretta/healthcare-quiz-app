-- Healthcare Quiz App Database Schema
-- Run these commands in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Articles table
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    raw_html TEXT DEFAULT '',
    clean_text TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'processed', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    explanation TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',
    reviewed BOOLEAN DEFAULT FALSE,
    source_span TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Choices table
CREATE TABLE choices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL,
    UNIQUE(question_id, order_index)
);

-- Quiz sessions table
CREATE TABLE quiz_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    email TEXT,
    total_questions INTEGER NOT NULL DEFAULT 10,
    correct_answers INTEGER DEFAULT 0
);

-- Responses table
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    choice_id UUID REFERENCES choices(id),
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, question_id)
);

-- Prize claims table
CREATE TABLE prize_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES quiz_sessions(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'delivered', 'failed')) DEFAULT 'pending',
    delivered_at TIMESTAMPTZ
);

-- Indexes for better performance
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_created_at ON articles(created_at);
CREATE INDEX idx_questions_article_id ON questions(article_id);
CREATE INDEX idx_questions_reviewed ON questions(reviewed);
CREATE INDEX idx_choices_question_id ON choices(question_id);
CREATE INDEX idx_responses_session_id ON responses(session_id);
CREATE INDEX idx_quiz_sessions_finished_at ON quiz_sessions(finished_at);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_claims ENABLE ROW LEVEL SECURITY;

-- Policies for public access (adjust based on your security needs)
-- For now, allowing read access to approved content and write access to quiz data

-- Articles: public can read approved articles
CREATE POLICY "Articles are viewable by everyone" ON articles
    FOR SELECT USING (status = 'approved' OR status = 'processed');

-- Questions: public can read approved questions
CREATE POLICY "Questions are viewable by everyone" ON questions
    FOR SELECT USING (reviewed = true);

-- Choices: public can read choices for approved questions
CREATE POLICY "Choices are viewable by everyone" ON choices
    FOR SELECT USING (true);

-- Quiz sessions: users can create and read their own sessions
CREATE POLICY "Users can create quiz sessions" ON quiz_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read quiz sessions" ON quiz_sessions
    FOR SELECT USING (true);

CREATE POLICY "Users can update quiz sessions" ON quiz_sessions
    FOR UPDATE USING (true);

-- Responses: users can create and read responses
CREATE POLICY "Users can create responses" ON responses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read responses" ON responses
    FOR SELECT USING (true);

-- Prize claims: users can create and read prize claims
CREATE POLICY "Users can create prize claims" ON prize_claims
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read prize claims" ON prize_claims
    FOR SELECT USING (true);

-- Views for easier querying
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
WHERE q.reviewed = true
GROUP BY q.id, q.prompt, q.explanation, q.source_span, q.article_id, a.title, a.source;

-- Function to get random quiz questions
CREATE OR REPLACE FUNCTION get_random_quiz_questions(question_count INTEGER DEFAULT 10)
RETURNS SETOF quiz_questions_with_choices AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM quiz_questions_with_choices
    ORDER BY RANDOM()
    LIMIT question_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_random_quiz_questions IS 'Returns a random set of approved quiz questions with their choices';