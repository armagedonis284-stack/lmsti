import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp, Filter, Calendar, Users, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { StatsCardSkeleton, LeaderboardSkeleton } from '../ui/SkeletonLoader';

interface Class {
  id: string;
  grade: string;
  class_name: string;
}

interface Student {
  id: string;
  full_name: string;
  student_id: string;
}

interface StudentStats {
  student: Student;
  class: Class;
  total_assignments: number;
  completed_assignments: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  total_points: number;
  rank: number;
}

interface LeaderboardFilters {
  selected_grade: string;
  time_period: 'all' | 'month' | 'semester';
}

const TeacherLeaderboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [leaderboard, setLeaderboard] = useState<StudentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    selected_grade: 'all',
    time_period: 'all'
  });

  useEffect(() => {
    if (user && profile) {
      fetchClasses();
      fetchLeaderboard();
    }
  }, [user, profile, filters]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, grade, class_name')
        .eq('teacher_id', user?.id)
        .order('grade, class_name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // Get all classes for the teacher
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, grade, class_name')
        .eq('teacher_id', user?.id);

      if (classesError) throw classesError;

      const classIds = classes?.map(c => c.id) || [];

      if (classIds.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Get all students from teacher's classes
      const { data: enrolledStudents, error: studentsError } = await supabase
        .from('students_classes')
        .select(`
          student_id,
          class_id,
          student:students(id, full_name, student_id),
          class:classes(id, grade, class_name)
        `)
        .in('class_id', classIds);

      if (studentsError) throw studentsError;

      // Get assignments for teacher's classes first
      const { data: assignmentsForClasses, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .in('class_id', classIds);

      if (assignmentsError) throw assignmentsError;

      const assignmentIds = assignmentsForClasses?.map(a => a.id) || [];

      if (assignmentIds.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Get all scores with time filtering
      let scoresQuery = supabase
        .from('scores')
        .select(`
          *,
          student:students(id, full_name, student_id),
          assignment:assignments(title, created_at, class:classes(grade, class_name))
        `)
        .in('assignment_id', assignmentIds);

      // Apply time period filter
      if (filters.time_period === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        scoresQuery = scoresQuery.gte('graded_at', oneMonthAgo.toISOString());
      } else if (filters.time_period === 'semester') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        scoresQuery = scoresQuery.gte('graded_at', threeMonthsAgo.toISOString());
      }

      const { data: scores, error: scoresError } = await scoresQuery;

      if (scoresError) throw scoresError;

      // Calculate statistics for each student
      const studentStats = new Map<string, StudentStats>();

      enrolledStudents?.forEach(enrollment => {
        const student = Array.isArray(enrollment.student) ? enrollment.student[0] : enrollment.student;
        const classData = Array.isArray(enrollment.class) ? enrollment.class[0] : enrollment.class;

        if (!student || !classData) return;

        const key = student.id;
        if (!studentStats.has(key)) {
          studentStats.set(key, {
            student,
            class: classData,
            total_assignments: 0,
            completed_assignments: 0,
            average_score: 0,
            highest_score: 0,
            lowest_score: 100,
            total_points: 0,
            rank: 0
          });
        }
      });

      // Process scores
      scores?.forEach(score => {
        const student = Array.isArray(score.student) ? score.student[0] : score.student;
        const assignment = Array.isArray(score.assignment) ? score.assignment[0] : score.assignment;
        if (!student || !assignment) return;

        const studentId = student.id;
        const stats = studentStats.get(studentId);
        if (!stats) return;

        stats.completed_assignments++;
        stats.total_points += score.score;
        stats.highest_score = Math.max(stats.highest_score, score.score);
        stats.lowest_score = Math.min(stats.lowest_score, score.score);
      });

      // Calculate averages and ranks
      const statsArray = Array.from(studentStats.values());

      statsArray.forEach(stats => {
        if (stats.completed_assignments > 0) {
          stats.average_score = Math.round((stats.total_points / stats.completed_assignments) * 100) / 100;
        }
        stats.total_assignments = stats.completed_assignments; // For now, assume all assignments are completed
      });

      // Filter by grade if specified
      let filteredStats = statsArray;
      if (filters.selected_grade !== 'all') {
        filteredStats = statsArray.filter(stats => stats.class.grade === filters.selected_grade);
      }

      // Sort by average score (descending)
      filteredStats.sort((a, b) => b.average_score - a.average_score);

      // Assign ranks
      filteredStats.forEach((stats, index) => {
        stats.rank = index + 1;
      });

      setLeaderboard(filteredStats);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-amber-600" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-600">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200';
      case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 3: return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200';
      default: return 'bg-white';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <StatsCardSkeleton count={4} />
        </div>

        <LeaderboardSkeleton count={8} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Leaderboard</h1>
          <p className="text-sm text-gray-600 mt-1">Peringkat siswa berdasarkan nilai tugas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Filter Peringkat</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tingkat
            </label>
            <select
              value={filters.selected_grade}
              onChange={(e) => setFilters(prev => ({ ...prev, selected_grade: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Tingkat</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Periode Waktu
            </label>
            <select
              value={filters.time_period}
              onChange={(e) => setFilters(prev => ({ ...prev, time_period: e.target.value as any }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Waktu</option>
              <option value="semester">3 Bulan Terakhir</option>
              <option value="month">Bulan Ini</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards - More Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Siswa</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">{leaderboard.length}</p>
            </div>
            <Users className="w-6 h-6 md:w-7 md:h-7 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Rata-rata</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {leaderboard.length > 0
                  ? (leaderboard.reduce((sum, s) => sum + s.average_score, 0) / leaderboard.length).toFixed(1)
                  : '0.0'
                }
              </p>
            </div>
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Nilai Max</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {leaderboard.length > 0 ? Math.max(...leaderboard.map(s => s.highest_score)) : 0}
              </p>
            </div>
            <Target className="w-6 h-6 md:w-7 md:h-7 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600">Tugas Done</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {leaderboard.reduce((sum, s) => sum + s.completed_assignments, 0)}
              </p>
            </div>
            <Award className="w-6 h-6 md:w-7 md:h-7 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      {leaderboard.length === 0 ? (
        <div className="text-center py-12">
          <Trophy size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada data leaderboard</h3>
          <p className="text-gray-600">Siswa perlu menyelesaikan beberapa tugas untuk muncul di leaderboard</p>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {leaderboard.map((stats, index) => (
            <div key={stats.student.id} className={`rounded-lg shadow-sm p-3 md:p-4 border ${getRankColor(stats.rank)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                    {getRankIcon(stats.rank)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm md:text-base text-gray-800 truncate">
                      {stats.student.full_name}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 truncate">
                      {stats.student.student_id} • {stats.class.grade} {stats.class.class_name}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-3">
                  <div className={`text-xl md:text-2xl font-bold ${getScoreColor(stats.average_score)}`}>
                    {stats.average_score.toFixed(1)}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">
                    {stats.completed_assignments} done
                  </div>
                </div>
              </div>

              {/* Mobile-only detailed stats */}
              <div className="mt-3 md:hidden grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Max:</span>
                  <span className={`font-semibold ${getScoreColor(stats.highest_score)}`}>
                    {stats.highest_score}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Min:</span>
                  <span className={`font-semibold ${getScoreColor(stats.lowest_score)}`}>
                    {stats.lowest_score}
                  </span>
                </div>
              </div>

              {/* Desktop detailed stats */}
              <div className="hidden md:mt-3 md:grid md:grid-cols-4 md:gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Nilai Tertinggi:</span>
                  <span className={`font-semibold ml-2 ${getScoreColor(stats.highest_score)}`}>
                    {stats.highest_score}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Nilai Terendah:</span>
                  <span className={`font-semibold ml-2 ${getScoreColor(stats.lowest_score)}`}>
                    {stats.lowest_score}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total Poin:</span>
                  <span className="font-semibold ml-2 text-gray-800">
                    {stats.total_points}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Rank:</span>
                  <span className="font-semibold ml-2 text-blue-600">
                    #{stats.rank}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherLeaderboard;