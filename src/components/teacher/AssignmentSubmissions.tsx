import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Eye, CheckCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SubmissionCardSkeleton } from '../ui/SkeletonLoader';

interface Submission {
  id: string;
  content: string;
  file_url: string;
  submitted_at: string;
  student: {
    id: string;
    full_name: string;
    student_id: string;
  };
  score?: {
    score: number;
    max_score: number;
    feedback: string;
  };
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  max_score: number;
  class: {
    grade: string;
    class_name: string;
  };
}

const AssignmentSubmissions: React.FC = () => {
  const { user, profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (user && profile) {
      fetchAssignmentAndSubmissions();
    }
  }, [user, profile]);

  const fetchAssignmentAndSubmissions = async () => {
    try {
      setLoading(true);

      if (!id) {
        alert('ID tugas tidak ditemukan');
        navigate('/teacher/content');
        return;
      }

      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          class:classes(grade, class_name)
        `)
        .eq('id', id)
        .single();

      if (assignmentError) throw assignmentError;

      // Verify teacher has access to this assignment
      if (assignmentData.created_by !== user?.id) {
        alert('Anda tidak memiliki akses untuk melihat pengumpulan tugas ini');
        navigate('/teacher/content');
        return;
      }

      setAssignment(assignmentData);

      // Fetch all submissions with student info and scores
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select(`
          *,
          student:students(id, full_name, student_id),
          score:scores(score, max_score, feedback)
        `)
        .eq('assignment_id', id)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Transform data to match our interface
      const transformedSubmissions = submissionsData?.map(sub => ({
        ...sub,
        score: sub.score?.[0] || null
      })) || [];

      setSubmissions(transformedSubmissions);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Gagal memuat data pengumpulan');
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = (submittedAt: string, dueDate: string) => {
    return new Date(submittedAt) > new Date(dueDate);
  };

  const getSubmissionStatus = (submission: Submission) => {
    if (submission.score) {
      return { status: 'graded', color: 'text-green-600', icon: CheckCircle };
    }
    if (isOverdue(submission.submitted_at, assignment?.due_date || '')) {
      return { status: 'late', color: 'text-orange-600', icon: Clock };
    }
    return { status: 'submitted', color: 'text-blue-600', icon: FileText };
  };

  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
  };

  const handleDownloadFile = (fileUrl: string, studentName: string) => {
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `submission_${studentName}_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-6">
        <SubmissionCardSkeleton count={5} />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-600">Tugas tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/teacher/content')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} />
          <span>Kembali</span>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{assignment.title}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {assignment.class.grade} {assignment.class.class_name} •
            Batas waktu: {new Date(assignment.due_date).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Deskripsi Tugas</h2>
        <p className="text-gray-600">{assignment.description}</p>
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <span>Nilai Maksimal: {assignment.max_score}</span>
          <span>Total Pengumpulan: {submissions.length}</span>
          <span>Sudah Dinilai: {submissions.filter(s => s.score).length}</span>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada pengumpulan</h3>
          <p className="text-gray-600">Siswa belum mengumpulkan tugas ini</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const statusInfo = getSubmissionStatus(submission);
            const StatusIcon = statusInfo.icon;

            return (
              <div key={submission.id} className="bg-white rounded-lg shadow-md p-6 border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-800">
                        {submission.student.full_name}
                      </h3>
                      <span className="text-sm text-gray-500">
                        ({submission.student.student_id})
                      </span>
                      <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                        <StatusIcon size={16} />
                        <span className="text-sm capitalize">{statusInfo.status}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Dikumpulkan: {new Date(submission.submitted_at).toLocaleString('id-ID')}
                    </p>
                    {submission.score && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800">Nilai:</span>
                          <span className="text-lg font-bold text-green-800">
                            {submission.score.score}/{submission.score.max_score}
                          </span>
                        </div>
                        {submission.score.feedback && (
                          <p className="text-sm text-green-700 mt-1">
                            Feedback: {submission.score.feedback}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {submission.content && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Konten Pengumpulan:</h4>
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                    </div>
                  </div>
                )}

                {submission.file_url && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-2">File Lampiran:</h4>
                    <button
                      onClick={() => handleDownloadFile(submission.file_url, submission.student.full_name)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <Download size={16} />
                      <span>Download File</span>
                    </button>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleViewSubmission(submission)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    <span>Lihat Detail</span>
                  </button>
                  {!submission.score && (
                    <button
                      onClick={() => navigate(`/teacher/assignments/${assignment.id}/grade?student=${submission.student.id}`)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} />
                      <span>Berikan Nilai</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignmentSubmissions;