import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export enum UserRole {
  Teacher = 'teacher',
  Student = 'student',
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, profile, loading } = useAuth();

  // Loading state dengan animasi
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-sm">Memuat aplikasi...</p>
        <div className="mt-2 w-48 bg-gray-200 rounded-full h-1 overflow-hidden">
          <div className="bg-blue-600 h-1 animate-progress"></div>
        </div>
        <style>
          {`
            @keyframes progress {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(0%); }
              100% { transform: translateX(100%); }
            }
            .animate-progress {
              animation: progress 2s infinite;
            }
          `}
        </style>
      </div>
    );
  }

  // Belum login → ke auth
  if (!user || !profile) {
    return <Navigate to="/auth" replace />;
  }

  // Role tidak sesuai → redirect ke dashboard masing-masing
  if (requiredRole && profile.role !== requiredRole) {
    const redirectPath = profile.role === UserRole.Teacher 
      ? '/teacher/dashboard' 
      : '/student/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  // Jika lolos semua pengecekan → render halaman
  return <>{children}</>;
};

export default ProtectedRoute;
