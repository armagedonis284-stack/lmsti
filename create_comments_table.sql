-- Create assignment_comments table
-- Run this SQL in Supabase Dashboard > SQL Editor

-- Drop table if exists
DROP TABLE IF EXISTS assignment_comments CASCADE;

-- Create assignment_comments table
CREATE TABLE assignment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Ensure either student_id or teacher_id is provided, but not both
  CHECK (
    (student_id IS NOT NULL AND teacher_id IS NULL) OR 
    (student_id IS NULL AND teacher_id IS NOT NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_assignment_comments_assignment_id ON assignment_comments(assignment_id);
CREATE INDEX idx_assignment_comments_student_id ON assignment_comments(student_id);
CREATE INDEX idx_assignment_comments_teacher_id ON assignment_comments(teacher_id);
CREATE INDEX idx_assignment_comments_created_at ON assignment_comments(created_at);

-- Add RLS policies for assignment comments
ALTER TABLE assignment_comments ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view comments
CREATE POLICY "Allow authenticated users to view comments" ON assignment_comments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert comments
CREATE POLICY "Allow authenticated users to insert comments" ON assignment_comments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update their own comments
CREATE POLICY "Allow authenticated users to update their own comments" ON assignment_comments
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to delete their own comments
CREATE POLICY "Allow authenticated users to delete their own comments" ON assignment_comments
  FOR DELETE
  USING (auth.role() = 'authenticated');