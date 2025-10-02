import React, { useState, useEffect } from 'react';
import { Download, FileText, BookOpen, Calendar, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ContentCardSkeleton } from '../ui/SkeletonLoader';

interface Material {
  id: string;
  title: string;
  description: string;
  content: string;
  file_url: string;
  created_at: string;
  class: {
    grade: string;
    class_name: string;
  };
}

const StudentMaterials: React.FC = () => {
  const { user, profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  useEffect(() => {
    if (user && profile) {
      fetchMaterials();
    }
  }, [user, profile]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);

      // First get student's enrolled classes
      const { data: enrolledClasses, error: enrolledError } = await supabase
        .from('students_classes')
        .select(`
          class_id,
          class:classes(grade, class_name)
        `)
        .eq('student_id', user?.id);

      if (enrolledError) throw enrolledError;

      const classIds = enrolledClasses?.map(ec => ec.class_id) || [];

      if (classIds.length === 0) {
        setMaterials([]);
        return;
      }

      // Get materials for enrolled classes
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select(`
          *,
          class:classes(grade, class_name)
        `)
        .in('class_id', classIds)
        .order('created_at', { ascending: false });

      if (materialsError) throw materialsError;

      setMaterials(materialsData || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = (fileUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = `material_${title}_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewMaterial = (material: Material) => {
    setSelectedMaterial(material);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Materi Pembelajaran</h1>
        <p className="text-gray-600">Akses materi dari kelas yang Anda ikuti</p>
      </div>

      {materials.length === 0 && !loading ? (
        <div className="text-center py-12">
          <BookOpen size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada materi</h3>
          <p className="text-gray-600">Guru belum mengupload materi untuk kelas Anda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            <div key={material.id} className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-gray-800 leading-tight mb-2">
                    {material.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {material.class.grade} {material.class.class_name}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>{formatDate(material.created_at)}</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {material.description}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewMaterial(material)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Eye size={14} />
                  <span>Lihat</span>
                </button>
                {material.file_url && (
                  <button
                    onClick={() => handleDownloadFile(material.file_url, material.title)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Material Detail Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedMaterial.title}</h2>
                  <p className="text-sm text-gray-600">
                    {selectedMaterial.class.grade} {selectedMaterial.class.class_name} •
                    Dibuat {formatDate(selectedMaterial.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedMaterial.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Deskripsi</h3>
                  <p className="text-gray-600">{selectedMaterial.description}</p>
                </div>
              )}

              {selectedMaterial.content && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">Konten</h3>
                  <div className="bg-gray-50 rounded-md p-4">
                    <div className="prose max-w-none">
                      {selectedMaterial.content.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-2 text-gray-700">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedMaterial.file_url && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-2">File Pendukung</h3>
                  <button
                    onClick={() => handleDownloadFile(selectedMaterial.file_url, selectedMaterial.title)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                  >
                    <Download size={16} />
                    <span>Download File</span>
                  </button>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentMaterials;