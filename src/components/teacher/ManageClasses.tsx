import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Users, UserCog, CheckSquare, Edit, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ClassCardSkeleton } from '../ui/SkeletonLoader';

interface Class {
  id: string;
  grade: string;
  class_name: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
  student_count?: number;
}

const ManageClasses: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);
  const [newClass, setNewClass] = useState({ grade: '', class_name: '' });
  const [editClass, setEditClass] = useState({ grade: '', class_name: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchClasses();
    }
  }, [user, profile]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          students_classes(count)
        `)
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include student count
      const classesWithCount = data?.map(cls => ({
        ...cls,
        student_count: cls.students_classes?.[0]?.count || 0
      })) || [];

      setClasses(classesWithCount);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.grade || !newClass.class_name) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('classes')
        .insert({
          grade: newClass.grade,
          class_name: newClass.class_name,
          teacher_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setClasses(prev => [data, ...prev]);
      setNewClass({ grade: '', class_name: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Gagal membuat kelas');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClass = (cls: Class) => {
    setEditingClass(cls);
    setEditClass({ grade: cls.grade, class_name: cls.class_name });
    setShowEditModal(true);
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !editClass.grade || !editClass.class_name) return;

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('classes')
        .update({
          grade: editClass.grade,
          class_name: editClass.class_name
        })
        .eq('id', editingClass.id)
        .select()
        .single();

      if (error) throw error;

      setClasses(prev => prev.map(cls => cls.id === editingClass.id ? data : cls));
      setShowEditModal(false);
      setEditingClass(null);
      setEditClass({ grade: '', class_name: '' });
    } catch (error) {
      console.error('Error updating class:', error);
      alert('Gagal mengupdate kelas');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = (cls: Class) => {
    setDeletingClass(cls);
    setShowDeleteModal(true);
  };

  const confirmDeleteClass = async () => {
    if (!deletingClass) return;

    try {
      setDeleting(true);

      // Check if class has students
      const { data: students, error: studentsError } = await supabase
        .from('students_classes')
        .select('id')
        .eq('class_id', deletingClass.id);

      if (studentsError) throw studentsError;

      if (students && students.length > 0) {
        alert('Tidak dapat menghapus kelas yang masih memiliki siswa. Pindahkan siswa terlebih dahulu.');
        setShowDeleteModal(false);
        setDeletingClass(null);
        return;
      }

      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', deletingClass.id);

      if (error) throw error;

      setClasses(prev => prev.filter(cls => cls.id !== deletingClass.id));
      setShowDeleteModal(false);
      setDeletingClass(null);
    } catch (error) {
      console.error('Error deleting class:', error);
      alert('Gagal menghapus kelas');
    } finally {
      setDeleting(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <ClassCardSkeleton count={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Kelola Kelas</h1>
          <p className="text-sm text-gray-600 mt-1">Buat dan kelola kelas Anda</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center shadow-sm"
        >
          <Plus size={20} />
          <span className="hidden xs:inline">Tambah Kelas</span>
          <span className="xs:hidden">Tambah</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border">
          <h2 className="text-lg font-semibold mb-4">Tambah Kelas Baru</h2>
          <form onSubmit={handleCreateClass} className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tingkat
              </label>
              <select
                value={newClass.grade}
                onChange={(e) => setNewClass(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Pilih Tingkat</option>
                <option value="X">Kelas X</option>
                <option value="XI">Kelas XI</option>
                <option value="XII">Kelas XII</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Kelas
              </label>
              <input
                type="text"
                value={newClass.class_name}
                onChange={(e) => setNewClass(prev => ({ ...prev, class_name: e.target.value }))}
                placeholder="Contoh: IPA 1, IPS 2"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}


      <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 border hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <BookOpen className="text-blue-600 flex-shrink-0" size={24} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base sm:text-lg text-gray-800 leading-tight">
                    {cls.grade} {cls.class_name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Dibuat {new Date(cls.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span>{cls.student_count || 0} Siswa</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => navigate(`/teacher/classes/${cls.id}/students`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <UserCog size={16} />
                <span>Kelola</span>
              </button>
              <button
                onClick={() => navigate(`/teacher/classes/${cls.id}/attendance`)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckSquare size={16} />
                <span>Absen</span>
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEditClass(cls)}
                  className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-md transition-colors text-sm flex items-center justify-center shadow-sm"
                  title="Edit Kelas"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDeleteClass(cls)}
                  className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors text-sm flex items-center justify-center shadow-sm"
                  title="Hapus Kelas"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {classes.length === 0 && !loading && (
        <div className="text-center py-12">
          <BookOpen size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada kelas</h3>
          <p className="text-gray-600 mb-4">Buat kelas pertama Anda untuk mulai mengelola siswa</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Tambah Kelas Pertama
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Edit Kelas</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tingkat
                </label>
                <select
                  value={editClass.grade}
                  onChange={(e) => setEditClass(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Pilih Tingkat</option>
                  <option value="X">Kelas X</option>
                  <option value="XI">Kelas XI</option>
                  <option value="XII">Kelas XII</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  value={editClass.class_name}
                  onChange={(e) => setEditClass(prev => ({ ...prev, class_name: e.target.value }))}
                  placeholder="Contoh: IPA 1, IPS 2"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Update Kelas'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Hapus Kelas</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={deleting}
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Apakah Anda yakin ingin menghapus kelas <strong>{deletingClass.grade} {deletingClass.class_name}</strong>?
              </p>
              <p className="text-sm text-red-600">
                Tindakan ini tidak dapat dibatalkan. Pastikan kelas sudah tidak memiliki siswa.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmDeleteClass}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-md disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Hapus Kelas'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageClasses;