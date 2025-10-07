/**
 * AssignmentManager Component
 * 
 * Comprehensive assignment management for teachers including:
 * - View all submissions
 * - Grade assignments
 * - Provide feedback
 * - Track submission status
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  FileText, 
  Download, 
  Star,
  MessageSquare,
  Eye,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface Student {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
}

interface Submission {
  id: string;
  content: string;
  file_url: string;
  submitted_at: string;
  student: Student;
}

interface Score {
  id: string;
  score: number;
  max_score: number;
  feedback: string;
  graded_at: string;
  graded_by: string;
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
  class?: {
    grade: string;
    class_name: string;
  };
  submissions?: Submission[];
  scores?: Score[];
}

interface AssignmentManagerProps {
  assignmentId: string;
}

const AssignmentManager: React.FC<AssignmentManagerProps> = ({ assignmentId }) => {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [gradingMode, setGradingMode] = useState<{ [key: string]: boolean }>({});
  const [scores, setScores] = useState<{ [key: string]: { score: number; feedback: string } }>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentDetails();
    }
  }, [assignmentId]);

  const fetchAssignmentDetails = async () => {
    try {
      setLoading(true);

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          class:classes(grade, class_name),
          submissions(
            id,
            content,
            file_url,
            submitted_at,
            student:students(id, student_id, full_name, email)
          ),
          scores(
            id,
            score,
            max_score,
            feedback,
            graded_at,
            graded_by
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      setAssignment(assignmentData);

      // Initialize scores state
      const initialScores: { [key: string]: { score: number; feedback: string } } = {};
      assignmentData?.scores?.forEach((score: Score) => {
        initialScores[score.student.id] = {
          score: score.score,
          feedback: score.feedback || ''
        };
      });
      setScores(initialScores);

    } catch (error) {
      console.error('Error fetching assignment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (studentId: string) => {
    const scoreData = scores[studentId];
    if (!scoreData || scoreData.score < 0 || scoreData.score > assignment?.max_score!) {
      alert('Nilai harus antara 0 dan ' + assignment?.max_score);
      return;
    }

    try {
      setSaving(prev => ({ ...prev, [studentId]: true }));

      // Check if score already exists
      const existingScore = assignment?.scores?.find(s => s.student.id === studentId);

      if (existingScore) {
        // Update existing score
        const { error } = await supabase
          .from('scores')
          .update({
            score: scoreData.score,
            feedback: scoreData.feedback,
            graded_at: new Date().toISOString()
          })
          .eq('id', existingScore.id);

        if (error) throw error;
      } else {
        // Create new score
        const { error } = await supabase
          .from('scores')
          .insert({
            assignment_id: assignmentId,
            student_id: studentId,
            score: scoreData.score,
            max_score: assignment?.max_score!,
            feedback: scoreData.feedback,
            graded_by: user?.id
          });

        if (error) throw error;
      }

      // Update local state
      setGradingMode(prev => ({ ...prev, [studentId]: false }));
      
      // Refresh data
      await fetchAssignmentDetails();

    } catch (error) {
      console.error('Error grading submission:', error);
      alert('Gagal menyimpan nilai');
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const getSubmissionStatus = (studentId: string) => {
    const submission = assignment?.submissions?.find(s => s.student.id === studentId);
    const score = assignment?.scores?.find(s => s.student.id === studentId);
    
    if (score) return { status: 'graded', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (submission) return { status: 'submitted', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    return { status: 'pending', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const getSubmissionStats = () => {
    const totalStudents = assignment?.submissions?.length || 0;
    const gradedCount = assignment?.scores?.length || 0;
    const submittedCount = assignment?.submissions?.length || 0;
    
    return { totalStudents, gradedCount, submittedCount };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Tugas tidak ditemukan</h3>
        <p className="text-gray-600">Tugas yang Anda cari tidak ditemukan atau tidak memiliki akses.</p>
      </div>
    );
  }

  const stats = getSubmissionStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{assignment.title}</h1>
            <p className="text-gray-600 mb-2">{assignment.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Kelas: {assignment.class?.grade} - {assignment.class?.class_name}</span>
              <span>Batas: {new Date(assignment.due_date).toLocaleString('id-ID')}</span>
              <span>Nilai Maks: {assignment.max_score}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{stats.submittedCount}</div>
            <div className="text-sm text-gray-500">Pengumpulan</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Total Siswa</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Sudah Dinilai</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.gradedCount}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">Belum Dinilai</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.submittedCount - stats.gradedCount}</div>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Daftar Pengumpulan</h2>
        </div>
        
        <div className="divide-y">
          {assignment.submissions?.map((submission) => {
            const status = getSubmissionStatus(submission.student.id);
            const isGrading = gradingMode[submission.student.id];
            const currentScore = scores[submission.student.id];
            const existingScore = assignment.scores?.find(s => s.student.id === submission.student.id);
            
            return (
              <div key={submission.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-800">{submission.student.full_name}</h3>
                      <span className="text-sm text-gray-500">({submission.student.student_id})</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        {status.status === 'graded' ? 'Dinilai' : status.status === 'submitted' ? 'Dikumpulkan' : 'Belum Dikumpulkan'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{submission.student.email}</p>
                    <p className="text-sm text-gray-500">
                      Dikumpulkan: {new Date(submission.submitted_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {!isGrading ? (
                      <button
                        onClick={() => setGradingMode(prev => ({ ...prev, [submission.student.id]: true }))}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        {existingScore ? 'Edit Nilai' : 'Beri Nilai'}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGradeSubmission(submission.student.id)}
                          disabled={saving[submission.student.id]}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {saving[submission.student.id] ? 'Menyimpan...' : 'Simpan'}
                        </button>
                        <button
                          onClick={() => setGradingMode(prev => ({ ...prev, [submission.student.id]: false }))}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submission Content */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">Jawaban Siswa</h4>
                  {submission.content ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{submission.content}</p>
                  ) : (
                    <p className="text-gray-500 italic">Tidak ada jawaban teks</p>
                  )}
                  
                  {submission.file_url && (
                    <div className="mt-3">
                      <a
                        href={submission.file_url}
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

                {/* Grading Form */}
                {isGrading && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-3">Penilaian</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nilai (0 - {assignment.max_score})
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={assignment.max_score}
                          value={currentScore?.score || ''}
                          onChange={(e) => setScores(prev => ({
                            ...prev,
                            [submission.student.id]: {
                              ...prev[submission.student.id],
                              score: parseInt(e.target.value) || 0
                            }
                          }))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Feedback
                        </label>
                        <textarea
                          value={currentScore?.feedback || ''}
                          onChange={(e) => setScores(prev => ({
                            ...prev,
                            [submission.student.id]: {
                              ...prev[submission.student.id],
                              feedback: e.target.value
                            }
                          }))}
                          rows={3}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Berikan feedback untuk siswa..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Score Display */}
                {existingScore && !isGrading && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Nilai yang Sudah Diberikan</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-green-600">
                          {existingScore.score}/{existingScore.max_score}
                        </span>
                        <span className="ml-2 text-sm text-green-600">
                          ({Math.round((existingScore.score / existingScore.max_score) * 100)}%)
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-600">
                          Dinilai: {new Date(existingScore.graded_at).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    {existingScore.feedback && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <p className="text-sm text-gray-700">
                          <strong>Feedback:</strong> {existingScore.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AssignmentManager;
