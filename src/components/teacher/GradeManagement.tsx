import React, { useState, useEffect } from 'react';
import { ArrowLeft, Eye, CheckCircle, Clock, AlertCircle, Star, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Class {
  id: string;
  grade: string;
  class_name: string;
}

interface Assignment {
  id: string;
  title: string;
  type: 'mandatory' | 'additional';
  due_date: string;
  max_score: number;
  created_at: string;
  class_id: string;
  class?: Class;
  submission_count?: number;
  graded_count?: number;
  ungraded_count?: number;
}

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
}

interface Submission {
  id: string;
  student_id: string;
  content: string;
  file_url: string;
  submitted_at: string;
  student?: Student;
}

interface Score {
  id: string;
  score: number;
  max_score: number;
  feedback: string;
  graded_at: string;
}

const GradeManagement: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'all' | 'mandatory' | 'additional'>('all');
  const [ungradedOnly, setUngradedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (user) {
      fetchClasses();
    }
  }, [user]);

  useEffect(() => {
    if (selectedClass) {
      fetchAssignments();
    }
  }, [selectedClass, assignmentType, ungradedOnly, searchQuery]);

  useEffect(() => {
    if (selectedAssignment) {
      fetchSubmissions();
    }
  }, [selectedAssignment]);

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

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('assignments')
        .select(`
          id,
          title,
          type,
          due_date,
          max_score,
          created_at,
          class_id,
          classes!inner(id, grade, class_name)
        `)
        .eq('class_id', selectedClass)
        .order('created_at', { ascending: false });

      if (assignmentType !== 'all') {
        query = query.eq('type', assignmentType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get submission and grade counts for each assignment
      const assignmentsWithCounts = await Promise.all(
        (data || []).map(async (assignment) => {
          const [submissionsResult, scoresResult] = await Promise.all([
            supabase
              .from('submissions')
              .select('id')
              .eq('assignment_id', assignment.id),
            supabase
              .from('scores')
              .select('id')
              .eq('assignment_id', assignment.id)
          ]);

          const submissionCount = submissionsResult.data?.length || 0;
          const gradedCount = scoresResult.data?.length || 0;

          return {
            ...assignment,
            class: assignment.classes,
            submission_count: submissionCount,
            graded_count: gradedCount,
            ungraded_count: submissionCount - gradedCount
          };
        })
      );

      // Filter assignments based on ungraded filter and search query
      let filteredAssignments = assignmentsWithCounts;
      
      // Filter by ungraded status
      if (ungradedOnly) {
        filteredAssignments = filteredAssignments.filter(assignment => assignment.ungraded_count > 0);
      }
      
      // Filter by search query
      if (searchQuery.trim()) {
        filteredAssignments = filteredAssignments.filter(assignment => 
          assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          assignment.class?.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          assignment.class?.grade.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      setAssignments(filteredAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          student_id,
          content,
          file_url,
          submitted_at,
          students!inner(id, student_id, full_name, email)
        `)
        .eq('assignment_id', selectedAssignment)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const submissionsWithStudents = (data || []).map(submission => ({
        ...submission,
        student: submission.students
      }));

      setSubmissions(submissionsWithStudents);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string, score: number, feedback: string) => {
    try {
      setGrading(prev => ({ ...prev, [submissionId]: true }));

      const submission = submissions.find(s => s.id === submissionId);
      const assignment = assignments.find(a => a.id === selectedAssignment);

      if (!submission || !assignment) return;

      // Insert or update score
      const { error } = await supabase
        .from('scores')
        .upsert({
          assignment_id: selectedAssignment,
          student_id: submission.student_id,
          score: score,
          max_score: assignment.max_score,
          feedback: feedback,
          graded_by: user?.id
        }, {
          onConflict: 'assignment_id,student_id'
        });

      if (error) throw error;

      // Refresh submissions to show updated grade
      await fetchSubmissions();
      await fetchAssignments(); // Update grade count

      alert(`Nilai ${score}/${assignment.max_score} berhasil disimpan untuk ${submission.student?.full_name}`);
    } catch (error) {
      console.error('Error grading submission:', error);
      alert('Gagal menyimpan nilai');
    } finally {
      setGrading(prev => ({ ...prev, [submissionId]: false }));
    }
  };

  const getAssignmentTypeColor = (type: string) => {
    return type === 'mandatory' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  const getAssignmentTypeLabel = (type: string) => {
    return type === 'mandatory' ? 'Wajib' : 'Tambahan';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} />
          <span>Kembali</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pengelolaan Nilai</h1>
          <p className="text-sm text-gray-600 mt-1">
            Nilai tugas siswa untuk meningkatkan kedudukan di leaderboard
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedAssignment('');
                setSubmissions([]);
                setSearchQuery('');
              }}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Pilih Kelas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.grade} {cls.class_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipe Tugas
            </label>
            <select
              value={assignmentType}
              onChange={(e) => {
                setAssignmentType(e.target.value as 'all' | 'mandatory' | 'additional');
                setSelectedAssignment('');
                setSubmissions([]);
              }}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Tugas</option>
              <option value="mandatory">Tugas Wajib</option>
              <option value="additional">Tugas Tambahan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Penilaian
            </label>
            <select
              value={ungradedOnly ? 'ungraded' : 'all'}
              onChange={(e) => {
                setUngradedOnly(e.target.value === 'ungraded');
                setSelectedAssignment('');
                setSubmissions([]);
              }}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Semua Tugas</option>
              <option value="ungraded">Belum Dinilai</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        {selectedClass && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Tugas
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedAssignment('');
                  setSubmissions([]);
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Cari berdasarkan judul tugas, kelas, atau tingkat..."
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedAssignment('');
                    setSubmissions([]);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <span className="text-xl">×</span>
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-sm text-gray-600">
                Menampilkan {assignments.length} tugas yang cocok dengan "{searchQuery}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Assignments List */}
      {selectedClass && !selectedAssignment && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Daftar Tugas</h2>
              {assignments.length > 0 && (
                <span className="text-sm text-gray-600">
                  {assignments.length} tugas ditemukan
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? (
                  <div>
                    <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>Tidak ada tugas yang cocok dengan pencarian "{searchQuery}"</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Hapus pencarian
                    </button>
                  </div>
                ) : (
                  <div>
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>Tidak ada tugas untuk kelas ini</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    onClick={() => setSelectedAssignment(assignment.id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium text-gray-800">{assignment.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAssignmentTypeColor(assignment.type)}`}>
                            {getAssignmentTypeLabel(assignment.type)}
                          </span>
                          {isOverdue(assignment.due_date) && (
                            <span className="flex items-center gap-1 text-red-600 text-xs">
                              <AlertCircle size={14} />
                              Terlambat
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Batas waktu: {formatDate(assignment.due_date)}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <CheckCircle size={14} />
                            {assignment.submission_count} pengumpulan
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {assignment.graded_count} dinilai
                          </span>
                          {assignment.ungraded_count && assignment.ungraded_count > 0 && (
                            <span className="flex items-center gap-1 text-orange-600">
                              <AlertCircle size={14} />
                              {assignment.ungraded_count} belum dinilai
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Nilai Maksimal</div>
                        <div className="font-semibold text-gray-800">{assignment.max_score}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submissions List */}
      {selectedAssignment && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Pengumpulan Tugas: {assignments.find(a => a.id === selectedAssignment)?.title}
              </h2>
              <button
                onClick={() => {
                  setSelectedAssignment('');
                  setSubmissions([]);
                }}
                className="text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft size={20} />
              </button>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Belum ada pengumpulan tugas
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    assignment={assignments.find(a => a.id === selectedAssignment)!}
                    onGrade={handleGradeSubmission}
                    isGrading={grading[submission.id] || false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Submission Card Component
interface SubmissionCardProps {
  submission: Submission;
  assignment: Assignment;
  onGrade: (submissionId: string, score: number, feedback: string) => void;
  isGrading: boolean;
}

const SubmissionCard: React.FC<SubmissionCardProps> = ({ submission, assignment, onGrade, isGrading }) => {
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [existingScore, setExistingScore] = useState<Score | null>(null);

  useEffect(() => {
    fetchExistingScore();
  }, [submission.id]);

  const fetchExistingScore = async () => {
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('assignment_id', assignment.id)
        .eq('student_id', submission.student_id)
        .single();

      if (data && !error) {
        setExistingScore(data);
        setScore(data.score.toString());
        setFeedback(data.feedback || '');
      }
    } catch (error) {
      // No existing score
    }
  };

  const handleSubmitGrade = (e: React.FormEvent) => {
    e.preventDefault();
    const scoreValue = parseInt(score);
    if (scoreValue >= 0 && scoreValue <= assignment.max_score) {
      onGrade(submission.id, scoreValue, feedback);
      setShowGradeForm(false);
    } else {
      alert(`Nilai harus antara 0 dan ${assignment.max_score}`);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-gray-800">{submission.student?.full_name}</h3>
          <p className="text-sm text-gray-600">{submission.student?.student_id}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Dikumpulkan</p>
          <p className="text-sm font-medium text-gray-800">
            {new Date(submission.submitted_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>

      {submission.content && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Jawaban:</h4>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{submission.content}</p>
          </div>
        </div>
      )}

      {submission.file_url && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">File:</h4>
          <a
            href={submission.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <Eye size={16} />
            Lihat File
          </a>
        </div>
      )}

      {existingScore ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Nilai: {existingScore.score}/{existingScore.max_score}
                </p>
                {existingScore.feedback && (
                  <p className="text-sm text-green-700 mt-1">{existingScore.feedback}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowGradeForm(true)}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Edit
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowGradeForm(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2"
        >
          <Star size={16} />
          Beri Nilai
        </button>
      )}

      {showGradeForm && (
        <form onSubmit={handleSubmitGrade} className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-3">Penilaian Tugas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nilai (0 - {assignment.max_score})
              </label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                min="0"
                max={assignment.max_score}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback untuk Siswa
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Berikan feedback yang membangun..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isGrading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Star size={16} />
              {isGrading ? 'Menyimpan...' : 'Simpan Nilai'}
            </button>
            <button
              type="button"
              onClick={() => setShowGradeForm(false)}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default GradeManagement;
