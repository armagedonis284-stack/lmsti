import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Download,
  BookOpen,
  Filter,
  Search,
  Trophy,
  Plus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: 'mandatory' | 'additional';
  due_date: string;
  max_score: number;
  class_id: string;
  created_at: string;
  created_by?: string;
  class?: {
    grade: string;
    class_name: string;
  };
  teacher?: {
    full_name: string;
  };
  submission?: {
    id: string;
    content: string;
    file_url: string;
    submitted_at: string;
  };
  submissions?: {
    id: string;
    content: string;
    file_url: string;
    submitted_at: string;
    student: {
      full_name: string;
      student_id: string;
    };
  }[];
  score?: {
    score: number;
    max_score: number;
    feedback: string;
    graded_at: string;
  };
  scores?: {
    score: number;
    max_score: number;
    feedback: string;
    graded_at: string;
  }[];
  submission_count?: number;
  graded_count?: number;
}

const StudentAssignments: React.FC = () => {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Determine if user is teacher or student
  const isTeacher = profile?.role === 'teacher';

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      let classIds: string[] = [];

      if (isTeacher) {
        // For teachers, get all their classes
        const { data: teacherClasses, error: classesError } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', user.id);
        
        if (classesError) throw classesError;
        classIds = teacherClasses?.map(c => c.id) || [];
      } else {
        // For students, get their enrolled classes
        const { data: studentClasses, error: classesError } = await supabase
          .from('students_classes')
          .select('class_id')
          .eq('student_id', user.id);
        
        if (classesError) throw classesError;
        classIds = studentClasses?.map(sc => sc.class_id) || [];
      }
      
      if (classIds.length === 0) {
        setAssignments([]);
        return;
      }

      // Get assignments with class info, submissions, and scores
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          class:classes(grade, class_name),
          teacher:users(full_name),
          submissions(
            id,
            content,
            file_url,
            submitted_at,
            student:students(full_name, student_id)
          ),
          scores(
            score,
            max_score,
            feedback,
            graded_at
          )
        `)
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Process assignments data
      const processedAssignments: Assignment[] = assignmentsData?.map(assignment => {
        if (isTeacher) {
          // For teachers, show submission count and graded count
          return {
            ...assignment,
            submission_count: assignment.submissions?.length || 0,
            graded_count: assignment.scores?.length || 0,
            submissions: assignment.submissions || [],
            scores: assignment.scores || [],
          };
        } else {
          // For students, find their own submission and score
          const userSubmission = assignment.submissions?.find(sub => sub.student?.student_id === user.id || sub.student?.id === user.id);
          const userScore = assignment.scores?.find(score => score.student_id === user.id);
          
          return {
            ...assignment,
            submission: userSubmission || null,
            score: userScore || null,
          };
        }
      }) || [];

      setAssignments(processedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (!user || !submissionContent.trim()) {
      alert('Silakan isi konten submission');
      return;
    }

    try {
      setSubmitting(true);

      // Try direct insert first
      const { error } = await supabase
        .from('submissions')
        .insert({
          assignment_id: assignmentId,
          student_id: user.id,
          content: submissionContent.trim(),
        });

      if (error) {
        console.error('Submission error details:', error);
        
        // If RLS fails, try using the database function
        if (error.code === '42501') {
          console.log('RLS failed, trying database function...');
          
          const { data: functionResult, error: functionError } = await supabase
            .rpc('submit_assignment', {
              p_assignment_id: assignmentId,
              p_student_id: user.id,
              p_content: submissionContent.trim()
            });

          if (functionError) {
            console.error('Function error:', functionError);
            throw new Error('Tidak dapat mengirim tugas. Silakan coba lagi atau hubungi guru.');
          }

          if (functionResult && !functionResult.success) {
            throw new Error(functionResult.error || 'Gagal mengirim tugas');
          }
        } else {
          throw error;
        }
      }

      alert('Tugas berhasil dikumpulkan!');
      setSelectedAssignment(null);
      setSubmissionContent('');
      fetchAssignments(); // Refresh assignments
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert(error instanceof Error ? error.message : 'Gagal mengumpulkan tugas');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (file: File, assignmentId: string) => {
    try {
      setUploading(true);

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${assignmentId}_${user?.id}_${Date.now()}.${fileExt}`;
      const filePath = `submissions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assignments')
        .getPublicUrl(filePath);

      // Update submission with file URL
      const { error: updateError } = await supabase
        .from('submissions')
        .insert({
          assignment_id: assignmentId,
          student_id: user?.id,
          content: submissionContent.trim(),
          file_url: publicUrl,
        });

      if (updateError) {
        console.error('File upload submission error:', updateError);
        
        // If RLS fails, try using the database function
        if (updateError.code === '42501') {
          console.log('RLS failed for file upload, trying database function...');
          
          const { data: functionResult, error: functionError } = await supabase
            .rpc('submit_assignment', {
              p_assignment_id: assignmentId,
              p_student_id: user?.id,
              p_content: submissionContent.trim(),
              p_file_url: publicUrl
            });

          if (functionError) {
            console.error('Function error for file upload:', functionError);
            throw new Error('Tidak dapat mengirim file. Silakan coba lagi atau hubungi guru.');
          }

          if (functionResult && !functionResult.success) {
            throw new Error(functionResult.error || 'Gagal mengirim file');
          }
        } else {
          throw updateError;
        }
      }

      alert('File berhasil diupload!');
      setSelectedAssignment(null);
      setSubmissionContent('');
      fetchAssignments();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Gagal mengupload file');
    } finally {
      setUploading(false);
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (isTeacher) {
      // For teachers, filter by submission status
      switch (filter) {
        case 'pending':
          return (assignment.submission_count || 0) === 0;
        case 'submitted':
          return (assignment.submission_count || 0) > 0 && (assignment.graded_count || 0) === 0;
        case 'graded':
          return (assignment.graded_count || 0) > 0;
        default:
          return true;
      }
    } else {
      // For students, filter by their own submission status
      switch (filter) {
        case 'pending':
          return !assignment.submission;
        case 'submitted':
          return assignment.submission && !assignment.score;
        case 'graded':
          return assignment.score;
        default:
          return true;
      }
    }
  });

  const getAssignmentStatus = (assignment: Assignment) => {
    if (isTeacher) {
      // For teachers, show overall assignment status
      if ((assignment.graded_count || 0) > 0) {
        return { status: 'graded', color: 'text-green-600', bgColor: 'bg-green-100' };
      }
      if ((assignment.submission_count || 0) > 0) {
        return { status: 'submitted', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      }
      return { status: 'pending', color: 'text-red-600', bgColor: 'bg-red-100' };
    } else {
      // For students, show their own status
      if (assignment.score) {
        return { status: 'graded', color: 'text-green-600', bgColor: 'bg-green-100' };
      }
      if (assignment.submission) {
        return { status: 'submitted', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      }
      return { status: 'pending', color: 'text-red-600', bgColor: 'bg-red-100' };
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
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
        <h1 className="text-2xl font-bold text-gray-800">
          {isTeacher ? 'Kelola Tugas' : 'Tugas Saya'}
        </h1>
        {isTeacher && (
          <button
            onClick={() => window.location.href = '/teacher/content/create'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Buat Tugas Baru
          </button>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Cari tugas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Semua', icon: ClipboardList },
              { key: 'pending', label: 'Tertunda', icon: Clock },
              { key: 'submitted', label: 'Dikumpulkan', icon: CheckCircle },
              { key: 'graded', label: 'Dinilai', icon: Trophy },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              {filter === 'all' ? 'Belum ada tugas' : `Tidak ada tugas ${filter}`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'Guru belum memberikan tugas apapun.' 
                : `Tidak ada tugas dengan status ${filter}.`}
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const { status, color, bgColor } = getAssignmentStatus(assignment);
            const overdue = isOverdue(assignment.due_date);
            
            return (
              <div key={assignment.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{assignment.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${color}`}>
                        {status === 'graded' ? 'Dinilai' : status === 'submitted' ? 'Dikumpulkan' : 'Tertunda'}
                      </span>
                      {assignment.type === 'mandatory' && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                          Wajib
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{assignment.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {assignment.class?.grade} - {assignment.class?.class_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(assignment.due_date).toLocaleDateString('id-ID')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(assignment.due_date).toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      {overdue && !isTeacher && !assignment.submission && (
                        <span className="text-red-600 font-medium">Terlambat!</span>
                      )}
                      {isTeacher && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{(assignment.submission_count || 0)} Pengumpulan</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isTeacher ? (
                      <>
                        <button
                          onClick={() => window.location.href = `/teacher/assignments/${assignment.id}/submissions`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Lihat Pengumpulan
                        </button>
                        <button
                          onClick={() => window.location.href = `/teacher/assignments/${assignment.id}/grade`}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Penilaian
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {assignment.submission ? 'Lihat' : 'Kerjakan'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Score Display - Only for students */}
                {!isTeacher && assignment.score && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-green-800">Nilai Anda</h4>
                        <p className="text-2xl font-bold text-green-600">
                          {assignment.score.score}/{assignment.score.max_score}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-600">
                          {Math.round((assignment.score.score / assignment.score.max_score) * 100)}%
                        </p>
                        <p className="text-xs text-green-500">
                          Dinilai: {new Date(assignment.score.graded_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    {assignment.score.feedback && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <p className="text-sm text-gray-700">
                          <strong>Feedback:</strong> {assignment.score.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Submission Display - Only for students */}
                {!isTeacher && assignment.submission && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Submission Anda</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Dikumpulkan: {new Date(assignment.submission.submitted_at).toLocaleString('id-ID')}
                    </p>
                    {assignment.submission.content && (
                      <p className="text-sm text-gray-700 mb-2">{assignment.submission.content}</p>
                    )}
                    {assignment.submission.file_url && (
                      <a
                        href={assignment.submission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <Download className="w-4 h-4" />
                        Download File
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Assignment Modal - Only for students */}
      {!isTeacher && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedAssignment.submission ? 'Lihat Tugas' : 'Kerjakan Tugas'}
                </h2>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">{selectedAssignment.title}</h3>
                  <p className="text-gray-600 mb-4">{selectedAssignment.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>Kelas: {selectedAssignment.class?.grade} - {selectedAssignment.class?.class_name}</span>
                    <span>Batas: {new Date(selectedAssignment.due_date).toLocaleString('id-ID')}</span>
                    <span>Nilai Maks: {selectedAssignment.max_score}</span>
                  </div>
                </div>

                {!selectedAssignment.submission ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jawaban Anda
                    </label>
                    <textarea
                      value={submissionContent}
                      onChange={(e) => setSubmissionContent(e.target.value)}
                      rows={6}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tulis jawaban Anda di sini..."
                    />
                    
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload File (Opsional)
                      </label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, selectedAssignment.id);
                          }
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        disabled={uploading}
                      />
                      {uploading && <p className="text-sm text-blue-600 mt-2">Mengupload file...</p>}
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => handleSubmitAssignment(selectedAssignment.id)}
                        disabled={submitting || !submissionContent.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Mengirim...' : 'Kirim Tugas'}
                      </button>
                      <button
                        onClick={() => setSelectedAssignment(null)}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Submission Anda</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Dikumpulkan: {new Date(selectedAssignment.submission.submitted_at).toLocaleString('id-ID')}
                    </p>
                    {selectedAssignment.submission.content && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Jawaban:</p>
                        <p className="text-sm text-gray-700 p-3 bg-white rounded border">
                          {selectedAssignment.submission.content}
                        </p>
                      </div>
                    )}
                    {selectedAssignment.submission.file_url && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">File:</p>
                        <a
                          href={selectedAssignment.submission.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                          <Download className="w-4 h-4" />
                          Download File
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;