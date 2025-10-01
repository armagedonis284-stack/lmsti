import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/auth/AuthForm';
import Layout from './components/layout/Layout';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import StudentProfile from './components/student/StudentProfile';
import ManageStudents from './components/teacher/ManageStudents';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthForm />;
  }

  return (
    <Routes>
      <Route path="/auth" element={<Navigate to={profile.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />} />
      
      <Route path="/" element={<Navigate to={profile.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'} replace />} />
      
      <Route path="/teacher/*" element={
        <ProtectedRoute requiredRole="teacher">
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="classes" element={<div className="p-6">Manage Classes - Coming Soon</div>} />
        <Route path="students" element={<ManageStudents />} />
        <Route path="materials" element={<div className="p-6">Materials & Assignments - Coming Soon</div>} />
        <Route path="attendance" element={<div className="p-6">Attendance - Coming Soon</div>} />
        <Route path="leaderboard" element={<div className="p-6">Leaderboard - Coming Soon</div>} />
      </Route>
      
      <Route path="/student/*" element={
        <ProtectedRoute requiredRole="student">
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="materials" element={<div className="p-6">Materials - Coming Soon</div>} />
        <Route path="assignments" element={<div className="p-6">Assignments - Coming Soon</div>} />
        <Route path="grades" element={<div className="p-6">Grades & Leaderboard - Coming Soon</div>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;