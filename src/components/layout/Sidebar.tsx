import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  Users,
  FileText,
  ClipboardList,
  Calendar,
  Trophy,
  LayoutDashboard,
  UserPlus,
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { profile } = useAuth();

  const teacherMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
    { icon: BookOpen, label: 'Manage Kelas', path: '/teacher/classes' },
    { icon: UserPlus, label: 'Manage Siswa', path: '/teacher/students' },
    { icon: FileText, label: 'Materi & Tugas', path: '/teacher/materials' },
    { icon: Calendar, label: 'Absensi', path: '/teacher/attendance' },
    { icon: Trophy, label: 'Leaderboard', path: '/teacher/leaderboard' },
  ];

  const studentMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
    { icon: User, label: 'Profil', path: '/student/profile' },
    { icon: FileText, label: 'Materi', path: '/student/materials' },
    { icon: ClipboardList, label: 'Tugas', path: '/student/assignments' },
    { icon: Trophy, label: 'Nilai & Leaderboard', path: '/student/grades' },
  ];

  const menuItems = profile?.role === 'teacher' ? teacherMenuItems : studentMenuItems;

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-gray-800">ClassRoom</h1>
        <p className="text-sm text-gray-600 capitalize">{profile?.role} Dashboard</p>
      </div>
      
      <nav className="mt-6">
        {menuItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 ${
                isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''
              }`
            }
          >
            <Icon size={20} className="mr-3" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;