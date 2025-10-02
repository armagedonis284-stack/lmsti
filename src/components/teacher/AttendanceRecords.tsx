import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, XCircle, Clock, UserX, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';

interface AttendanceSession {
  id: string;
  session_name: string;
  session_date: string;
  unique_code: string;
  class?: {
    grade: string;
    class_name: string;
  };
}

interface AttendanceRecord {
  id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_at: string;
  student: {
    id: string;
    student_id: string;
    full_name: string;
    email: string;
  };
}

const AttendanceRecords: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user && profile && sessionId) {
      fetchSessionData();
      fetchAttendanceRecords();
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

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          students(id, student_id, full_name, email)
        `)
        .eq('session_id', sessionId)
        .order('marked_at');

      if (error) throw error;

      const formattedRecords = (data || []).map(record => ({
        ...record,
        student: record.students
      }));

      setRecords(formattedRecords);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="text-green-600" size={16} />;
      case 'late': return <Clock className="text-yellow-600" size={16} />;
      case 'excused': return <UserX className="text-blue-600" size={16} />;
      default: return <XCircle className="text-red-600" size={16} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present': return 'Hadir';
      case 'late': return 'Terlambat';
      case 'excused': return 'Izin';
      default: return 'Tidak Hadir';
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs rounded-full font-medium";
    switch (status) {
      case 'present': return `${baseClasses} bg-green-100 text-green-800`;
      case 'late': return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'excused': return `${baseClasses} bg-blue-100 text-blue-800`;
      default: return `${baseClasses} bg-red-100 text-red-800`;
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);

      const exportData = records.map(record => ({
        'ID Siswa': record.student.student_id,
        'Nama Lengkap': record.student.full_name,
        'Email': record.student.email,
        'Status': getStatusText(record.status),
        'Waktu Absen': new Date(record.marked_at).toLocaleString('id-ID')
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Absensi');

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // ID Siswa
        { wch: 25 }, // Nama Lengkap
        { wch: 30 }, // Email
        { wch: 12 }, // Status
        { wch: 20 }  // Waktu Absen
      ];

      const fileName = `absensi_${session?.session_name}_${session?.session_date}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Gagal export ke Excel. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  const getAttendanceStats = () => {
    const stats = {
      present: records.filter(r => r.status === 'present').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
      absent: records.filter(r => r.status === 'absent').length,
      total: records.length
    };
    return stats;
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
            onClick={() => navigate('/teacher/attendance')}
            className="text-blue-600 hover:text-blue-800"
          >
            Kembali ke manajemen absensi
          </button>
        </div>
      </div>
    );
  }

  const stats = getAttendanceStats();

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/teacher/attendance')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={20} />
          Kembali
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Record Absensi: {session.session_name}
          </h1>
          <p className="text-gray-600">
            {session.class?.grade} {session.class?.class_name} • {new Date(session.session_date).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            <div>
              <p className="text-sm text-green-600">Hadir</p>
              <p className="text-2xl font-bold text-green-800">{stats.present}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="text-yellow-600" size={20} />
            <div>
              <p className="text-sm text-yellow-600">Terlambat</p>
              <p className="text-2xl font-bold text-yellow-800">{stats.late}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <UserX className="text-blue-600" size={20} />
            <div>
              <p className="text-sm text-blue-600">Izin</p>
              <p className="text-2xl font-bold text-blue-800">{stats.excused}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600" size={20} />
            <div>
              <p className="text-sm text-red-600">Tidak Hadir</p>
              <p className="text-2xl font-bold text-red-800">{stats.absent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600">
          Total Record: <span className="font-semibold">{records.length}</span>
        </div>
        <button
          onClick={exportToExcel}
          disabled={exporting || records.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          <Download size={20} />
          {exporting ? 'Mengekspor...' : 'Export ke Excel'}
        </button>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-800">Detail Absensi</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">No</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID Siswa</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nama Lengkap</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Waktu Absen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record, index) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{record.student.student_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{record.student.full_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.status)}
                      <span className={getStatusBadge(record.status)}>
                        {getStatusText(record.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(record.marked_at).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <div className="text-center py-8">
            <Users size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Belum ada data absensi untuk sesi ini</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceRecords;