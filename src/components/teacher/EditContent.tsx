import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, X, Trash2, Upload, CheckCircle, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Class {
  id: string;
  grade: string;
  class_name: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: 'mandatory' | 'additional';
  due_date: string;
  max_score: number;
  class_id: string;
  created_at: string;
  updated_at: string;
  content_type: 'assignment';
}

interface Material {
  id: string;
  title: string;
  description: string;
  content: string;
  file_url: string;
  class_id: string;
  created_at: string;
  updated_at: string;
  content_type: 'material';
}

type ContentItem = Assignment | Material;

const EditContent: React.FC = () => {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [content, setContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    class_id: '',
    grade: '',
    file_url: '',
    // Assignment specific fields
    type: 'mandatory' as 'mandatory' | 'additional',
    due_date: '',
    max_score: 100
  });

  useEffect(() => {
    if (user && profile) {
      fetchClasses();
      fetchContent();
    }
  }, [user, profile]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, grade, class_name')
        .eq('teacher_id', user?.id)
        .order('grade, class_name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchContent = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const contentId = urlParams.get('id');

      if (!contentId) {
        alert('ID konten tidak ditemukan');
        window.location.href = '/teacher/content';
        return;
      }

      // Try to fetch as assignment first
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', contentId)
        .single();

      if (!assignmentError && assignmentData) {
        // Verify that the assignment belongs to the current teacher
        if (assignmentData.created_by !== user?.id) {
          alert('Anda tidak memiliki akses untuk mengedit konten ini');
          window.location.href = '/teacher/content';
          return;
        }

        setContent({ ...assignmentData, content_type: 'assignment' });
        // Get the grade of the class this assignment belongs to
        const { data: classData } = await supabase
          .from('classes')
          .select('grade')
          .eq('id', assignmentData.class_id)
          .single();

        setFormData({
          title: assignmentData.title,
          description: assignmentData.description || '',
          content: '',
          class_id: assignmentData.class_id,
          grade: classData?.grade || '',
          file_url: '',
          type: assignmentData.type,
          due_date: new Date(assignmentData.due_date).toISOString().slice(0, 16),
          max_score: assignmentData.max_score
        });
        return;
      }

      // Try to fetch as material
      const { data: materialData, error: materialError } = await supabase
        .from('materials')
        .select('*')
        .eq('id', contentId)
        .single();

      if (!materialError && materialData) {
        // Verify that the material belongs to the current teacher
        if (materialData.created_by !== user?.id) {
          alert('Anda tidak memiliki akses untuk mengedit konten ini');
          window.location.href = '/teacher/content';
          return;
        }

        setContent({ ...materialData, content_type: 'material' });
        setFormData({
          title: materialData.title,
          description: materialData.description || '',
          content: materialData.content || '',
          class_id: materialData.class_id,
          grade: '',
          file_url: materialData.file_url || '',
          type: 'mandatory',
          due_date: '',
          max_score: 100
        });
        return;
      }

      throw new Error('Content not found');
    } catch (error) {
      console.error('Error fetching content:', error);
      alert('Gagal memuat data konten');
      window.location.href = '/teacher/content';
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${content?.content_type === 'assignment' ? 'assignments' : 'materials'}/${user?.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(content?.content_type === 'assignment' ? 'assignments' : 'materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(content?.content_type === 'assignment' ? 'assignments' : 'materials')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, file_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Gagal mengupload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      alert('Mohon lengkapi field yang wajib diisi');
      return;
    }

    // Validate content type specific fields
    if (content?.content_type === 'assignment') {
      if (formData.type === 'mandatory') {
        if (!formData.class_id || !formData.due_date) {
          alert('Mohon isi kelas dan batas waktu untuk tugas wajib');
          return;
        }
      } else {
        if (!formData.grade || !formData.due_date) {
          alert('Mohon isi tingkat dan batas waktu untuk tugas tambahan');
          return;
        }
      }
    } else {
      if (!formData.class_id) {
        alert('Mohon pilih kelas untuk materi');
        return;
      }
      if (!formData.content && !formData.file_url) {
        alert('Mohon isi konten materi atau upload file');
        return;
      }
    }

    try {
      setSaving(true);

      if (content?.content_type === 'assignment') {
        if (formData.type === 'mandatory') {
          // Update single assignment for specific class
          const { error } = await supabase
            .from('assignments')
            .update({
              title: formData.title,
              description: formData.description,
              class_id: formData.class_id,
              type: formData.type,
              due_date: formData.due_date,
              max_score: formData.max_score
            })
            .eq('id', content.id);

          if (error) throw error;

          // Get class info for confirmation message
          const { data: classData } = await supabase
            .from('classes')
            .select('grade, class_name')
            .eq('id', formData.class_id)
            .single();

          alert(`Tugas wajib berhasil diupdate untuk ${classData?.grade} ${classData?.class_name}`);
        } else {
          // Update all assignments for all classes in the selected grade
          const { data: gradeClasses, error: gradeError } = await supabase
            .from('classes')
            .select('id')
            .eq('teacher_id', user?.id)
            .eq('grade', formData.grade);

          if (gradeError) throw gradeError;

          if (gradeClasses.length === 0) {
            alert(`Tidak ada kelas ${formData.grade} yang ditemukan`);
            return;
          }

          // Update all assignments for classes in this grade
          const { error: updateError } = await supabase
            .from('assignments')
            .update({
              title: formData.title,
              description: formData.description,
              type: formData.type,
              due_date: formData.due_date,
              max_score: formData.max_score
            })
            .in('class_id', gradeClasses.map(c => c.id));

          if (updateError) throw updateError;

          alert(`Tugas tambahan berhasil diupdate untuk ${gradeClasses.length} kelas ${formData.grade}`);
        }
      } else {
        // Update single material
        const { error } = await supabase
          .from('materials')
          .update({
            title: formData.title,
            description: formData.description,
            content: formData.content,
            file_url: formData.file_url,
            class_id: formData.class_id
          })
          .eq('id', content?.id);

        if (error) throw error;
      }

      // Redirect back to content management
      window.location.href = '/teacher/content';
    } catch (error) {
      console.error('Error updating content:', error);
      alert('Gagal mengupdate konten');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus konten ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      setDeleting(true);
      const table = content?.content_type === 'assignment' ? 'assignments' : 'materials';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', content?.id);

      if (error) throw error;

      window.location.href = '/teacher/content';
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Gagal menghapus konten');
    } finally {
      setDeleting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-600">Konten tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            <span>Kembali</span>
          </button>
          <div className="flex items-center gap-3">
            {content.content_type === 'assignment' ? (
              <CheckCircle size={24} className="text-blue-600" />
            ) : (
              <BookOpen size={24} className="text-green-600" />
            )}
            <h1 className="text-2xl font-bold text-gray-800">
              Edit {content.content_type === 'assignment' ? 'Tugas' : 'Materi'}
            </h1>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center gap-2"
        >
          <Trash2 size={16} />
          {deleting ? 'Menghapus...' : 'Hapus'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Content Type Display */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {content.content_type === 'assignment' ? (
              <CheckCircle size={20} className="text-blue-600" />
            ) : (
              <BookOpen size={20} className="text-green-600" />
            )}
            <span className="font-medium text-gray-800">
              Mengedit: {content.content_type === 'assignment' ? 'Tugas' : 'Materi'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Judul <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan judul"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {content.content_type === 'material'
                  ? 'Kelas'
                  : formData.type === 'mandatory'
                    ? 'Kelas'
                    : 'Tingkat'
                } <span className="text-red-500">*</span>
              </label>

              {content.content_type === 'material' ? (
                <select
                  value={formData.class_id}
                  onChange={(e) => handleInputChange('class_id', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Pilih Kelas</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.grade} {cls.class_name}
                    </option>
                  ))}
                </select>
              ) : (
                formData.type === 'mandatory' ? (
                  <select
                    value={formData.class_id}
                    onChange={(e) => handleInputChange('class_id', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.grade} {cls.class_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={formData.grade}
                    onChange={(e) => handleInputChange('grade', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Pilih Tingkat</option>
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Jelaskan tentang konten ini"
            />
          </div>

          {/* Assignment specific fields */}
          {content.content_type === 'assignment' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipe Tugas
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="mandatory">Wajib</option>
                  <option value="additional">Tambahan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batas Waktu <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => handleInputChange('due_date', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nilai Maksimal
                </label>
                <input
                  type="number"
                  value={formData.max_score}
                  onChange={(e) => handleInputChange('max_score', parseInt(e.target.value) || 100)}
                  min="1"
                  max="1000"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Material specific fields */}
          {content.content_type === 'material' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konten Materi
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Masukkan konten materi pembelajaran"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Pendukung
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          {formData.file_url ? 'Ganti file' : 'Upload file'}
                        </span>
                        <span className="mt-1 block text-sm text-gray-500">
                          PDF, DOC, PPT, atau file lainnya
                        </span>
                      </label>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </div>
                    {uploading && (
                      <p className="mt-2 text-sm text-blue-600">Mengupload file...</p>
                    )}
                    {formData.file_url && !uploading && (
                      <p className="mt-2 text-sm text-green-600">File tersedia</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Menyimpan...' : 'Update Konten'}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              <X size={18} />
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContent;