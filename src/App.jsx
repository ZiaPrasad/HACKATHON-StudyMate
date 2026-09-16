import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Landing from '@/pages/Landing';
import Onboarding from '@/pages/Onboarding';
import Dashboard from '@/pages/Dashboard';
import Subjects from '@/pages/Subjects';
import Timetable from '@/pages/Timetable';
import Assignments from '@/pages/Assignments';
import Exams from '@/pages/Exams';
import Attendance from '@/pages/Attendance';
import Notes from '@/pages/Notes';
import StudyTasks from '@/pages/StudyTasks';
import Reminders from '@/pages/Reminders';
import NotificationsPage from '@/pages/NotificationsPage';
import AssistantPage from '@/pages/AssistantPage';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Logo from '@/components/Logo';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4">
        <Logo height={48} />
        <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/study-tasks" element={<StudyTasks />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App