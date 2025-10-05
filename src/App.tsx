import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute, { UserRole } from "./components/ProtectedRoute";
import Layout from "./components/layout/Layout";

// Lazy load biar cepat load awal
const AuthForm = lazy(() => import("./components/auth/AuthForm"));
const TeacherDashboard = lazy(() => import("./components/teacher/TeacherDashboard"));
const ManageClasses = lazy(() => import("./components/teacher/ManageClasses"));
const ClassStudents = lazy(() => import("./components/teacher/ClassStudents"));
const ClassAttendance = lazy(() => import("./components/teacher/ClassAttendance"));
const TakeAttendance = lazy(() => import("./components/teacher/TakeAttendance"));
const AttendanceRecords = lazy(() => import("./components/teacher/AttendanceRecords"));
const AssignmentSubmissions = lazy(() => import("./components/teacher/AssignmentSubmissions"));
const GradeAssignment = lazy(() => import("./components/teacher/GradeAssignment"));
const ManageContent = lazy(() => import("./components/teacher/ManageContent"));
const CreateContent = lazy(() => import("./components/teacher/CreateContent"));
const EditContent = lazy(() => import("./components/teacher/EditContent"));
const TeacherLeaderboard = lazy(() => import("./components/teacher/TeacherLeaderboard"));

const StudentDashboard = lazy(() => import("./components/student/StudentDashboard"));
const StudentProfile = lazy(() => import("./components/student/StudentProfile"));
const EditProfile = lazy(() => import("./components/student/EditProfile"));
const StudentMaterials = lazy(() => import("./components/student/StudentMaterials"));
const StudentLeaderboard = lazy(() => import("./components/student/StudentLeaderboard"));

// Loader khusus
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
    <p className="text-gray-600 text-sm">Memuat aplikasi...</p>
    <div className="mt-2 w-48 bg-gray-200 rounded-full h-1">
      <div
        className="bg-blue-600 h-1 rounded-full animate-pulse"
        style={{ width: "60%" }}
      ></div>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user || !profile) return <AuthForm />;

  const defaultPath = profile.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";

  return (
    <Routes>
      <Route path="/" element={<Navigate to={defaultPath} replace />} />

      {/* Teacher routes */}
      <Route
        path="/teacher/*"
        element={
          <ProtectedRoute requiredRole={UserRole.Teacher}>
            <Layout />
          </ProtectedRoute>
        }
      >
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

      {/* Student routes */}
      <Route
        path="/student/*"
        element={
          <ProtectedRoute requiredRole={UserRole.Student}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="edit-profile" element={<EditProfile />} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="assignments" element={<div className="p-6">Assignments - Coming Soon</div>} />
        <Route path="grades" element={<StudentLeaderboard />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={defaultPath} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <AppContent />
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
