import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Download,
  Search,
  Trophy,
  Reply,
  Users,
  MessageCircle,
  Send,
  Edit,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  student?: {
    full_name: string;
    student_id: string;
  };
  teacher?: {
    full_name: string;
    id?: string;
  };
}

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
  comments?: Comment[];
}

const AdditionalAssignments: React.FC = () => {
  const { user, profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

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
        // Get teacher's classes
        console.log('Fetching teacher classes for user:', user.id);
        const { data: teacherClasses, error: classesError } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', user.id);
        
        console.log('Teacher classes result:', teacherClasses);
        if (classesError) {
          console.error('Error fetching teacher classes:', classesError);
          throw classesError;
        }
        classIds = teacherClasses?.map(c => c.id) || [];
      } else {
        // Get student's classes
        console.log('Fetching student classes for user:', user.id);
        const { data: studentClasses, error: classesError } = await supabase
          .from('students_classes')
          .select('class_id')
          .eq('student_id', user.id);
        
        console.log('Student classes result:', studentClasses);
        if (classesError) {
          console.error('Error fetching student classes:', classesError);
          throw classesError;
        }
        classIds = studentClasses?.map(sc => sc.class_id) || [];
      }
      
      if (classIds.length === 0) {
        setAssignments([]);
        return;
      }

      // Debug: First check what assignments exist for these classes
      console.log('Class IDs:', classIds);
      
      // Get all assignments for these classes first (for debugging)
      const { data: allAssignments, error: allAssignmentsError } = await supabase
        .from('assignments')
        .select('id, title, type, class_id')
        .in('class_id', classIds);
      
      console.log('All assignments for classes:', allAssignments);
      if (allAssignmentsError) console.error('Error fetching all assignments:', allAssignmentsError);

      // Get additional assignments with class info, submissions, and scores
      let assignmentsData, assignmentsError;
      
      try {
        const result = await supabase
          .from('assignments')
          .select(`
            *,
            class:classes(grade, class_name),
            teacher:users!assignments_created_by_fkey(full_name),
            submissions!submissions_assignment_id_fkey(
              id,
              content,
              file_url,
              submitted_at,
              student:students(full_name, student_id)
            ),
            scores!scores_assignment_id_fkey(
              score,
              max_score,
              feedback,
              graded_at
            )
          `)
          .in('class_id', classIds)
          .eq('type', 'additional')
          .order('created_at', { ascending: false });
        
        assignmentsData = result.data;
        assignmentsError = result.error;
      } catch (error) {
        console.error('Error in assignments query:', error);
        assignmentsError = error;
        assignmentsData = null;
      }

      console.log('Additional assignments query result:', assignmentsData);
      if (assignmentsError) {
        console.error('Error fetching additional assignments:', assignmentsError);
        throw assignmentsError;
      }

      // If no additional assignments found, try to get all assignments for debugging
      if (!assignmentsData || assignmentsData.length === 0) {
        console.log('No additional assignments found, checking all assignments...');
        const { data: allAssignmentsData, error: allAssignmentsError2 } = await supabase
          .from('assignments')
          .select('*')
          .in('class_id', classIds);
        
        console.log('All assignments (no filter):', allAssignmentsData);
        if (allAssignmentsError2) console.error('Error fetching all assignments:', allAssignmentsError2);
      }

      // Process assignments data
      const processedAssignments: Assignment[] = assignmentsData?.map(assignment => ({
        ...assignment,
        submission: isTeacher ? null : (assignment.submissions?.[0] || null),
        submissions: isTeacher ? (assignment.submissions || []) : undefined,
        score: isTeacher ? null : (assignment.scores?.[0] || null),
        scores: isTeacher ? (assignment.scores || []) : undefined,
        submission_count: assignment.submissions?.length || 0,
        graded_count: assignment.scores?.length || 0,
        comments: [], // Initialize empty comments array
      })) || [];

      // Fetch comments for each assignment
      const assignmentsWithComments = await Promise.all(
        processedAssignments.map(async (assignment) => {
          try {
            const { data: commentsData, error: commentsError } = await supabase
              .from('assignment_comments')
              .select(`
                id,
                content,
                created_at,
                student:students(full_name, student_id),
                teacher:users(full_name, id)
              `)
              .eq('assignment_id', assignment.id)
              .order('created_at', { ascending: true });

            if (commentsError) {
              console.error('Error fetching comments for assignment', assignment.id, commentsError);
              return assignment;
            }

            return {
              ...assignment,
              comments: commentsData || []
            };
          } catch (error) {
            console.error('Error fetching comments for assignment', assignment.id, error);
            return assignment;
          }
        })
      );

      setAssignments(assignmentsWithComments);
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

      const { error } = await supabase
        .from('submissions')
        .upsert({
          assignment_id: assignmentId,
          student_id: user.id,
          content: submissionContent.trim(),
        });

      if (error) throw error;

      alert('Tugas berhasil dikumpulkan!');
      setSelectedAssignment(null);
      setSubmissionContent('');
      fetchAssignments(); // Refresh assignments
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Gagal mengumpulkan tugas');
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
        .upsert({
          assignment_id: assignmentId,
          student_id: user?.id,
          content: submissionContent.trim(),
          file_url: publicUrl,
        });

      if (updateError) throw updateError;

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

  const handleSubmitComment = async (assignmentId: string) => {
    if (!user || !commentContent.trim()) {
      alert('Silakan isi komentar');
      return;
    }

    try {
      setSubmittingComment(true);

      const { error } = await supabase
        .from('assignment_comments')
        .insert({
          assignment_id: assignmentId,
          student_id: isTeacher ? null : user.id,
          teacher_id: isTeacher ? user.id : null,
          content: commentContent.trim(),
        });

      if (error) throw error;

      setCommentContent('');
      fetchAssignments(); // Refresh assignments to get updated comments
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Gagal mengirim komentar');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) {
      alert('Silakan isi komentar');
      return;
    }

    try {
      const { error } = await supabase
        .from('assignment_comments')
        .update({ content: editCommentContent.trim() })
        .eq('id', commentId);

      if (error) throw error;

      setEditingComment(null);
      setEditCommentContent('');
      fetchAssignments();
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Gagal mengupdate komentar');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus komentar ini?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('assignment_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      fetchAssignments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Gagal menghapus komentar');
    }
  };

  const startEditingComment = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditCommentContent(comment.content);
  };

  const cancelEditingComment = () => {
    setEditingComment(null);
    setEditCommentContent('');
  };


  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getAssignmentStatus = (assignment: Assignment) => {
    if (assignment.score) {
      return { status: 'graded', color: 'text-green-600', bgColor: 'bg-green-100' };
    }
    if (assignment.submission) {
      return { status: 'submitted', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    }
    return { status: 'pending', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const getSubmissionStats = (assignment: Assignment) => {
    const totalStudents = assignment.submissions?.length || 0;
    const gradedCount = assignment.graded_count || 0;
    const pendingGrading = totalStudents - gradedCount;
    
    return { totalStudents, gradedCount, pendingGrading };
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          Tugas Tambahan
        </h1>
        <div className="text-sm text-gray-600">
          {assignments.length} tugas tersedia
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Cari tugas tambahan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Assignments Feed */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Belum ada tugas tambahan
            </h3>
            <p className="text-gray-500">
              Guru belum memposting tugas tambahan apapun.
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const { status, color, bgColor } = getAssignmentStatus(assignment);
            const overdue = isOverdue(assignment.due_date);
            const stats = getSubmissionStats(assignment);
            
            return (
              <div key={assignment.id} className="bg-white rounded-lg shadow-md p-6">
                {/* Assignment Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-800">
                        {assignment.teacher?.full_name || 'Guru'}
                      </h3>
                      <span className="text-gray-500 text-sm">•</span>
                      <span className="text-gray-500 text-sm">
                        {assignment.class?.grade} - {assignment.class?.class_name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!isTeacher && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${color}`}>
                        {status === 'graded' ? 'Dinilai' : status === 'submitted' ? 'Dikumpulkan' : 'Tertunda'}
                      </span>
                    )}
                    {overdue && (
                      <span className="text-red-600 text-xs font-medium">Terlambat!</span>
                    )}
                  </div>
                </div>

                {/* Assignment Content */}
                <div className="mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    {assignment.title}
                  </h4>
                  <p className="text-gray-700 mb-3">{assignment.description}</p>

                  {/* Assignment Details */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
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
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      {assignment.max_score} poin
                    </div>
                  </div>
                </div>

                {/* Submission Stats for Teachers */}
                {isTeacher && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-800">Statistik Submission</h5>
                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Lihat Detail
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
                        <p className="text-xs text-gray-600">Total Siswa</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{stats.gradedCount}</p>
                        <p className="text-xs text-gray-600">Sudah Dinilai</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{stats.pendingGrading}</p>
                        <p className="text-xs text-gray-600">Belum Dinilai</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Score Display for Students */}
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

                {/* Submission Display for Students */}
                {!isTeacher && assignment.submission && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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


                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-4">
                    {isTeacher ? (
                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        <span className="text-sm">Lihat Submissions</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Reply className="w-4 h-4" />
                        <span className="text-sm">
                          {assignment.submission ? 'Lihat' : 'Kerjakan'}
                        </span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedAssignment(assignment)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm">
                        Komentar ({assignment.comments?.length || 0})
                      </span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Assignment Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  {isTeacher ? 'Detail Tugas & Submissions' : (selectedAssignment.submission ? 'Lihat Tugas' : 'Kerjakan Tugas')}
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

                {/* Teacher Submissions View */}
                {isTeacher && selectedAssignment.submissions && selectedAssignment.submissions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">Submissions Siswa</h4>
                    <div className="space-y-3">
                      {selectedAssignment.submissions.map((submission) => (
                        <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-800">
                              {submission.student.full_name} ({submission.student.student_id})
                            </h5>
                            <span className="text-sm text-gray-500">
                              {new Date(submission.submitted_at).toLocaleString('id-ID')}
                            </span>
                          </div>
                          {submission.content && (
                            <p className="text-sm text-gray-700 mb-2">{submission.content}</p>
                          )}
                          {submission.file_url && (
                            <a
                              href={submission.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <Download className="w-4 h-4" />
                              Download File
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Student Submission Form */}
                {!isTeacher && !selectedAssignment.submission ? (
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
                ) : !isTeacher && selectedAssignment.submission && (
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

                {/* Comments Section */}
                <div className="mt-6 border-t pt-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Komentar ({selectedAssignment.comments?.length || 0})
                  </h4>

                  {/* Add Comment Form */}
                  <div className="mb-6">
                    <textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Tulis komentar Anda di sini..."
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => handleSubmitComment(selectedAssignment.id)}
                        disabled={submittingComment || !commentContent.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        {submittingComment ? 'Mengirim...' : 'Kirim Komentar'}
                      </button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4">
                    {selectedAssignment.comments && selectedAssignment.comments.length > 0 ? (
                      selectedAssignment.comments
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                        .map((comment) => (
                          <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                  comment.student ? 'bg-blue-500' : 'bg-green-500'
                                }`}>
                                  {(comment.student?.full_name || comment.teacher?.full_name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">
                                    {comment.student?.full_name || comment.teacher?.full_name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {comment.student ? 'Siswa' : 'Guru'} • {new Date(comment.created_at).toLocaleString('id-ID')}
                                  </p>
                                </div>
                              </div>
                              {(comment.student?.student_id === user?.id || (comment.teacher?.id === user?.id)) && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => startEditingComment(comment)}
                                    className="text-gray-500 hover:text-blue-600"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-gray-500 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {editingComment === comment.id ? (
                              <div>
                                <textarea
                                  value={editCommentContent}
                                  onChange={(e) => setEditCommentContent(e.target.value)}
                                  rows={3}
                                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => handleEditComment(comment.id)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    onClick={cancelEditingComment}
                                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-700">{comment.content}</p>
                            )}
                          </div>
                        ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Belum ada komentar</p>
                        <p className="text-sm">Jadilah yang pertama berkomentar!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdditionalAssignments;