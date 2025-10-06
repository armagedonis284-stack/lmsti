import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserPlus, Trash2, ArrowLeft, Mail, Phone, Calendar, Upload, Search, ChevronLeft, ChevronRight, ArrowUpDown, Eye, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { hashPassword, generatePasswordFromBirthDate } from '../../utils/auth';
import ExcelImport from './ExcelImport';

interface ClassData {
  id: string;
  grade: string;
  class_name: string;
  teacher_id: string;
  created_at: string;
}

interface Student {
  id: string;
  student_id: string;
  email: string;
  full_name: string;
  birth_date: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

const ClassStudents: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    birth_date: '',
    phone: '',
    address: ''
  });
  const [saving, setSaving] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Table functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<keyof Student>('full_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtered, sorted, and paginated students
  const processedStudents = useMemo(() => {
    let filtered = students.filter(student =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort students
    filtered.sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [students, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(processedStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = processedStudents.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: keyof Student) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    if (user && profile && classId) {
      fetchClassData();
      fetchStudents();
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

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('created_by', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.full_name || !newStudent.birth_date) return;

    try {
      setSaving(true);

      // Generate student credentials
      const { data: studentIdResult } = await supabase.rpc('generate_student_id');
      const { data: emailResult } = await supabase.rpc('generate_student_email', {
        student_name: newStudent.full_name
      });

      const defaultPassword = generatePasswordFromBirthDate(newStudent.birth_date);
      const hashedPassword = await hashPassword(defaultPassword);

      const { data: studentData, error } = await supabase
        .from('students')
        .insert({
          student_id: studentIdResult,
          email: emailResult,
          password: hashedPassword,
          full_name: newStudent.full_name,
          birth_date: newStudent.birth_date,
          phone: newStudent.phone || null,
          address: newStudent.address || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add student to class
      const { error: classError } = await supabase
        .from('students_classes')
        .insert({
          student_id: studentData.id,
          class_id: classId
        });

      if (classError) {
        console.error('Error adding student to class:', classError);
        // Don't throw here, student is created but not added to class
      }

      setStudents(prev => [studentData, ...prev]);
      setNewStudent({ full_name: '', birth_date: '', phone: '', address: '' });
      setShowAddForm(false);

      // Show success message with credentials
      alert(`Siswa berhasil ditambahkan!\n\nEmail: ${emailResult}\nPassword: ${defaultPassword}\n\nBerikan informasi ini kepada siswa.`);
    } catch (error) {
      console.error('Error creating student:', error);
      alert('Gagal menambahkan siswa. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  };


  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus siswa ini?')) return;

    try {
      const { error } = await supabase
        .from('students')
        .update({ is_active: false })
        .eq('id', studentId)
        .eq('created_by', user?.id);

      if (error) throw error;

      setStudents(prev => prev.filter(s => s.id !== studentId));
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Gagal menghapus siswa. Silakan coba lagi.');
    }
  };

  const handleExportClick = () => {
    if (students.length === 0) {
      alert('Tidak ada data siswa untuk diekspor');
      return;
    }
    setShowExportModal(true);
  };

  const exportStudentCredentials = () => {
    try {
      // Generate CSV content
      const csvHeader = 'No,Nama Lengkap,ID Siswa,Email,Password,Status\n';
      const csvRows = students.map((student, index) => {
        const password = generatePasswordFromBirthDate(student.birth_date);
        const status = student.is_active ? 'Aktif' : 'Nonaktif';
        return `${index + 1},"${student.full_name}","${student.student_id}","${student.email}","${password}","${status}"`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `kredensial_siswa_${classData?.grade}_${classData?.class_name}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Data kredensial siswa berhasil diekspor');
      setShowExportModal(false);
    } catch (error: any) {
      console.error('Error exporting student credentials:', error);
      alert('Gagal mengekspor data kredensial siswa');
    }
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
    <div className="p-3 sm:p-6">
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
            {classData.grade} {classData.class_name}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Kelola Siswa</p>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={handleExportClick}
              className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={students.length === 0}
              title={students.length === 0 ? "Tidak ada data siswa untuk diekspor" : "Export kredensial siswa"}
            >
              <Download size={20} />
              <span className="hidden sm:inline">Export Kredensial</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              onClick={() => setShowExcelImport(true)}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <Upload size={20} />
              <span className="hidden sm:inline">Import Excel</span>
              <span className="sm:hidden">Import</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <UserPlus size={20} />
              <span className="hidden sm:inline">Tambah Siswa</span>
              <span className="sm:hidden">Tambah</span>
            </button>
          </div>
        </div>

        {/* Results info */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-gray-600">
          <div>
            Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, processedStudents.length)} dari {processedStudents.length} siswa
          </div>
          <div>
            Total: <span className="font-semibold">{students.length}</span> siswa
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border">
          <h2 className="text-lg font-semibold mb-4">Tambah Siswa Baru</h2>
          <form onSubmit={handleCreateStudent} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={newStudent.full_name}
                onChange={(e) => setNewStudent(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Lahir *
              </label>
              <input
                type="date"
                value={newStudent.birth_date}
                onChange={(e) => setNewStudent(prev => ({ ...prev, birth_date: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Telepon
              </label>
              <input
                type="tel"
                value={newStudent.phone}
                onChange={(e) => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alamat
              </label>
              <input
                type="text"
                value={newStudent.address}
                onChange={(e) => setNewStudent(prev => ({ ...prev, address: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Tambah Siswa'}
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

      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('full_name')}
                    className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Nama Lengkap
                    <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('student_id')}
                    className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    ID Siswa
                    <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden md:table-cell">Tanggal Lahir</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden lg:table-cell">No. Telepon</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{student.full_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{student.student_id}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-gray-600 truncate max-w-xs block">{student.email}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-gray-600">{new Date(student.birth_date).toLocaleDateString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm text-gray-600">{student.phone || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                      title="Hapus Siswa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {processedStudents.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Halaman {currentPage} dari {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {students.length === 0 && !loading && (
        <div className="text-center py-12">
          <UserPlus size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada siswa</h3>
          <p className="text-gray-600 mb-4">Tambahkan siswa pertama untuk kelas ini</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            Tambah Siswa Pertama
          </button>
        </div>
      )}

      {students.length > 0 && processedStudents.length === 0 && (
        <div className="text-center py-12">
          <Search size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada hasil pencarian</h3>
          <p className="text-gray-600 mb-4">Coba kata kunci pencarian yang berbeda</p>
          <button
            onClick={() => setSearchTerm('')}
            className="text-blue-600 hover:text-blue-800"
          >
            Bersihkan pencarian
          </button>
        </div>
      )}

      {/* Excel Import Modal */}
      {showExcelImport && (
        <ExcelImport
          classId={classId!}
          onImportComplete={(successCount, errors) => {
            setShowExcelImport(false);
            if (successCount > 0) {
              fetchStudents(); // Refresh the student list
              alert(`Berhasil mengimport ${successCount} siswa`);
            }
            if (errors.length > 0) {
              alert(`Gagal mengimport ${errors.length} siswa:\n${errors.join('\n')}`);
            }
          }}
          onClose={() => setShowExcelImport(false)}
        />
      )}

      {/* Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Export Kredensial Siswa</h3>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Info:</strong> File CSV akan berisi data kredensial login semua siswa di kelas ini
                </p>
                <p className="text-sm text-blue-800">
                  Data yang akan diekspor: Nama, ID Siswa, Email, Password (format tanggal lahir), dan Status
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Kelas:</strong> {classData?.grade} {classData?.class_name}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Jumlah siswa:</strong> {students.length} siswa
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>Peringatan:</strong> File ini berisi informasi sensitif. Pastikan untuk menyimpannya dengan aman dan tidak membagikannya kepada pihak yang tidak berwenang.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={exportStudentCredentials}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassStudents;