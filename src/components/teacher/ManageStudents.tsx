import React, { useState, useEffect } from 'react';
import { Plus, Users, Eye, EyeOff, Trash2, CreditCard as Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { hashPassword, generateRandomPassword } from '../../utils/auth';

interface Student {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  student_auth?: {
    username: string;
    is_active: boolean;
  };
  classes: {
    id: string;
    class_name: string;
    grade: string;
  }[];
}

interface Class {
  id: string;
  class_name: string;
  grade: string;
}

const ManageStudents: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string, password: string} | null>(null);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Fetch teacher's classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user.id)
        .order('grade', { ascending: true });
      
      if (classesError) throw classesError;
      setClasses(classesData || []);

      // Fetch students from teacher's classes
      const classIds = classesData?.map(c => c.id) || [];
      if (classIds.length > 0) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('students_classes')
          .select(`
            student_id,
            users!inner (
              id,
              full_name,
              email,
              created_at,
              student_auth (
                username,
                is_active
              )
            ),
            classes (
              id,
              class_name,
              grade
            )
          `)
          .in('class_id', classIds);
        
        if (studentsError) throw studentsError;

        // Group students by student_id
        const studentMap = new Map<string, Student>();
        studentsData?.forEach(item => {
          const studentId = item.users.id;
          if (!studentMap.has(studentId)) {
            studentMap.set(studentId, {
              id: studentId,
              full_name: item.users.full_name,
              email: item.users.email,
              created_at: item.users.created_at,
              student_auth: item.users.student_auth?.[0],
              classes: []
            });
          }
          studentMap.get(studentId)!.classes.push(item.classes);
        });

        setStudents(Array.from(studentMap.values()));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedClassIds.length === 0) {
      setError('Pilih minimal satu kelas');
      return;
    }

    try {
      // Generate random password
      const password = generateRandomPassword();
      const hashedPassword = await hashPassword(password);

      // Create user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([{
          email,
          full_name: fullName,
          role: 'student'
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Create student auth record
      const { error: authError } = await supabase
        .from('student_auth')
        .insert([{
          username,
          password: hashedPassword,
          student_id: userData.id
        }]);

      if (authError) throw authError;

      // Add student to selected classes
      const enrollments = selectedClassIds.map(classId => ({
        student_id: userData.id,
        class_id: classId
      }));

      const { error: enrollmentError } = await supabase
        .from('students_classes')
        .insert(enrollments);

      if (enrollmentError) throw enrollmentError;

      // Show generated credentials
      setGeneratedCredentials({ username, password });
      setShowPasswordModal(true);
      setShowAddModal(false);
      
      // Reset form
      setFullName('');
      setEmail('');
      setUsername('');
      setSelectedClassIds([]);
      
      // Refresh data
      fetchData();
      setSuccess('Siswa berhasil ditambahkan');
    } catch (error: any) {
      console.error('Error adding student:', error);
      setError(error.message || 'Gagal menambahkan siswa');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Yakin ingin menghapus siswa ini?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', studentId);

      if (error) throw error;

      setSuccess('Siswa berhasil dihapus');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting student:', error);
      setError(error.message || 'Gagal menghapus siswa');
    }
  };

  const toggleStudentStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('student_auth')
        .update({ is_active: !currentStatus })
        .eq('student_id', studentId);

      if (error) throw error;

      setSuccess(`Status siswa berhasil ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchData();
    } catch (error: any) {
      console.error('Error updating student status:', error);
      setError(error.message || 'Gagal mengubah status siswa');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Manage Siswa</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Tambah Siswa
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Daftar Siswa</h2>
        </div>
        
        {students.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Belum ada siswa yang terdaftar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kelas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {student.full_name}
                        </div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.student_auth?.username || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {student.classes.map((cls) => (
                          <span
                            key={cls.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {cls.grade} - {cls.class_name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.student_auth?.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {student.student_auth?.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleStudentStatus(student.id, student.student_auth?.is_active || false)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {student.student_auth?.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tambah Siswa Baru</h3>
            
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pilih Kelas
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {classes.map((cls) => (
                    <label key={cls.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedClassIds.includes(cls.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClassIds([...selectedClassIds, cls.id]);
                          } else {
                            setSelectedClassIds(selectedClassIds.filter(id => id !== cls.id));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{cls.grade} - {cls.class_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Tambah Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Kredensial Login Siswa</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Penting:</strong> Simpan kredensial ini dan berikan kepada siswa
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <div className="p-3 bg-gray-50 border rounded-md font-mono text-sm">
                  {generatedCredentials.username}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="p-3 bg-gray-50 border rounded-md font-mono text-sm">
                  {generatedCredentials.password}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setGeneratedCredentials(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStudents