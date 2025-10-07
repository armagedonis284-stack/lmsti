import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  const [showTimeout, setShowTimeout] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    // Show timeout message after 5 seconds
    const timeout = setTimeout(() => {
      setShowTimeout(true);
    }, 5000);

    // Show retry option after 10 seconds
    const retryTimeout = setTimeout(() => {
      setShowRetry(true);
    }, 10000);

    return () => {
      clearTimeout(timeout);
      clearTimeout(retryTimeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center p-4">
      {/* Logo and Brand */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-lg mb-3">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-1">ClassRoom</h1>
        <p className="text-gray-600 text-sm">Sistem Manajemen Kelas Digital</p>
      </div>

      {/* Loading Animation */}
      <div className="relative mb-4">
        <div className="w-8 h-8 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
      </div>

      {/* Loading Text */}
      <div className="text-center">
        <h2 className="text-base font-semibold text-gray-700 mb-1">Memuat Aplikasi...</h2>
        <p className="text-gray-500 text-xs">Menyiapkan lingkungan belajar digital Anda</p>
      </div>

      {/* Timeout Message */}
      {showTimeout && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-center max-w-sm">
          <p className="text-yellow-800 text-sm">
            Loading terlalu lama? Coba refresh halaman atau periksa koneksi internet Anda.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
          >
            Refresh Halaman
          </button>
        </div>
      )}

      {/* Retry Option */}
      {showRetry && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center max-w-sm">
          <p className="text-red-800 text-sm mb-2">
            <span className="font-semibold">⚠️ Masalah loading?</span> Coba refresh halaman.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
          >
            Refresh Halaman
          </button>
        </div>
      )}

      {/* Loading Dots */}
      <div className="flex space-x-1 mt-4">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  );
};

export default LoadingScreen;