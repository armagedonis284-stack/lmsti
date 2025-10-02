import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Users, UserCog, CheckSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

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
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClass, setNewClass] = useState({ grade: '', class_name: '' });
  const [saving, setSaving] = useState(false);

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
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
                onClick={() => window.location.href = `/teacher/classes/${cls.id}/students`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <UserCog size={16} />
                <span>Kelola</span>
              </button>
              <button
                onClick={() => window.location.href = `/teacher/classes/${cls.id}/attendance`}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckSquare size={16} />
                <span>Absen</span>
              </button>
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
    </div>
  );
};

export default ManageClasses;