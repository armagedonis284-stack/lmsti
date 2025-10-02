import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ClipboardList, Calendar, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardCardSkeleton } from '../ui/SkeletonLoader';

interface DashboardStats {
  totalClasses: number;
  totalStudents: number;
  totalAssignments: number;
  todayAttendance: number;
  topPerformer?: {
    name: string;
    score: number;
    class: string;
  } | null;
  classAverage?: number;
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalClasses: 0,
    totalStudents: 0,
    totalAssignments: 0,
    todayAttendance: 0,
    topPerformer: undefined,
    classAverage: 0,
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

      // Get total assignments (count unique assignments by title for grade-based system)
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('title')
        .in('class_id', classIds);

      if (assignmentsError) throw assignmentsError;

      // Count unique assignment titles
      const uniqueAssignments = new Set(assignments?.map(a => a.title) || []);

      // Get today's attendance sessions
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceSessions, error: attendanceError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .in('class_id', classIds)
        .eq('session_date', today);
      
      if (attendanceError) throw attendanceError;

      // Get leaderboard data for top performer and class average
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select(`
          *,
          student:students(id, full_name, student_id),
          class:classes(grade, class_name)
        `)
        .in('assignment.class_id', classIds)
        .gte('graded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (scoresError) throw scoresError;

      // Calculate student averages
      const studentAverages = new Map();
      scores?.forEach(score => {
        const student = Array.isArray(score.student) ? score.student[0] : score.student;
        if (!student) return;

        if (!studentAverages.has(student.id)) {
          studentAverages.set(student.id, {
            student,
            total: 0,
            count: 0,
            class: Array.isArray(score.class) ? score.class[0] : score.class
          });
        }

        const data = studentAverages.get(student.id);
        data.total += score.score;
        data.count += 1;
      });

      // Find top performer
      let topPerformer = null;
      let classAverage = 0;
      const validStudents = Array.from(studentAverages.values()).filter(s => s.count > 0);

      if (validStudents.length > 0) {
        validStudents.forEach(student => {
          student.average = student.total / student.count;
        });

        validStudents.sort((a, b) => b.average - a.average);
        const top = validStudents[0];

        topPerformer = {
          name: top.student.full_name,
          score: Math.round(top.average * 100) / 100,
          class: top.class ? `${top.class.grade} ${top.class.class_name}` : 'Unknown'
        };

        classAverage = Math.round((validStudents.reduce((sum, s) => sum + s.average, 0) / validStudents.length) * 100) / 100;
      }

      setStats({
        totalClasses: classes?.length || 0,
        totalStudents: new Set(students?.map(s => s.student_id)).size || 0,
        totalAssignments: uniqueAssignments.size || 0,
        todayAttendance: attendanceSessions?.length || 0,
        topPerformer,
        classAverage,
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCardSkeleton count={4} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 bg-gray-300 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="h-4 w-20 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 w-full bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 w-3/4 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <FileText className="w-8 h-8 text-orange-500 mb-2" />
            <h3 className="font-medium text-gray-800">Kelola Konten</h3>
            <p className="text-sm text-gray-600">Kelola tugas dan materi pembelajaran</p>
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