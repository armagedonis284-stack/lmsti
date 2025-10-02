import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Download, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { FormSkeleton } from '../ui/SkeletonLoader';

interface Assignment {
  id: string;
  title: string;
  description: string;
  max_score: number;
  class: {
    grade: string;
    class_name: string;
  };
}

interface Student {
  id: string;
  full_name: string;
  student_id: string;
}

interface Submission {
  id: string;
  content: string;
  file_url: string;
  submitted_at: string;
  student: Student;
}

const GradeAssignment: React.FC = () => {
  const { user, profile } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gradeData, setGradeData] = useState({
    score: '',
    feedback: ''
  });

  useEffect(() => {
    if (user && profile) {
      fetchData();
    }
  }, [user, profile]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Get parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const assignmentId = urlParams.get('id');
      const studentId = urlParams.get('student');

      if (!assignmentId || !studentId) {
        alert('Parameter tidak lengkap');
        window.location.href = '/teacher/assignments';
        return;
      }

      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          class:classes(grade, class_name)
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Verify teacher has access to this assignment
      if (assignmentData.created_by !== user?.id) {
        alert('Anda tidak memiliki akses untuk menilai tugas ini');
        window.location.href = '/teacher/assignments';
        return;
      }

      setAssignment(assignmentData);

      // Fetch student submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('submissions')
        .select(`
          *,
          student:students(id, full_name, student_id)
        `)
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .single();

      if (submissionError) throw submissionError;

      setSubmission(submissionData);

      // Check if already graded
      const { data: existingScore, error: scoreError } = await supabase
        .from('scores')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .single();

      if (!scoreError && existingScore) {
        setGradeData({
          score: existingScore.score.toString(),
          feedback: existingScore.feedback || ''
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gradeData.score) {
      alert('Mohon masukkan nilai');
      return;
    }

    const score = parseInt(gradeData.score);
    const maxScore = assignment?.max_score || 100;
    if (score < 0 || score > maxScore) {
      alert(`Nilai harus antara 0 dan ${maxScore}`);
      return;
    }

    try {
      setSaving(true);

      const scoreData = {
        assignment_id: assignment?.id,
        student_id: submission?.student.id,
        score: score,
        max_score: assignment?.max_score || 100,
        feedback: gradeData.feedback,
        graded_by: user?.id
      };

      // Check if score already exists
      const { data: existingScore } = await supabase
        .from('scores')
        .select('id')
        .eq('assignment_id', assignment?.id)
        .eq('student_id', submission?.student.id)
        .single();

      let error;
      if (existingScore) {
        // Update existing score
        const result = await supabase
          .from('scores')
          .update(scoreData)
          .eq('id', existingScore.id);
        error = result.error;
      } else {
        // Insert new score
        const result = await supabase
          .from('scores')
          .insert(scoreData);
        error = result.error;
      }

      if (error) throw error;

      alert('Nilai berhasil disimpan');
      window.location.href = `/teacher/assignments/${assignment?.id}/submissions`;
    } catch (error) {
      console.error('Error saving grade:', error);
      alert('Gagal menyimpan nilai');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFile = (fileUrl: string, studentName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `submission_${studentName}_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <FormSkeleton />
      </div>
    );
  }

  if (!assignment || !submission) {
    return (
      <div className="p-6">
        <p className="text-center text-gray-600">Data tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} />
          <span>Kembali</span>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Penilaian Tugas</h1>
          <p className="text-sm text-gray-600 mt-1">
            {assignment.title} • {submission.student.full_name} ({submission.student.student_id})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Info */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Informasi Tugas</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Judul</label>
              <p className="text-gray-900">{assignment.title}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Kelas</label>
              <p className="text-gray-900">{assignment.class.grade} {assignment.class.class_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nilai Maksimal</label>
              <p className="text-gray-900">{assignment.max_score}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dikumpulkan</label>
              <p className="text-gray-900">
                {new Date(submission.submitted_at).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {assignment.description && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-gray-700">{assignment.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Student Submission */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Pengumpulan Siswa</h2>

          {submission.content && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Konten</label>
              <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap">{submission.content}</p>
              </div>
            </div>
          )}

          {submission.file_url && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">File Lampiran</label>
              <button
                onClick={() => handleDownloadFile(submission.file_url, submission.student.full_name)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <Download size={16} />
                <span>Download File</span>
              </button>
            </div>
          )}

          {!submission.content && !submission.file_url && (
            <p className="text-gray-500 italic">Tidak ada konten pengumpulan</p>
          )}
        </div>
      </div>

      {/* Grading Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Berikan Penilaian</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nilai <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={gradeData.score}
                onChange={(e) => setGradeData(prev => ({ ...prev, score: e.target.value }))}
                min="0"
                max={assignment.max_score}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`0 - ${assignment.max_score}`}
                required
              />
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                Dari nilai maksimal: {assignment.max_score}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback (Opsional)
            </label>
            <textarea
              value={gradeData.feedback}
              onChange={(e) => setGradeData(prev => ({ ...prev, feedback: e.target.value }))}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Berikan feedback atau komentar untuk siswa"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Menyimpan...' : 'Simpan Nilai'}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center justify-center gap-2"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GradeAssignment;