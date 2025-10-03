import React, { useState, useEffect } from 'react';
import { BookOpen, ClipboardList, Trophy, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StudentStats {
  totalClasses: number;
  pendingAssignments: number;
  completedAssignments: number;
  averageScore: number;
}

interface ClassInfo {
  id: string;
  class_name: string;
  grade: string;
  teacher_name: string;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentStats>({
    totalClasses: 0,
    pendingAssignments: 0,
    completedAssignments: 0,
    averageScore: 0,
  });
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    if (!user) return;
    
    try {
      // Get student's classes
      const { data: studentClasses, error: classesError } = await supabase
        .from('students_classes')
        .select(`
          class_id,
          classes (
            id,
            class_name,
            grade,
            teacher_id,
            users!teacher_id (full_name)
          )
        `)
        .eq('student_id', user.id);
      
      if (classesError) throw classesError;

      const classIds = studentClasses?.map(sc => sc.class_id) || [];
      
      // Get all assignments for student's classes
      const { data: assignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id, class_id')
        .in('class_id', classIds);
      
      if (assignmentsError) throw assignmentsError;

      // Get student's submissions
      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('assignment_id')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds);
      
      if (submissionsError) throw submissionsError;

      // Get student's scores
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select('score, max_score')
        .eq('student_id', user.id);
      
      if (scoresError) throw scoresError;

      // Calculate stats
      const submittedAssignmentIds = new Set(submissions?.map(s => s.assignment_id) || []);
      const pendingAssignments = (assignments?.length || 0) - submittedAssignmentIds.size;
      const completedAssignments = submittedAssignmentIds.size;
      
      const totalScore = scores?.reduce((sum, score) => sum + score.score, 0) || 0;
      const totalMaxScore = scores?.reduce((sum, score) => sum + score.max_score, 0) || 1;
      const averageScore = Math.round((totalScore / totalMaxScore) * 100);

      // Format class data
      const classesInfo: ClassInfo[] = studentClasses?.map(sc => {
        const classData = Array.isArray(sc.classes) ? sc.classes[0] : sc.classes;
        const teacherData = classData?.users ? (Array.isArray(classData.users) ? classData.users[0] : classData.users) : null;

        return {
          id: classData?.id || '',
          class_name: classData?.class_name || '',
          grade: classData?.grade || '',
          teacher_name: teacherData?.full_name || 'Unknown',
        };
      }) || [];

      setStats({
        totalClasses: classIds.length,
        pendingAssignments,
        completedAssignments,
        averageScore: isNaN(averageScore) ? 0 : averageScore,
      });
      setClasses(classesInfo);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Kelas Diikuti',
      value: stats.totalClasses,
      icon: BookOpen,
      color: 'bg-blue-500',
    },
    {
      title: 'Tugas Tertunda',
      value: stats.pendingAssignments,
      icon: ClipboardList,
      color: 'bg-red-500',
    },
    {
      title: 'Tugas Selesai',
      value: stats.completedAssignments,
      icon: ClipboardList,
      color: 'bg-green-500',
    },
    {
      title: 'Rata-rata Nilai',
      value: `${stats.averageScore}%`,
      icon: Trophy,
      color: 'bg-yellow-500',
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
        <h1 className="text-2xl font-bold text-gray-800">Student Dashboard</h1>
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
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Kelas Saya</h2>
        {classes.length === 0 ? (
          <p className="text-gray-600">Anda belum terdaftar di kelas manapun.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((classInfo) => (
              <div key={classInfo.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">{classInfo.class_name}</h3>
                    <p className="text-sm text-gray-600">Grade: {classInfo.grade}</p>
                    <p className="text-sm text-gray-600">Teacher: {classInfo.teacher_name}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-blue-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;