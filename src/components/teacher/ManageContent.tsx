import React, { useState, useEffect } from 'react';
import { Plus, FileText, BookOpen, Edit, Trash2, Download, Eye, CheckCircle, Calendar, Filter, Users, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ContentCardSkeleton } from '../ui/SkeletonLoader';

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: 'mandatory' | 'additional';
  due_date: string;
  max_score: number;
  class_id: string;
  created_at: string;
  updated_at: string;
  class?: {
    grade: string;
    class_name: string;
  };
  grade?: string;
  assignment_grade?: string;
  submission_count?: number;
  graded_count?: number;
  content_type: 'assignment';
}

interface Material {
  id: string;
  title: string;
  description: string;
  content: string;
  file_url: string;
  class_id: string;
  created_at: string;
  updated_at: string;
  class?: {
    grade: string;
    class_name: string;
  };
  content_type: 'material';
}

type ContentItem = Assignment | Material;

const ManageContent: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assignments' | 'materials'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile) {
      fetchContent();
    }
  }, [user, profile]);

  const fetchContent = async () => {
    try {
      setLoading(true);

      // First get all classes for the teacher
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user?.id);

      if (classesError) throw classesError;

      const classIds = classes?.map(c => c.id) || [];

      if (classIds.length === 0) {
        setContent([]);
        return;
      }

      // Get assignments with class info and submission stats
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          class:classes(grade, class_name),
          submissions(count),
          scores(count)
        `)
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Get materials with class info
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select(`
          *,
          class:classes(grade, class_name)
        `)
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (materialsError) throw materialsError;

      // Transform and combine data
      const assignmentsWithType = assignmentsData?.map(assignment => ({
        ...assignment,
        content_type: 'assignment' as const,
        grade: assignment.class?.grade,
        assignment_grade: assignment.class?.grade,
        submission_count: assignment.submissions?.[0]?.count || 0,
        graded_count: assignment.scores?.[0]?.count || 0
      })) || [];

      const materialsWithType = materialsData?.map(material => ({
        ...material,
        content_type: 'material' as const
      })) || [];

      // Combine and sort by creation date
      const combinedContent = [...assignmentsWithType, ...materialsWithType]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setContent(combinedContent);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = async (contentId: string, contentType: 'assignment' | 'material') => {
    if (!confirm('Apakah Anda yakin ingin menghapus konten ini?')) return;

    try {
      setDeletingId(contentId);
      const table = contentType === 'assignment' ? 'assignments' : 'materials';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      setContent(prev => prev.filter(item => item.id !== contentId));
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Gagal menghapus konten');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredContent = content.filter(item => {
    if (filter === 'all') return true;
    return item.content_type === filter.slice(0, -1); // Remove 's' from filter
  });

  const getTypeLabel = (type: string, contentType: string) => {
    if (contentType === 'assignment') {
      return type === 'mandatory' ? 'Tugas Wajib' : 'Tugas Tambahan';
    }
    return 'Materi';
  };

  const getTypeColor = (type: string, contentType: string) => {
    if (contentType === 'assignment') {
      return type === 'mandatory' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ContentCardSkeleton count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Kelola Konten</h1>
          <p className="text-sm text-gray-600 mt-1">Kelola tugas dan materi pembelajaran</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'assignments' | 'materials')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Semua Konten</option>
            <option value="assignments">Tugas</option>
            <option value="materials">Materi</option>
          </select>
          <button
            onClick={() => navigate('/teacher/content/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
          >
            <Plus size={20} />
            <span className="hidden xs:inline">Tambah Konten</span>
            <span className="xs:hidden">Tambah</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {[
          { key: 'all', label: 'Semua', count: content.length },
          { key: 'assignments', label: 'Tugas', count: content.filter(c => c.content_type === 'assignment').length },
          { key: 'materials', label: 'Materi', count: content.filter(c => c.content_type === 'material').length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {filteredContent.length === 0 && !loading ? (
        <div className="text-center py-12">
          <FileText size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'Belum ada konten' : `Belum ada ${filter === 'assignments' ? 'tugas' : 'materi'}`}
          </h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all'
              ? 'Tambahkan konten pertama Anda untuk mulai memberikan pembelajaran'
              : `Tambahkan ${filter === 'assignments' ? 'tugas' : 'materi'} pertama Anda`
            }
          </p>
          <button
            onClick={() => navigate('/teacher/content/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Tambah Konten Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {item.content_type === 'assignment' ? (
                      <CheckCircle size={16} className="text-blue-600" />
                    ) : (
                      <BookOpen size={16} className="text-green-600" />
                    )}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTypeColor(
                      item.content_type === 'assignment' ? (item as Assignment).type : 'material',
                      item.content_type
                    )}`}>
                      {getTypeLabel(
                        item.content_type === 'assignment' ? (item as Assignment).type : 'material',
                        item.content_type
                      )}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg text-gray-800 leading-tight mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {item.content_type === 'material'
                      ? `${item.class?.grade} ${item.class?.class_name}`
                      : item.content_type === 'assignment' && (item as Assignment).type === 'mandatory'
                        ? `${item.class?.grade} ${item.class?.class_name}`
                        : `Tingkat ${(item as Assignment).assignment_grade}`
                    }
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  {item.content_type === 'assignment' && (
                    <button
                      onClick={() => navigate(`/teacher/assignments/${item.id}/submissions`)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Lihat Pengumpulan"
                    >
                      <Eye size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/teacher/content/${item.id}/edit`)}
                    className="text-gray-600 hover:text-gray-800 p-1"
                    title="Edit Konten"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteContent(item.id, item.content_type)}
                    disabled={deletingId === item.id}
                    className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                    title="Hapus Konten"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {item.description}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>
                  Dibuat {new Date(item.created_at).toLocaleDateString('id-ID')}
                </span>
                {item.content_type === 'assignment' && (
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{(item as Assignment).submission_count || 0} Pengumpulan</span>
                  </div>
                )}
              </div>

              {item.content_type === 'assignment' && (item as Assignment).due_date && (
                <div className="mb-4">
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar size={14} />
                    <span className={isOverdue((item as Assignment).due_date) ? 'text-red-600' : 'text-gray-600'}>
                      Batas: {new Date((item as Assignment).due_date).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>
              )}

              {item.content_type === 'material' && (item as Material).file_url && (
                <div className="mb-4">
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = (item as Material).file_url;
                      link.download = `material_${item.title}_${Date.now()}`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Download size={14} />
                    <span>Download File</span>
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                {item.content_type === 'assignment' ? (
                  <>
                    <button
                      onClick={() => navigate(`/teacher/assignments/${item.id}/submissions`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Eye size={14} />
                      <span>Lihat Pengumpulan</span>
                    </button>
                    <button
                      onClick={() => navigate(`/teacher/assignments/${item.id}/grade`)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={14} />
                      <span>Penilaian</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate(`/teacher/materials/${item.id}/view`)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Eye size={14} />
                      <span>Lihat</span>
                    </button>
                    <button
                      onClick={() => navigate(`/teacher/materials/${item.id}/edit`)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageContent;