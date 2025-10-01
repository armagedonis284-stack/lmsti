/*
  # Initial Schema for Classroom Management System

  1. New Tables
    - `users` - Extended user profiles with roles
    - `classes` - Class information
    - `students_classes` - Many-to-many relation between students and classes
    - `materials` - Class materials
    - `assignments` - Class assignments
    - `submissions` - Student assignment submissions
    - `scores` - Student scores/grades
    - `attendance_sessions` - Attendance sessions
    - `attendance_records` - Individual attendance records

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for teachers and students
*/

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('teacher', 'student')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Classes table
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade text NOT NULL,
  class_name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Junction table for students and classes
CREATE TABLE IF NOT EXISTS students_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(student_id, class_id)
);

-- Materials table
CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content text,
  file_url text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('mandatory', 'additional')) DEFAULT 'mandatory',
  due_date timestamptz,
  max_score integer DEFAULT 100,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text,
  file_url text,
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 0),
  max_score integer NOT NULL CHECK (max_score > 0),
  feedback text,
  graded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  graded_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Attendance sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_name text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  unique_code text UNIQUE,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'absent',
  marked_at timestamptz DEFAULT now(),
  marked_by uuid REFERENCES users(id),
  UNIQUE(session_id, student_id)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can read own data" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- Policies for classes table
CREATE POLICY "Teachers can manage their classes" ON classes
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can read classes they're enrolled in" ON classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students_classes sc 
      WHERE sc.class_id = classes.id AND sc.student_id = auth.uid()
    )
  );

-- Policies for students_classes table
CREATE POLICY "Teachers can manage student enrollments for their classes" ON students_classes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c 
      WHERE c.id = students_classes.class_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read their own enrollments" ON students_classes
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Policies for materials table
CREATE POLICY "Teachers can manage materials for their classes" ON materials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c 
      WHERE c.id = materials.class_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read materials from their classes" ON materials
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students_classes sc 
      WHERE sc.class_id = materials.class_id AND sc.student_id = auth.uid()
    )
  );

-- Policies for assignments table
CREATE POLICY "Teachers can manage assignments for their classes" ON assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c 
      WHERE c.id = assignments.class_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read assignments from their classes" ON assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students_classes sc 
      WHERE sc.class_id = assignments.class_id AND sc.student_id = auth.uid()
    )
  );

-- Policies for submissions table
CREATE POLICY "Students can manage their own submissions" ON submissions
  FOR ALL TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can read submissions for their class assignments" ON submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = submissions.assignment_id AND c.teacher_id = auth.uid()
    )
  );

-- Policies for scores table
CREATE POLICY "Teachers can manage scores for their class assignments" ON scores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON a.class_id = c.id
      WHERE a.id = scores.assignment_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read their own scores" ON scores
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Policies for attendance_sessions table
CREATE POLICY "Teachers can manage attendance sessions for their classes" ON attendance_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes c 
      WHERE c.id = attendance_sessions.class_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read attendance sessions from their classes" ON attendance_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students_classes sc 
      WHERE sc.class_id = attendance_sessions.class_id AND sc.student_id = auth.uid()
    )
  );

-- Policies for attendance_records table
CREATE POLICY "Teachers can manage attendance records for their classes" ON attendance_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM attendance_sessions ats
      JOIN classes c ON ats.class_id = c.id
      WHERE ats.id = attendance_records.session_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can read their own attendance records" ON attendance_records
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_classes_student_id ON students_classes(student_id);
CREATE INDEX IF NOT EXISTS idx_students_classes_class_id ON students_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_materials_class_id ON materials(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_assignment_id ON scores(assignment_id);
CREATE INDEX IF NOT EXISTS idx_scores_student_id ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON attendance_records(student_id);