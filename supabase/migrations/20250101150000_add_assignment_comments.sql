-- Add assignment comments table for student-teacher communication
-- This migration creates a comments table for assignments

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

-- Policy: Students can view comments on assignments in their classes
CREATE POLICY "Students can view comments on their class assignments" ON assignment_comments
  FOR SELECT
  USING (
    assignment_id IN (
      SELECT a.id 
      FROM assignments a
      JOIN students_classes sc ON a.class_id = sc.class_id
      WHERE sc.student_id = auth.uid()::uuid
    )
  );

-- Policy: Teachers can view comments on assignments they created
CREATE POLICY "Teachers can view comments on their assignments" ON assignment_comments
  FOR SELECT
  USING (
    assignment_id IN (
      SELECT a.id 
      FROM assignments a
      WHERE a.created_by = auth.uid()::uuid
    )
  );

-- Policy: Students can insert comments on assignments in their classes
CREATE POLICY "Students can insert comments on their class assignments" ON assignment_comments
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()::uuid AND
    assignment_id IN (
      SELECT a.id 
      FROM assignments a
      JOIN students_classes sc ON a.class_id = sc.class_id
      WHERE sc.student_id = auth.uid()::uuid
    )
  );

-- Policy: Teachers can insert comments on their assignments
CREATE POLICY "Teachers can insert comments on their assignments" ON assignment_comments
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid()::uuid AND
    assignment_id IN (
      SELECT a.id 
      FROM assignments a
      WHERE a.created_by = auth.uid()::uuid
    )
  );

-- Policy: Students can update their own comments
CREATE POLICY "Students can update their own comments" ON assignment_comments
  FOR UPDATE
  USING (student_id = auth.uid()::uuid)
  WITH CHECK (student_id = auth.uid()::uuid);

-- Policy: Teachers can update their own comments
CREATE POLICY "Teachers can update their own comments" ON assignment_comments
  FOR UPDATE
  USING (teacher_id = auth.uid()::uuid)
  WITH CHECK (teacher_id = auth.uid()::uuid);

-- Policy: Students can delete their own comments
CREATE POLICY "Students can delete their own comments" ON assignment_comments
  FOR DELETE
  USING (student_id = auth.uid()::uuid);

-- Policy: Teachers can delete their own comments
CREATE POLICY "Teachers can delete their own comments" ON assignment_comments
  FOR DELETE
  USING (teacher_id = auth.uid()::uuid);