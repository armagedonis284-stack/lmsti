import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, LogOut, User as UserIcon } from 'lucide-react';
import {
  BookOpen,
  FileText,
  ClipboardList,
  Trophy,
  LayoutDashboard,
  User,
  Edit
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const teacherMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
    { icon: BookOpen, label: 'Kelola Kelas', path: '/teacher/classes' },
    { icon: FileText, label: 'Kelola Konten', path: '/teacher/content' },
    { icon: Trophy, label: 'Leaderboard', path: '/teacher/leaderboard' },
  ];

  const studentMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
    { icon: User, label: 'Profil', path: '/student/profile' },
    { icon: Edit, label: 'Edit Profil', path: '/student/edit-profile' },
    { icon: FileText, label: 'Materi', path: '/student/materials' },
    { icon: ClipboardList, label: 'Tugas', path: '/student/assignments' },
    { icon: Trophy, label: 'Nilai & Leaderboard', path: '/student/grades' },
  ];

  const menuItems = profile?.role === 'teacher' ? teacherMenuItems : studentMenuItems;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 sm:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        sm:translate-x-0
        fixed sm:static inset-y-0 left-0 z-50 sm:z-auto
        w-64 bg-white/95 backdrop-blur-md shadow-2xl sm:shadow-xl
        border-r border-slate-200/50
        transition-all duration-300 ease-in-out
        ${isOpen ? 'shadow-2xl' : ''}
        h-full
      `}>
        <div className="p-4 sm:p-6 border-b border-slate-200/50 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-indigo-600/10">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ClassRoom</h1>
            <p className="text-xs sm:text-sm text-slate-600 capitalize font-medium">{profile?.role} Dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="sm:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-4 sm:mt-6 px-2 flex-1">
          {menuItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center px-4 sm:px-6 py-3 mx-2 mb-1 rounded-xl text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600 transition-all duration-200 border border-transparent hover:border-blue-200/50 hover:shadow-md ${
                  isActive ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border-blue-200/50 shadow-md font-medium' : ''
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={`mr-3 transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-blue-600'}`} />
                  <span className="text-sm sm:text-base font-medium">{label}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full"></div>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Mobile logout button */}
          <div className="sm:hidden mt-4 px-2">
            <button
              onClick={handleSignOut}
              className="group flex items-center w-full px-4 py-3 mx-2 mb-1 rounded-xl text-slate-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-200 border border-slate-200/50 hover:border-red-300 shadow-sm hover:shadow-md"
            >
              <LogOut size={20} className="mr-3 transition-transform duration-200 group-hover:rotate-12" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </nav>

        {/* Decorative bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-xl p-3 border border-slate-200/30">
            <div className="flex items-center text-xs text-slate-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              <span className="font-medium">System Online</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;