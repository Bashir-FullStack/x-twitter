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
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import GamificationPage from "./pages/dashboard/GamificationPage";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
// Existing pages
import LikedPostsPage from "./pages/dashboard/LikedPostsPage";
import DraftsPage from "./pages/dashboard/DraftsPage";
import FollowersPage from "./pages/dashboard/FollowersPage";
import MediaPage from "./pages/dashboard/MediaPage";
import ListsPage from "./pages/dashboard/ListsPage";
import MutedBlockedPage from "./pages/dashboard/MutedBlockedPage";
import ActivityLogPage from "./pages/dashboard/ActivityLogPage";
import DisplayPage from "./pages/dashboard/DisplayPage";
import AccountInfoPage from "./pages/dashboard/AccountInfoPage";
import DataExportPage from "./pages/dashboard/DataExportPage";
import DeactivatePage from "./pages/dashboard/DeactivatePage";
import NotificationSettingsPage from "./pages/dashboard/NotificationSettingsPage";
import AboutPage from "./pages/dashboard/AboutPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import PollsPage from "./pages/dashboard/PollsPage";
import HashtagsPage from "./pages/dashboard/HashtagsPage";
import ScheduledPostsPage from "./pages/dashboard/ScheduledPostsPage";
import AccessibilityPage from "./pages/dashboard/AccessibilityPage";
import ConnectedAppsPage from "./pages/dashboard/ConnectedAppsPage";

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
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
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
                <Route path="verification" element={<VerificationPage />} />
                <Route path="referrals" element={<ReferralPage />} />
                <Route path="achievements" element={<GamificationPage />} />
                {/* Existing pages */}
                <Route path="liked" element={<LikedPostsPage />} />
                <Route path="drafts" element={<DraftsPage />} />
                <Route path="followers" element={<FollowersPage />} />
                <Route path="media" element={<MediaPage />} />
                <Route path="lists" element={<ListsPage />} />
                <Route path="muted-blocked" element={<MutedBlockedPage />} />
                <Route path="activity" element={<ActivityLogPage />} />
                <Route path="display" element={<DisplayPage />} />
                <Route path="account-info" element={<AccountInfoPage />} />
                <Route path="data-export" element={<DataExportPage />} />
                <Route path="deactivate" element={<DeactivatePage />} />
                <Route path="notification-settings" element={<NotificationSettingsPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="polls" element={<PollsPage />} />
                <Route path="hashtags" element={<HashtagsPage />} />
                <Route path="scheduled" element={<ScheduledPostsPage />} />
                <Route path="accessibility" element={<AccessibilityPage />} />
                <Route path="connected-apps" element={<ConnectedAppsPage />} />
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
