import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import AssignmentManager from './AssignmentManager';

const AssignmentSubmissions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">ID Tugas tidak ditemukan</h3>
        <p className="text-gray-600">Silakan pilih tugas dari daftar tugas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/teacher/content')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Kembali ke Kelola Konten
        </button>
      </div>

      {/* Assignment Manager */}
      <AssignmentManager assignmentId={id} />
    </div>
  );
};

export default AssignmentSubmissions;