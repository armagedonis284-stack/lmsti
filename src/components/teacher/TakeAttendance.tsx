import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, XCircle, Clock, UserX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

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
  class?: {
    grade: string;
    class_name: string;
  };
}

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
}

interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_at: string;
  marked_by: string;
  student?: Student;
}

const TakeAttendance: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (user && profile && sessionId) {
      fetchSessionData();
      fetchStudents();
      fetchExistingRecords();
    }
  }, [user, profile, sessionId]);

  const fetchSessionData = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .select(`
          *,
          classes(grade, class_name)
        `)
        .eq('id', sessionId)
        .eq('created_by', user?.id)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error fetching session:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      // Get students from the class associated with this session
      const { data: sessionData } = await supabase
        .from('attendance_sessions')
        .select('class_id')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        const { data, error } = await supabase
          .from('students')
          .select('id, student_id, full_name, email')
          .eq('created_by', user?.id)
          .eq('is_active', true)
          .order('full_name');

        if (error) throw error;
        setStudents(data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchExistingRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          students(id, student_id, full_name, email)
        `)
        .eq('session_id', sessionId);

      if (error) throw error;

      const recordsMap = new Map();
      (data || []).forEach(record => {
        recordsMap.set(record.student_id, record);
      });
      setAttendanceRecords(recordsMap);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (studentId: string, selected: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (selected) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
    setSelectAll(newSelected.size === students.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedStudents(new Set());
      setSelectAll(false);
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
      setSelectAll(true);
    }
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'late' | 'excused', checked: boolean) => {
    const newRecords = new Map(attendanceRecords);

    if (checked) {
      // Add or update record for selected status
      newRecords.set(studentId, {
        id: '', // Will be set by database
        session_id: sessionId!,
        student_id: studentId,
        status,
        marked_at: new Date().toISOString(),
        marked_by: user?.id || '',
        student: students.find(s => s.id === studentId)
      });
    } else {
      // If unchecked, remove the record (mark as absent)
      newRecords.delete(studentId);
    }

    setAttendanceRecords(newRecords);
  };

  const handleSaveAttendance = async () => {
    if (!sessionId) return;

    try {
      setSaving(true);

      // Delete existing records for this session
      await supabase
        .from('attendance_records')
        .delete()
        .eq('session_id', sessionId);

      // Insert new records
      const recordsToInsert = Array.from(attendanceRecords.values()).map(record => ({
        session_id: sessionId,
        student_id: record.student_id,
        status: record.status,
        marked_at: record.marked_at,
        marked_by: record.marked_by
      }));

      if (recordsToInsert.length > 0) {
        const { error } = await supabase
          .from('attendance_records')
          .insert(recordsToInsert);

        if (error) throw error;
      }

      alert(`Berhasil menyimpan absensi untuk ${recordsToInsert.length} siswa`);
      navigate('/teacher/classes');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Gagal menyimpan absensi. Silakan coba lagi.');
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

  if (!session) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Sesi absensi tidak ditemukan</h2>
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/teacher/classes')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Kembali</span>
          <span className="sm:hidden">Back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Absensi: {session.session_name}
          </h1>
          <p className="text-gray-600">
            {session.class?.grade} {session.class?.class_name} • {new Date(session.session_date).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-sm text-gray-600">Kode Unik</p>
            <p className="font-semibold text-base sm:text-lg break-all">{session.unique_code}</p>
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs sm:text-sm text-gray-600">Total Siswa</p>
            <p className="font-semibold text-base sm:text-lg">{students.length}</p>
          </div>
          <div className="text-center xs:col-span-2 sm:col-span-1 sm:text-left">
            <p className="text-xs sm:text-sm text-gray-600">Sudah Absen</p>
            <p className="font-semibold text-base sm:text-lg">{attendanceRecords.size}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Pilih Semua</span>
            </label>

            {selectedStudents.size > 0 && (
              <span className="text-sm text-gray-600">
                {selectedStudents.size} siswa dipilih
              </span>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                selectedStudents.forEach(studentId => {
                  handleStatusChange(studentId, 'present', true);
                });
              }}
              disabled={selectedStudents.size === 0}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              Tandai Hadir
            </button>
            <button
              onClick={() => {
                selectedStudents.forEach(studentId => {
                  handleStatusChange(studentId, 'late', true);
                });
              }}
              disabled={selectedStudents.size === 0}
              className="flex-1 sm:flex-none bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              Tandai Terlambat
            </button>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-800">Daftar Siswa</h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {students.map((student) => {
            const record = attendanceRecords.get(student.id);
            return (
              <div key={student.id} className="p-4 border-b last:border-b-0 hover:bg-gray-50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={(e) => {
                        handleStudentSelect(student.id, e.target.checked);
                      }}
                      className="rounded border-gray-300"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 truncate">{student.full_name}</p>
                      <p className="text-sm text-gray-600">ID: {student.student_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={record?.status === 'present'}
                        onChange={(e) => handleStatusChange(student.id, 'present', e.target.checked)}
                        className="w-3 h-3 text-green-600 rounded focus:ring-green-500"
                      />
                      <CheckCircle size={14} className="text-green-600" />
                      <span className="hidden sm:inline">Hadir</span>
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={record?.status === 'late'}
                        onChange={(e) => handleStatusChange(student.id, 'late', e.target.checked)}
                        className="w-3 h-3 text-yellow-600 rounded focus:ring-yellow-500"
                      />
                      <Clock size={14} className="text-yellow-600" />
                      <span className="hidden sm:inline">Terlambat</span>
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={record?.status === 'excused'}
                        onChange={(e) => handleStatusChange(student.id, 'excused', e.target.checked)}
                        className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <UserX size={14} className="text-blue-600" />
                      <span className="hidden sm:inline">Izin</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSaveAttendance}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Menyimpan...' : 'Simpan Absensi'}
        </button>
      </div>
    </div>
  );
};

export default TakeAttendance;