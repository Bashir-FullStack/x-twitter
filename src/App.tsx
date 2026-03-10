import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/dashboard/ProfilePage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import ContentPage from "./pages/dashboard/ContentPage";
import MessagesPage from "./pages/dashboard/MessagesPage";
import GroupsPage from "./pages/dashboard/GroupsPage";
import SearchPage from "./pages/dashboard/SearchPage";
import NotificationsPage from "./pages/dashboard/NotificationsPage";
import SecurityPage from "./pages/dashboard/SecurityPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import AdminPage from "./pages/dashboard/AdminPage";
import BookmarksPage from "./pages/dashboard/BookmarksPage";
import UserProfilePage from "./pages/dashboard/UserProfilePage";
import PostDetailPage from "./pages/dashboard/PostDetailPage";
import HelpPage from "./pages/dashboard/HelpPage";
import TermsPage from "./pages/dashboard/TermsPage";
import PrivacyPage from "./pages/dashboard/PrivacyPage";
import VerificationPage from "./pages/dashboard/VerificationPage";
import ReferralPage from "./pages/dashboard/ReferralPage";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="content" element={<ContentPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="groups" element={<GroupsPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="security" element={<SecurityPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="bookmarks" element={<BookmarksPage />} />
                <Route path="user/:userId" element={<UserProfilePage />} />
                <Route path="post/:postId" element={<PostDetailPage />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="terms" element={<TermsPage />} />
                <Route path="privacy" element={<PrivacyPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
