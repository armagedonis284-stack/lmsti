import React from 'react';
import { BookOpen, Users, GraduationCap } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center">
      {/* Logo and Brand */}
      <div className="text-center mb-12">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">ClassRoom</h1>
        <p className="text-gray-600 text-lg">Sistem Manajemen Kelas Digital</p>
      </div>

      {/* Loading Animation */}
      <div className="relative mb-8">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-blue-400 opacity-20"></div>
      </div>

      {/* Loading Text */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Memuat Aplikasi...</h2>
        <p className="text-gray-500">Menyiapkan lingkungan belajar digital Anda</p>
      </div>

      {/* Progress Bar */}
      <div className="w-80 max-w-sm mb-8">
        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full animate-pulse" style={{ width: "75%" }}></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Menginisialisasi...</span>
          <span>75%</span>
        </div>
      </div>

      {/* Feature Icons */}
      <div className="flex space-x-8 text-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-xs text-gray-600">Manajemen Siswa</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
            <GraduationCap className="w-6 h-6 text-green-600" />
          </div>
          <span className="text-xs text-gray-600">Konten Pembelajaran</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
            <BookOpen className="w-6 h-6 text-purple-600" />
          </div>
          <span className="text-xs text-gray-600">Absensi Digital</span>
        </div>
      </div>

      {/* Loading Dots */}
      <div className="flex space-x-2 mt-8">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
};

export default LoadingScreen;