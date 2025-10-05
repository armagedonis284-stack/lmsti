import React from 'react';
import { Link } from 'react-router-dom';
import {
  Home,
  BookOpen,
  ClipboardList,
  FileText,
  Trophy,
  User,
  Settings,
  X,
  FolderOpen,
  GraduationCap
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isTeacher: boolean;
  currentPath: string;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isTeacher, currentPath, onClose }) => {
  const teacherMenuItems = [
    {
      title: 'Dashboard',
      icon: Home,
      path: '/teacher/dashboard',
    },
    {
      title: 'Kelola Kelas',
      icon: BookOpen,
      path: '/teacher/classes',
    },
    {
      title: 'Kelola Konten',
      icon: FileText,
      path: '/teacher/content',
    },
    {
      title: 'Leaderboard',
      icon: Trophy,
      path: '/teacher/leaderboard',
    },
  ];

  const studentMenuItems = [
    {
      title: 'Dashboard',
      icon: Home,
      path: '/student/dashboard',
    },
    {
      title: 'Materi',
      icon: FolderOpen,
      path: '/student/materials',
    },
    {
      title: 'Tugas',
      icon: ClipboardList,
      path: '/student/assignments',
    },
    {
      title: 'Nilai',
      icon: Trophy,
      path: '/student/grades',
    },
    {
      title: 'Profil',
      icon: User,
      path: '/student/profile',
    },
  ];

  const menuItems = isTeacher ? teacherMenuItems : studentMenuItems;

  const isActive = (path: string) => {
    if (path === '/teacher/dashboard' || path === '/student/dashboard') {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out rounded-r-2xl
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0 lg:static lg:inset-0 lg:rounded-none
      animate-fade-in
    `}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl lg:rounded-none">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isTeacher ? 'Teacher Panel' : 'Student Portal'}
              </h2>
              <p className="text-sm text-blue-100">
                {isTeacher ? 'Kelola pembelajaran' : 'Akses materi'}
              </p>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group menu-item-hover animate-slide-up
                  ${active
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                  }
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Icon className={`
                  w-5 h-5 transition-colors duration-200
                  ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                `} />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {/* User name will be passed as prop */}
                User
              </p>
              <p className="text-xs text-gray-500 truncate">
                {isTeacher ? 'Guru' : 'Siswa'}
              </p>
            </div>
            <Settings className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;