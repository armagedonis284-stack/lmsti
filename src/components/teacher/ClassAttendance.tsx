import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Users, AlertCircle, Eye, CheckSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ClassData {
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
  created_at: string;
  attendance_count?: number;
}

const ClassAttendance: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSession, setNewSession] = useState({ session_name: '', session_date: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user && profile && classId) {
      fetchClassData();
      fetchSessions();
    }
  }, [user, profile, classId]);

  const fetchClassData = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .eq('teacher_id', user?.id)
        .single();

      if (error) throw error;
      setClassData(data);
    } catch (error) {
      console.error('Error fetching class data:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get attendance count for each session
      const sessionsWithCount = await Promise.all(
        (data || []).map(async (session) => {
          const { count } = await supabase
            .from('attendance_records')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          return {
            ...session,
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
    if (!newSession.session_name) return;

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
          class_id: classId,
          session_name: newSession.session_name,
          session_date: newSession.session_date || new Date().toISOString().split('T')[0],
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
      setNewSession({ session_name: '', session_date: '' });

      // Navigate to take attendance for this session
      navigate(`/teacher/classes/${classId}/attendance/${data.id}`);
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

  if (!classData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Kelas tidak ditemukan</h2>
          <button
            onClick={() => navigate('/teacher/classes')}
            className="text-blue-600 hover:text-blue-800"
          >
            Kembali ke daftar kelas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/teacher/classes')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Kembali</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 leading-tight">
            Absensi: {classData.grade} {classData.class_name}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Kelola sesi absensi untuk kelas ini</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="text-sm text-gray-600">
          Total Sesi: <span className="font-semibold">{sessions.length}</span>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          Tambah Absen
        </button>
      </div>

      {/* Create Session Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border">
          <h2 className="text-lg font-semibold mb-4">Buat Sesi Absensi Baru</h2>
          <form onSubmit={handleCreateSession} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Sesi *
              </label>
              <input
                type="text"
                value={newSession.session_name}
                onChange={(e) => setNewSession(prev => ({ ...prev, session_name: e.target.value }))}
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
                value={newSession.session_date}
                onChange={(e) => setNewSession(prev => ({ ...prev, session_date: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2">
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
      <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6 border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="text-blue-600 flex-shrink-0" size={24} />
                <div className="min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg text-gray-800 truncate">
                    {session.session_name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {formatDate(session.session_date)}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge(session)}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <AlertCircle size={16} />
                <span>Kode: <strong>{session.unique_code}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                <Users size={16} />
                <span>{session.attendance_count} siswa hadir</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => navigate(`/teacher/classes/${classId}/attendance/${session.id}`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-1"
              >
                <CheckSquare size={16} />
                <span className="hidden sm:inline">Ambil Absensi</span>
                <span className="sm:hidden">Absensi</span>
              </button>
              <button
                onClick={() => navigate(`/teacher/classes/${classId}/attendance/${session.id}/records`)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-1"
              >
                <Eye size={16} />
                <span className="hidden sm:inline">Lihat Record</span>
                <span className="sm:hidden">Record</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && !loading && (
        <div className="text-center py-12">
          <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada sesi absensi</h3>
          <p className="text-gray-600 mb-4">Buat sesi absensi pertama untuk kelas ini</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Tambah Absen Pertama
          </button>
        </div>
      )}
    </div>
  );
};

export default ClassAttendance;