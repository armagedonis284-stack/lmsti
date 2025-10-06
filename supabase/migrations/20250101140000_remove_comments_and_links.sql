-- Remove comments and social features from assignments
-- This migration removes the assignment_comments table and link_url columns

-- Drop the assignment_comments table
DROP TABLE IF EXISTS assignment_comments CASCADE;

-- Remove link_url column from assignments table
ALTER TABLE assignments DROP COLUMN IF EXISTS link_url;

-- Remove link_url column from submissions table
ALTER TABLE submissions DROP COLUMN IF EXISTS link_url;