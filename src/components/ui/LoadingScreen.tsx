import React from 'react';
import { BookOpen } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center">
      {/* Logo and Brand */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">ClassRoom</h1>
        <p className="text-gray-600">Sistem Manajemen Kelas Digital</p>
      </div>

      {/* Loading Animation */}
      <div className="relative mb-6">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
      </div>

      {/* Loading Text */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Memuat Aplikasi...</h2>
        <p className="text-gray-500 text-sm">Menyiapkan lingkungan belajar digital Anda</p>
      </div>

      {/* Loading Dots */}
      <div className="flex space-x-1 mt-6">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
};

export default LoadingScreen;