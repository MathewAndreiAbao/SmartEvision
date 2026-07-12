-- Migration: Add ai_analysis column to submissions table
-- This enables the AI Summarizer and Quality Scorer features to persist data.

ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Update RLS if necessary (usually JSONB columns inherit table-level RLS)
-- No changes needed to existing policies as they use table-level visibility.
