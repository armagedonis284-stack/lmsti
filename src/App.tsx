import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/auth/AuthForm';
import Layout from './components/layout/Layout';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentDashboard from './components/student/StudentDashboard';
import StudentProfile from './components/student/StudentProfile';
import EditProfile from './components/student/EditProfile';
import ManageClasses from './components/teacher/ManageClasses';
import ClassStudents from './components/teacher/ClassStudents';
import ClassAttendance from './components/teacher/ClassAttendance';
import TakeAttendance from './components/teacher/TakeAttendance';
import AttendanceRecords from './components/teacher/AttendanceRecords';
import AssignmentSubmissions from './components/teacher/AssignmentSubmissions';
import GradeAssignment from './components/teacher/GradeAssignment';
import ManageContent from './components/teacher/ManageContent';
import CreateContent from './components/teacher/CreateContent';
import EditContent from './components/teacher/EditContent';
import TeacherLeaderboard from './components/teacher/TeacherLeaderboard';
import StudentLeaderboard from './components/student/StudentLeaderboard';
import StudentMaterials from './components/student/StudentMaterials';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 text-sm">Memuat aplikasi...</p>
        <div className="mt-2 w-48 bg-gray-200 rounded-full h-1">
          <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{width: '60%'}}></div>
        </div>
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
        <Route path="classes" element={<ManageClasses />} />
        <Route path="classes/:classId/students" element={<ClassStudents />} />
        <Route path="classes/:classId/attendance" element={<ClassAttendance />} />
        <Route path="classes/:classId/attendance/:sessionId" element={<TakeAttendance />} />
        <Route path="classes/:classId/attendance/:sessionId/records" element={<AttendanceRecords />} />
        <Route path="assignments/:id/submissions" element={<AssignmentSubmissions />} />
        <Route path="assignments/:id/grade" element={<GradeAssignment />} />
        <Route path="content" element={<ManageContent />} />
        <Route path="content/create" element={<CreateContent />} />
        <Route path="content/:id/edit" element={<EditContent />} />
        <Route path="leaderboard" element={<TeacherLeaderboard />} />
      </Route>
      
      <Route path="/student/*" element={
        <ProtectedRoute requiredRole="student">
          <Layout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="edit-profile" element={<EditProfile />} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="assignments" element={<div className="p-6">Assignments - Coming Soon</div>} />
        <Route path="grades" element={<StudentLeaderboard />} />
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