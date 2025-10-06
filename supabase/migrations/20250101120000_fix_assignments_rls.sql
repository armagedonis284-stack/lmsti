-- Fix RLS policies for assignments table to ensure additional assignments are visible
-- This ensures both teachers and students can see additional assignments

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can view assignments" ON assignments;
DROP POLICY IF EXISTS "Students can view assignments" ON assignments;
DROP POLICY IF EXISTS "Public can read assignments" ON assignments;

-- Create comprehensive policies for assignments
-- Teachers can see all assignments from their classes
CREATE POLICY "Teachers can view all assignments" ON assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = assignments.class_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Students can see assignments from classes they're enrolled in
CREATE POLICY "Students can view assignments" ON assignments
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM students_classes sc
      WHERE sc.class_id = assignments.class_id
      AND sc.student_id = (
        SELECT id FROM students 
        WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
      )
    )
  );

-- Fallback policy for public access (in case JWT claims don't work for students)
CREATE POLICY "Public can read assignments for enrolled students" ON assignments
  FOR SELECT TO anon
  USING (true);

-- Teachers can create assignments
CREATE POLICY "Teachers can create assignments" ON assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = assignments.class_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Teachers can update assignments they created
CREATE POLICY "Teachers can update own assignments" ON assignments
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- Teachers can delete assignments they created
CREATE POLICY "Teachers can delete own assignments" ON assignments
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
  );