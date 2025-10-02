import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Users, AlertCircle, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Class {
  id: string;
  grade: string;
  class_name: string;
  teacher_id: string;
  created_at: string;
}

interface AttendanceSession {
  id: string;
  class_id: string;
  session_name: string;
  session_date: string;
  unique_code: string;
  expires_at: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  class?: Class;
  attendance_count?: number;
}

const ManageAttendance: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchClasses();
      fetchSessions();
    }
  }, [user, profile]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('grade', { ascending: true })
        .order('class_name', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(`
          *,
          classes(grade, class_name)
        `)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include class info and attendance count
      const sessionsWithCount = await Promise.all(
        (data || []).map(async (session) => {
          const { count } = await supabase
            .from('attendance_records')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          return {
            ...session,
            class: session.classes,
            attendance_count: count || 0
          };
        })
      );

      setSessions(sessionsWithCount);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !sessionName) return;

    try {
      setCreating(true);

      // Generate unique code for the session
      const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Set expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          class_id: selectedClass,
          session_name: sessionName,
          session_date: sessionDate,
          unique_code: uniqueCode,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => [data, ...prev]);
      setShowCreateForm(false);
      setSelectedClass('');
      setSessionName('');
      setSessionDate(new Date().toISOString().split('T')[0]);

      // Navigate to take attendance for this session
      navigate(`/teacher/attendance/${data.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Gagal membuat sesi absensi. Silakan coba lagi.');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (session: AttendanceSession) => {
    if (!session.is_active) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Selesai</span>;
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    if (now > expiresAt) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Kadaluarsa</span>;
    }

    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Aktif</span>;
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Manajemen Absensi</h1>
          <p className="text-gray-600">Kelola sesi absensi dan catat kehadiran siswa</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Buat Sesi Absensi
        </button>
      </div>

      {/* Create Session Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border">
          <h2 className="text-lg font-semibold mb-4">Buat Sesi Absensi Baru</h2>
          <form onSubmit={handleCreateSession} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pilih Kelas *
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Pilih Kelas</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.grade} {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Sesi *
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Contoh: Absensi Hari Ini, Ujian Matematika"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Absensi *
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {creating ? 'Membuat...' : 'Buat Sesi'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-semibold text-lg text-gray-800">
                    {session.session_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {session.class?.grade} {session.class?.class_name}
                  </p>
                </div>
              </div>
              {getStatusBadge(session)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>{formatDate(session.session_date)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle size={16} />
                <span>Kode: <strong>{session.unique_code}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={16} />
                <span>{session.attendance_count} siswa hadir</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/teacher/attendance/${session.id}`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md transition-colors text-sm"
              >
                Ambil Absensi
              </button>
              <button
                onClick={() => navigate(`/teacher/attendance/${session.id}/records`)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded-md transition-colors text-sm"
              >
                Lihat Record
              </button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && !loading && (
        <div className="text-center py-12">
          <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada sesi absensi</h3>
          <p className="text-gray-600 mb-4">Buat sesi absensi pertama untuk mulai mencatat kehadiran siswa</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Buat Sesi Pertama
          </button>
        </div>
      )}
    </div>
  );
};

export default ManageAttendance;