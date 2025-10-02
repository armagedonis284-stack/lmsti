import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, X, Upload, CheckCircle, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  fetchTeacherClasses,
  validateContentData,
  getTargetClasses,
  uploadContentFile,
  ContentFormData
} from '../../utils/contentHelpers';

interface Class {
  id: string;
  grade: string;
  class_name: string;
}

type ContentType = 'assignment' | 'material';

const CreateContent: React.FC = () => {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contentType, setContentType] = useState<ContentType>('assignment');

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
    }
  }, [user, profile]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await fetchTeacherClasses(user?.id || '');
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    try {
      setUploading(true);
      const publicUrl = await uploadContentFile(file, user.id, contentType);
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

    // Validate using helper function
    const validationError = validateContentData(formData, contentType);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setSaving(true);

      if (contentType === 'assignment') {
        // Get target classes based on assignment type
        const { classes, count, displayName } = await getTargetClasses(
          user?.id || '',
          formData.type,
          formData.class_id,
          formData.grade
        );

        if (formData.type === 'mandatory') {
          // Create single assignment for specific class
          const { error } = await supabase
            .from('assignments')
            .insert({
              title: formData.title,
              description: formData.description,
              class_id: formData.class_id,
              type: formData.type,
              due_date: formData.due_date,
              max_score: formData.max_score,
              created_by: user?.id
            });

          if (error) throw error;
          alert(`Tugas wajib berhasil dibuat untuk ${displayName}`);
        } else {
          // Create assignments for all classes in the selected grade
          const assignmentsToInsert = classes.map(cls => ({
            title: formData.title,
            description: formData.description,
            class_id: cls.id,
            type: formData.type,
            due_date: formData.due_date,
            max_score: formData.max_score,
            created_by: user?.id
          }));

          const { error: assignmentError } = await supabase
            .from('assignments')
            .insert(assignmentsToInsert);

          if (assignmentError) throw assignmentError;
          alert(`Tugas tambahan berhasil dibuat untuk ${count} kelas ${formData.grade}`);
        }
      } else {
        // Create material for single class
        const { error } = await supabase
          .from('materials')
          .insert({
            title: formData.title,
            description: formData.description,
            content: formData.content,
            file_url: formData.file_url,
            class_id: formData.class_id,
            created_by: user?.id
          });

        if (error) throw error;
      }

      // Redirect back to content management
      window.location.href = '/teacher/content';
    } catch (error) {
      console.error('Error creating content:', error);
      alert('Gagal membuat konten');
    } finally {
      setSaving(false);
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} />
          <span>Kembali</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Buat Konten Baru</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Content Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Jenis Konten
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setContentType('assignment')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                contentType === 'assignment'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className={contentType === 'assignment' ? 'text-blue-600' : 'text-gray-400'} />
                <div>
                  <h3 className="font-medium text-gray-800">Tugas</h3>
                  <p className="text-sm text-gray-600">Berikan tugas untuk dinilai</p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setContentType('material')}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                contentType === 'material'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen size={24} className={contentType === 'material' ? 'text-green-600' : 'text-gray-400'} />
                <div>
                  <h3 className="font-medium text-gray-800">Materi</h3>
                  <p className="text-sm text-gray-600">Bagikan materi pembelajaran</p>
                </div>
              </div>
            </div>
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
                {contentType === 'material'
                  ? 'Kelas'
                  : formData.type === 'mandatory'
                    ? 'Kelas'
                    : 'Tingkat'
                } <span className="text-red-500">*</span>
              </label>

              {contentType === 'material' ? (
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
          {contentType === 'assignment' && (
            <>
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
            </>
          )}

          {/* Material specific fields */}
          {contentType === 'material' && (
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
                          Upload file
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
                    {formData.file_url && (
                      <p className="mt-2 text-sm text-green-600">File berhasil diupload</p>
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
              {saving ? 'Menyimpan...' : `Simpan ${contentType === 'assignment' ? 'Tugas' : 'Materi'}`}
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

export default CreateContent;