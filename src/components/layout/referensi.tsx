import React, { useState } from 'react';
import { Menu, X, LogOut, User, BookOpen, FileText, ClipboardList, Trophy, LayoutDashboard, Edit, ChevronDown } from 'lucide-react';

// Mock Auth Context
const AuthContext = React.createContext({
  profile: { full_name: 'John Doe', role: 'teacher' },
  signOut: async () => {}
});

const useAuth = () => React.useContext(AuthContext);

// Header Component
const Header = () => {
  const { profile, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setDropdownOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 lg:px-6 py-3">
        {/* Left: Logo/Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">ClassRoom</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Learning Management System</p>
          </div>
        </div>

        {/* Right: User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={16} className="text-blue-600" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-gray-800">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
            <ChevronDown size={16} className={`text-gray-600 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-20 py-2">
                {/* User Info in Dropdown */}
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-semibold text-gray-800">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <User size={16} />
                    <span>Profile Settings</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Edit size={16} />
                    <span>Edit Profile</span>
                  </button>
                </div>

                {/* Sign Out */}
                <div className="border-t pt-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

// Sidebar Component
const Sidebar = ({ onClose, isOpen }) => {
  const { profile } = useAuth();

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
  const [activeItem, setActiveItem] = useState(menuItems[0].path);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 lg:p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">ClassRoom</h1>
            <p className="text-xs text-gray-500 capitalize">{profile?.role} Portal</p>
          </div>
        </div>
        
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Menu
          </p>
        </div>
        {menuItems.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => {
              setActiveItem(path);
              if (onClose) onClose();
            }}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${
              activeItem === path
                ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
            }`}
          >
            <Icon size={20} className="flex-shrink-0" />
            <span className="text-sm lg:text-base">{label}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          © 2024 ClassRoom
        </p>
      </div>
    </div>
  );
};

// Mobile Sidebar Dropdown
const MobileSidebarDropdown = ({ isOpen, onClose }) => {
  const { profile, signOut } = useAuth();

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
  const [activeItem, setActiveItem] = useState(menuItems[0].path);

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dropdown Panel */}
      <div className="fixed top-14 left-0 right-0 bg-white shadow-xl z-50 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
        {/* User Info */}
        <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User size={24} className="text-white" />
            </div>
            <div>
              <p className="font-semibold">{profile?.full_name}</p>
              <p className="text-sm text-blue-100 capitalize">{profile?.role}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="py-2">
          {menuItems.map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => {
                setActiveItem(path);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                activeItem === path
                  ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </nav>

        {/* Sign Out */}
        <div className="border-t p-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut size={18} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

// Layout Component
const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shadow-lg">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Dropdown */}
      <div className="lg:hidden">
        <MobileSidebarDropdown 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 w-full">
        {/* Header with Mobile Menu Button */}
        <div className="lg:hidden bg-white border-b shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <BookOpen size={14} className="text-white" />
              </div>
              <h1 className="text-base font-bold text-gray-800">ClassRoom</h1>
            </div>
            
            <div className="w-10" />
          </div>
        </div>

        {/* Header - Desktop only */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 md:p-8 mb-6 text-white">
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Welcome Back! 👋
                </h2>
                <p className="text-blue-100">
                  Here's what's happening with your classes today.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
                {[
                  { label: 'Total Classes', value: '12', icon: BookOpen, color: 'blue' },
                  { label: 'Students', value: '248', icon: User, color: 'green' },
                  { label: 'Assignments', value: '36', icon: FileText, color: 'yellow' },
                  { label: 'Completed', value: '89%', icon: Trophy, color: 'purple' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                        <stat.icon size={24} className={`text-${stat.color}-600`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-800 mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">Activity {item}</p>
                          <p className="text-xs text-gray-500">2 hours ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Upcoming Tasks</h3>
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <ClipboardList size={18} className="text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">Task {item}</p>
                          <p className="text-xs text-gray-500">Due tomorrow</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// App Component
export default function App() {
  return (
    <AuthContext.Provider value={{
      profile: { full_name: 'John Doe', role: 'teacher' },
      signOut: async () => console.log('Signed out')
    }}>
      <Layout />
    </AuthContext.Provider>
  );
}