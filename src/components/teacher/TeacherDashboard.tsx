import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ClipboardList, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardStats {
  totalClasses: number;
  totalStudents: number;
  totalAssignments: number;
  todayAttendance: number;
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    todayAttendance: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    if (!user) return;
    
    try {
      // Get total classes
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id);
      
      if (classesError) throw classesError;

      // Get total students across all teacher's classes
      const classIds = classes?.map(c => c.id) || [];
      const { data: students, error: studentsError } = await supabase
        .from('students_classes')
        .select('student_id')
        .in('class_id', classIds);
      
      if (studentsError) throw studentsError;

      // Get total assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .in('class_id', classIds);
      
      if (assignmentsError) throw assignmentsError;

      // Get today's attendance sessions
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceSessions, error: attendanceError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .in('class_id', classIds)
        .eq('session_date', today);
      
      if (attendanceError) throw attendanceError;

      setStats({
        totalClasses: classes?.length || 0,
        totalStudents: new Set(students?.map(s => s.student_id)).size || 0,
        totalAssignments: assignments?.length || 0,
        todayAttendance: attendanceSessions?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Kelas',
      value: stats.totalClasses,
      icon: BookOpen,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Siswa',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      title: 'Total Tugas',
      value: stats.totalAssignments,
      icon: ClipboardList,
      color: 'bg-yellow-500',
    },
    {
      title: 'Absensi Hari Ini',
      value: stats.todayAttendance,
      icon: Calendar,
      color: 'bg-purple-500',
    },
  ];

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
        <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map(({ title, value, icon: Icon, color }) => (
          <div key={title} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className={`${color} rounded-full p-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
            <BookOpen className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="font-medium text-gray-800">Buat Kelas Baru</h3>
            <p className="text-sm text-gray-600">Tambahkan kelas untuk semester baru</p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
            <Users className="w-8 h-8 text-green-500 mb-2" />
            <h3 className="font-medium text-gray-800">Tambah Siswa</h3>
            <p className="text-sm text-gray-600">Daftarkan siswa baru ke kelas</p>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
            <Calendar className="w-8 h-8 text-purple-500 mb-2" />
            <h3 className="font-medium text-gray-800">Buat Absensi</h3>
            <p className="text-sm text-gray-600">Mulai sesi absensi untuk kelas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;