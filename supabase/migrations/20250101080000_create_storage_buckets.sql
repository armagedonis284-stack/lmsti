-- Create storage buckets for file uploads
-- This allows students to upload files for assignment submissions

-- Create assignments bucket for student submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', true);

-- Create RLS policies for assignments bucket
CREATE POLICY "Students can upload assignment files" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'assignments');

CREATE POLICY "Students can view assignment files" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'assignments');

CREATE POLICY "Teachers can manage assignment files" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'assignments');