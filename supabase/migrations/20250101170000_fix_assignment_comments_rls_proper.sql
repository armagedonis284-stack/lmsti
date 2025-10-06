-- Fix assignment comments RLS policies with proper access control
-- This migration creates proper RLS policies that check user access to assignments

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated users to view comments" ON assignment_comments;
DROP POLICY IF EXISTS "Allow authenticated users to insert comments" ON assignment_comments;
DROP POLICY IF EXISTS "Allow authenticated users to update their own comments" ON assignment_comments;
DROP POLICY IF EXISTS "Allow authenticated users to delete their own comments" ON assignment_comments;

-- Create proper RLS policies that check assignment access

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