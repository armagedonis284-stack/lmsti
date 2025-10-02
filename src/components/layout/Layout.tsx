import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../contexts/AuthContext';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        sm:translate-x-0
        fixed sm:static inset-y-0 left-0 z-50 sm:z-auto
        w-64 bg-white shadow-lg sm:shadow-xl
        transition-transform duration-300 ease-in-out
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0 w-full">
        {/* Mobile header with menu button */}
        <div className="sm:hidden bg-white shadow-sm border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">ClassRoom</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 sm:p-6">
          <div className="w-full max-w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;