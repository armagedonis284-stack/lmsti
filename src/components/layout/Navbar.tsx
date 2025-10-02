import React from 'react';
import { LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Mobile Navbar */}
      <div className="sm:hidden bg-white/90 backdrop-blur-md shadow-lg border-b border-slate-200/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onMenuClick}
            className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ClassRoom</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Desktop Navbar */}
      <header className="hidden sm:block bg-white/90 backdrop-blur-md shadow-lg border-b border-slate-200/50">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center min-w-0 flex-1">
            <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-lg px-3 py-2 mr-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-slate-800 truncate">
              Welcome back, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{profile?.full_name}</span>
            </h2>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center text-slate-600 bg-slate-50/80 px-3 py-2 rounded-lg border border-slate-200/50">
              <User size={18} className="mr-2 text-blue-600" />
              <span className="capitalize text-xs sm:text-sm font-semibold text-slate-700">{profile?.role}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="group items-center px-3 sm:px-4 py-2 text-slate-600 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 rounded-lg transition-all duration-200 border border-slate-200 hover:border-red-300 shadow-sm hover:shadow-md"
            >
              <LogOut size={16} className="mr-1 sm:mr-2 transition-transform duration-200 group-hover:rotate-12" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Decorative bottom border */}
        <div className="h-0.5 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20"></div>
      </header>
    </>
  );
};

export default Navbar;