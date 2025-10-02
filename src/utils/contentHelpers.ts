import { supabase } from '../lib/supabase';

export interface Class {
  id: string;
  grade: string;
  class_name: string;
}

export interface ContentFormData {
  title: string;
  description: string;
  content: string;
  class_id: string;
  grade: string;
  file_url: string;
  type: 'mandatory' | 'additional';
  due_date: string;
  max_score: number;
}

export interface Assignment extends ContentFormData {
  id: string;
  created_at: string;
  updated_at: string;
  class?: Class;
  submission_count?: number;
  graded_count?: number;
  content_type: 'assignment';
}

export interface Material extends ContentFormData {
  id: string;
  created_at: string;
  updated_at: string;
  class?: Class;
  content_type: 'material';
}

export type ContentItem = Assignment | Material;

/**
 * Get all classes for a teacher
 */
export const fetchTeacherClasses = async (teacherId: string): Promise<Class[]> => {
  const { data, error } = await supabase
    .from('classes')
    .select('id, grade, class_name')
    .eq('teacher_id', teacherId)
    .order('grade, class_name');

  if (error) throw error;
  return data || [];
};

/**
 * Get classes by grade for a teacher
 */
export const fetchClassesByGrade = async (teacherId: string, grade: string): Promise<Class[]> => {
  const { data, error } = await supabase
    .from('classes')
    .select('id, grade, class_name')
    .eq('teacher_id', teacherId)
    .eq('grade', grade);

  if (error) throw error;
  return data || [];
};

/**
 * Create assignments for multiple classes
 */
export const createBulkAssignments = async (
  assignmentsData: Omit<Assignment, 'id' | 'created_at' | 'updated_at' | 'content_type'>[]
): Promise<void> => {
  const { error } = await supabase
    .from('assignments')
    .insert(assignmentsData);

  if (error) throw error;
};

/**
 * Update assignments for multiple classes
 */
export const updateBulkAssignments = async (
  classIds: string[],
  updateData: Partial<Assignment>
): Promise<void> => {
  const { error } = await supabase
    .from('assignments')
    .update(updateData)
    .in('class_id', classIds);

  if (error) throw error;
};

/**
 * Get content type label in Indonesian
 */
export const getContentTypeLabel = (type: string, contentType: string): string => {
  if (contentType === 'assignment') {
    return type === 'mandatory' ? 'Tugas Wajib' : 'Tugas Tambahan';
  }
  return 'Materi';
};

/**
 * Get content type color classes
 */
export const getContentTypeColor = (type: string, contentType: string): string => {
  if (contentType === 'assignment') {
    return type === 'mandatory' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  }
  return 'bg-green-100 text-green-800';
};

/**
 * Check if assignment is overdue
 */
export const isAssignmentOverdue = (dueDate: string): boolean => {
  return new Date(dueDate) < new Date();
};

/**
 * Format date for display
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Validate content form data
 */
export const validateContentData = (
  data: ContentFormData,
  contentType: 'assignment' | 'material'
): string | null => {
  if (!data.title) return 'Judul harus diisi';

  if (contentType === 'assignment') {
    if (data.type === 'mandatory') {
      if (!data.class_id) return 'Kelas harus dipilih untuk tugas wajib';
    } else {
      if (!data.grade) return 'Tingkat harus dipilih untuk tugas tambahan';
    }
    if (!data.due_date) return 'Batas waktu harus diisi';
  } else {
    if (!data.class_id) return 'Kelas harus dipilih untuk materi';
    if (!data.content && !data.file_url) return 'Konten materi atau file harus diisi';
  }

  return null;
};

/**
 * Get target classes for assignment creation/editing
 */
export const getTargetClasses = async (
  teacherId: string,
  type: 'mandatory' | 'additional',
  classId?: string,
  grade?: string
): Promise<{ classes: Class[]; count: number; displayName: string }> => {
  if (type === 'mandatory') {
    if (!classId) throw new Error('Class ID required for mandatory assignments');

    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, grade, class_name')
      .eq('id', classId)
      .eq('teacher_id', teacherId);

    if (error) throw error;

    const cls = classes?.[0];
    if (!cls) throw new Error('Class not found');

    return {
      classes: [cls],
      count: 1,
      displayName: `${cls.grade} ${cls.class_name}`
    };
  } else {
    if (!grade) throw new Error('Grade required for additional assignments');

    const classes = await fetchClassesByGrade(teacherId, grade);
    if (classes.length === 0) throw new Error(`No classes found for grade ${grade}`);

    return {
      classes,
      count: classes.length,
      displayName: `Tingkat ${grade}`
    };
  }
};

/**
 * Upload file for content
 */
export const uploadContentFile = async (
  file: File,
  userId: string,
  contentType: 'assignment' | 'material'
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${contentType === 'assignment' ? 'assignments' : 'materials'}/${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(contentType === 'assignment' ? 'assignments' : 'materials')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from(contentType === 'assignment' ? 'assignments' : 'materials')
    .getPublicUrl(filePath);

  return publicUrl;
};

/**
 * Delete content file
 */
export const deleteContentFile = async (fileUrl: string): Promise<void> => {
  // Extract file path from URL
  const urlParts = fileUrl.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const folderName = urlParts[urlParts.length - 2];
  const filePath = `${folderName}/${fileName}`;

  const { error } = await supabase.storage
    .from(folderName === 'assignments' ? 'assignments' : 'materials')
    .remove([filePath]);

  if (error) throw error;
};