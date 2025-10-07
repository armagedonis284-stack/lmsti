import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RouteProvider } from "./components/RouteProvider";
import PrivateRoute, { UserRole } from "./components/PrivateRoute";
import Layout from "./components/layout/Layout";
import LoadingScreen from "./components/ui/LoadingScreen";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { getAndClearRedirectPath } from "./utils/authStorage";

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
const GradeManagement = lazy(() => import("./components/teacher/GradeManagement"));
const ManageContent = lazy(() => import("./components/teacher/ManageContent"));
const CreateContent = lazy(() => import("./components/teacher/CreateContent"));
const EditContent = lazy(() => import("./components/teacher/EditContent"));
const TeacherLeaderboard = lazy(() => import("./components/teacher/TeacherLeaderboard"));

const StudentDashboard = lazy(() => import("./components/student/StudentDashboard"));
const StudentProfile = lazy(() => import("./components/student/StudentProfile"));
const EditProfile = lazy(() => import("./components/student/EditProfile"));
const StudentMaterials = lazy(() => import("./components/student/StudentMaterials"));
const StudentAssignments = lazy(() => import("./components/student/StudentAssignments"));
const StudentLeaderboard = lazy(() => import("./components/student/StudentLeaderboard"));

const AppContent: React.FC = () => {
  const { user, profile, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <AuthForm />;

  // Get redirect path or use default
  const redirectPath = getAndClearRedirectPath();
  const defaultPath = profile?.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
  const homeRedirect = redirectPath || defaultPath;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={homeRedirect} replace />} />

      {/* Teacher routes */}
      <Route
        path="/teacher/*"
        element={
          <PrivateRoute requiredRole={UserRole.Teacher}>
            <Layout />
          </PrivateRoute>
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
        <Route path="grades" element={<GradeManagement />} />
        <Route path="content" element={<ManageContent />} />
        <Route path="content/create" element={<CreateContent />} />
        <Route path="content/:id/edit" element={<EditContent />} />
        <Route path="leaderboard" element={<TeacherLeaderboard />} />
      </Route>

      {/* Student routes */}
      <Route
        path="/student/*"
        element={
          <PrivateRoute requiredRole={UserRole.Student}>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="edit-profile" element={<EditProfile />} />
        <Route path="materials" element={<StudentMaterials />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="grades" element={<StudentLeaderboard />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={homeRedirect} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouteProvider>
          <Router>
            <Suspense fallback={<LoadingScreen />}>
              <AppContent />
            </Suspense>
          </Router>
        </RouteProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
