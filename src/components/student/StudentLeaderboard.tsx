import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp, Target, BookOpen, Calendar, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LeaderboardSkeleton } from '../ui/SkeletonLoader';

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
  class_rank: number;
  overall_rank: number;
}

interface ClassmateStats {
  student: Student;
  average_score: number;
  rank: number;
  completed_assignments: number;
}

const StudentLeaderboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null);
  const [classmates, setClassmates] = useState<ClassmateStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'month' | 'semester'>('all');

  useEffect(() => {
    if (user && profile) {
      fetchStudentLeaderboard();
    }
  }, [user, profile, selectedPeriod]);

  const fetchStudentLeaderboard = async () => {
    try {
      setLoading(true);

      // Get student's enrolled classes
      const { data: enrolledClasses, error: enrolledError } = await supabase
        .from('students_classes')
        .select(`
          class_id,
          class:classes(id, grade, class_name)
        `)
        .eq('student_id', user?.id);

      if (enrolledError) throw enrolledError;

      if (!enrolledClasses || enrolledClasses.length === 0) {
        setStudentStats(null);
        setClassmates([]);
        return;
      }

      const mainClass = enrolledClasses[0]; // Use first enrolled class for now
      const classData = Array.isArray(mainClass.class) ? mainClass.class[0] : mainClass.class;

      // Get all students in the same grade across all teacher's classes
      const { data: gradeStudents, error: gradeError } = await supabase
        .from('students_classes')
        .select(`
          student_id,
          class_id,
          student:students(id, full_name, student_id),
          class:classes(id, grade, class_name)
        `)
        .eq('class.grade', classData?.grade);

      if (gradeError) throw gradeError;

      const studentIds = gradeStudents?.map(gs => gs.student_id) || [];

      if (studentIds.length === 0) {
        setStudentStats(null);
        setClassmates([]);
        return;
      }

      // Get assignments for the main class first
      const { data: assignmentsForClass, error: assignmentsError } = await supabase
        .from('assignments')
        .select('id')
        .eq('class_id', mainClass.class_id);

      if (assignmentsError) throw assignmentsError;

      const assignmentIds = assignmentsForClass?.map(a => a.id) || [];

      if (assignmentIds.length === 0) {
        setStudentStats(null);
        setClassmates([]);
        return;
      }

      // Get all scores for students in this class with time filtering
      let scoresQuery = supabase
        .from('scores')
        .select(`
          *,
          student:students(id, full_name, student_id)
        `)
        .in('student_id', studentIds)
        .in('assignment_id', assignmentIds);

      // Apply time period filter
      if (selectedPeriod === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        scoresQuery = scoresQuery.gte('graded_at', oneMonthAgo.toISOString());
      } else if (selectedPeriod === 'semester') {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        scoresQuery = scoresQuery.gte('graded_at', threeMonthsAgo.toISOString());
      }

      const { data: scores, error: scoresError } = await scoresQuery;

      if (scoresError) throw scoresError;

      // Calculate statistics for each student
      const studentMap = new Map<string, {
        student: Student;
        total_points: number;
        completed_assignments: number;
        highest_score: number;
        lowest_score: number;
      }>();

      // Initialize all students
      gradeStudents?.forEach(gs => {
        const student = Array.isArray(gs.student) ? gs.student[0] : gs.student;
        if (!student) return;

        studentMap.set(student.id, {
          student,
          total_points: 0,
          completed_assignments: 0,
          highest_score: 0,
          lowest_score: 100
        });
      });

      // Process scores
      scores?.forEach(score => {
        const student = Array.isArray(score.student) ? score.student[0] : score.student;
        if (!student) return;

        const stats = studentMap.get(student.id);
        if (!stats) return;

        stats.completed_assignments++;
        stats.total_points += score.score;
        stats.highest_score = Math.max(stats.highest_score, score.score);
        stats.lowest_score = Math.min(stats.lowest_score, score.score);
      });

      // Convert to array and calculate averages
      const classmatesArray: ClassmateStats[] = Array.from(studentMap.values())
        .map(({ student, total_points, completed_assignments, highest_score, lowest_score }) => ({
          student,
          average_score: completed_assignments > 0 ? Math.round((total_points / completed_assignments) * 100) / 100 : 0,
          completed_assignments,
          highest_score,
          lowest_score,
          total_points,
          rank: 0 // Will be set after sorting
        }))
        .sort((a, b) => b.average_score - a.average_score);

      // Assign ranks
      classmatesArray.forEach((stats, index) => {
        stats.rank = index + 1;
      });

      // Find current student's stats
      const currentStudentStats = classmatesArray.find(s => s.student.id === user?.id);

      if (currentStudentStats) {
        // Find the original student data with full stats
        const originalStudentData = studentMap.get(user?.id || '');
        if (originalStudentData) {
          setStudentStats({
            student: currentStudentStats.student,
            class: classData!,
            total_assignments: originalStudentData.completed_assignments,
            completed_assignments: originalStudentData.completed_assignments,
            average_score: currentStudentStats.average_score,
            highest_score: originalStudentData.highest_score,
            lowest_score: originalStudentData.lowest_score,
            total_points: originalStudentData.total_points,
            class_rank: currentStudentStats.rank,
            overall_rank: currentStudentStats.rank // For now, same as class rank
          });
        }
      }

      setClassmates(classmatesArray);
    } catch (error) {
      console.error('Error fetching student leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-600">{rank}</span>;
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-8 w-16 bg-gray-300 rounded"></div>
                <div className="h-4 w-20 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        <LeaderboardSkeleton count={10} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Leaderboard</h1>
          <p className="text-sm text-gray-600 mt-1">Peringkat dan statistik nilai Anda</p>
        </div>

        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Semua Waktu</option>
          <option value="semester">3 Bulan Terakhir</option>
          <option value="month">Bulan Ini</option>
        </select>
      </div>

      {studentStats && classmates.length > 0 ? (
        <>
          {/* Personal Statistics - More Compact */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6 border">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Statistik Anda</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="text-center">
                <div className={`text-2xl md:text-3xl font-bold ${getScoreColor(studentStats.average_score)}`}>
                  {studentStats.average_score.toFixed(1)}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Rata-rata</div>
              </div>

              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-800">
                  #{studentStats.class_rank}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Peringkat</div>
              </div>

              <div className="text-center">
                <div className={`text-2xl md:text-3xl font-bold ${getScoreColor(studentStats.highest_score)}`}>
                  {studentStats.highest_score}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Nilai Max</div>
              </div>

              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-800">
                  {studentStats.completed_assignments}
                </div>
                <div className="text-xs md:text-sm text-gray-600">Tugas Done</div>
              </div>
            </div>
          </div>

          {/* Class Leaderboard - More Compact */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 border">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-base md:text-lg font-semibold text-gray-800">
                Peringkat Tingkat {studentStats.class.grade}
              </h2>
              <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600">
                <Users size={14} className="md:w-4 md:h-4" />
                <span>{classmates.length} siswa</span>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto">
              {classmates.slice(0, 15).map((classmate) => (
                <div
                  key={classmate.student.id}
                  className={`flex items-center justify-between p-2 md:p-3 rounded-lg ${
                    classmate.student.id === user?.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getRankIcon(classmate.rank)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`font-medium text-sm md:text-base truncate ${classmate.student.id === user?.id ? 'text-blue-800' : 'text-gray-800'}`}>
                        {classmate.student.full_name}
                        {classmate.student.id === user?.id && <span className="text-blue-600 ml-1">(Anda)</span>}
                      </div>
                      <div className="text-xs text-gray-600">
                        {classmate.completed_assignments} done
                      </div>
                    </div>
                  </div>

                  <div className={`text-base md:text-lg font-bold flex-shrink-0 ml-2 ${getScoreColor(classmate.average_score)}`}>
                    {classmate.average_score.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>

            {classmates.length > 15 && (
              <div className="text-center mt-3 text-xs md:text-sm text-gray-600">
                Dan {classmates.length - 15} siswa lainnya...
              </div>
            )}
          </div>

          {/* Performance Insights - More Compact */}
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mt-6 border">
            <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3 md:mb-4">Insight Performa</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
                <Target className="w-6 h-6 md:w-7 md:h-7 text-green-600 mx-auto mb-2" />
                <div className="text-xs md:text-sm font-medium text-green-800">Strength</div>
                <div className="text-xs text-green-600">
                  Above avg: {Math.round((classmates.reduce((sum, s) => sum + s.average_score, 0) / classmates.length) * 10) / 10}
                </div>
              </div>

              <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-blue-600 mx-auto mb-2" />
                <div className="text-xs md:text-sm font-medium text-blue-800">Progress</div>
                <div className="text-xs text-blue-600">
                  {studentStats.completed_assignments} tugas selesai
                </div>
              </div>

              <div className="text-center p-3 md:p-4 bg-purple-50 rounded-lg">
                <BookOpen className="w-6 h-6 md:w-7 md:h-7 text-purple-600 mx-auto mb-2" />
                <div className="text-xs md:text-sm font-medium text-purple-800">Range</div>
                <div className="text-xs text-purple-600">
                  {studentStats.lowest_score} - {studentStats.highest_score}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Trophy size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada data leaderboard</h3>
          <p className="text-gray-600">Selesaikan beberapa tugas untuk melihat peringkat Anda</p>
        </div>
      )}
    </div>
  );
};

export default StudentLeaderboard;