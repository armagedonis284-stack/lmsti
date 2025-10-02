import React from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
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
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { profile } = useAuth();

  const teacherMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
    { icon: BookOpen, label: 'Kelola Kelas', path: '/teacher/classes' },
    { icon: FileText, label: 'Materi & Tugas', path: '/teacher/materials' },
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
    <div className="w-full sm:w-64 bg-white shadow-lg sm:shadow-xl h-full">
      <div className="p-4 sm:p-6 border-b flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">ClassRoom</h1>
          <p className="text-xs sm:text-sm text-gray-600 capitalize">{profile?.role} Dashboard</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="sm:hidden p-1 text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="mt-4 sm:mt-6">
        {menuItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center px-4 sm:px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 ${
                isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''
              }`
            }
          >
            <Icon size={20} className="mr-3" />
            <span className="text-sm sm:text-base">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;