/**
 * Lumist Analytics Demo - App Router
 *
 * Demo version with all authentication removed.
 * All routes are directly accessible.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth';

// Layout
import Layout from './components/Layout';

// Main Pages
import UserEngagement from './components/UserEngagement';
import FeatureAdoption from './components/FeatureAdoption';


// Demo placeholder for Admin
import AdminDemo from './components/AdminDemo';

// Revenue imports
import {
    RevenueLayout,
    RevenueOverview,
    RevenueTransactions,
    RevenueAnalytics,
    RevenueSubscriptions
} from './components/Revenue';

// Acquisition imports
import {
    AcquisitionLayout,
    AcquisitionOverview,
    AcquisitionCohorts
} from './components/Acquisition';

// Social Media imports
import SocialMediaLayout from './components/SocialMedia/SocialMediaLayout';
import FacebookLayout from './components/SocialMedia/Facebook/FacebookLayout';
import FacebookOverview from './components/SocialMedia/Facebook/FacebookOverview';
import FacebookAudience from './components/SocialMedia/Facebook/FacebookAudience';
import FacebookContent from './components/SocialMedia/Facebook/FacebookContent';
import FacebookEngagement from './components/SocialMedia/Facebook/FacebookEngagement';
import FacebookTrends from './components/SocialMedia/Facebook/FacebookTrends';
import ThreadsLayout from './components/SocialMedia/Threads/ThreadsLayout';
import ThreadsOverview from './components/SocialMedia/Threads/ThreadsOverview';
import ThreadsAudience from './components/SocialMedia/Threads/ThreadsAudience';
import ThreadsContent from './components/SocialMedia/Threads/ThreadsContent';
import ThreadsEngagement from './components/SocialMedia/Threads/ThreadsEngagement';
import ThreadsTrends from './components/SocialMedia/Threads/ThreadsTrends';
import {
    DiscordLayout,
    DiscordOverview,
    DiscordEngagement,
    DiscordAudience,
    DiscordFunnel
} from './components/SocialMedia/Discord';
import {
    InstagramLayout,
    InstagramOverview,
    InstagramAudience,
    InstagramContent,
    InstagramEngagement
} from './components/SocialMedia/Instagram';
import {
    TikTokLayout,
    TikTokOverview,
    TikTokAudience,
    TikTokContent,
    TikTokEngagement
} from './components/SocialMedia/TikTok';

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* ========== DEMO DASHBOARD (No Auth Required) ========== */}
                    <Route path="/" element={<Layout />}>
                        {/* Home - User Engagement */}
                        <Route index element={<UserEngagement />} />

                        {/* Feature Adoption */}
                        <Route path="features" element={<FeatureAdoption />} />

                        {/* ========== ACQUISITION ROUTES ========== */}
                        <Route path="acquisition" element={<AcquisitionLayout />}>
                            <Route index element={<AcquisitionOverview />} />
                            <Route path="cohorts" element={<AcquisitionCohorts />} />
                        </Route>

                        {/* Admin Panel - Demo Placeholder */}
                        <Route path="admin" element={<AdminDemo />} />

                        {/* ========== REVENUE ROUTES ========== */}
                        <Route path="revenue" element={<RevenueLayout />}>
                            <Route index element={<RevenueOverview />} />
                            <Route path="transactions" element={<RevenueTransactions />} />
                            <Route path="analytics" element={<RevenueAnalytics />} />
                            <Route path="subscriptions" element={<RevenueSubscriptions />} />
                        </Route>

                        {/* ========== SOCIAL MEDIA ROUTES ========== */}
                        <Route path="social-media" element={<SocialMediaLayout />}>
                            {/* Facebook Routes */}
                            <Route path="facebook" element={<FacebookLayout />}>
                                <Route index element={<FacebookOverview />} />
                                <Route path="overview" element={<FacebookOverview />} />
                                <Route path="audience" element={<FacebookAudience />} />
                                <Route path="content" element={<FacebookContent />} />
                                <Route path="engagement" element={<FacebookEngagement />} />
                                <Route path="trends" element={<FacebookTrends />} />
                            </Route>

                            {/* Threads Routes */}
                            <Route path="threads" element={<ThreadsLayout />}>
                                <Route index element={<ThreadsOverview />} />
                                <Route path="overview" element={<ThreadsOverview />} />
                                <Route path="audience" element={<ThreadsAudience />} />
                                <Route path="content" element={<ThreadsContent />} />
                                <Route path="engagement" element={<ThreadsEngagement />} />
                                <Route path="trends" element={<ThreadsTrends />} />
                            </Route>

                            {/* Discord Routes */}
                            <Route path="discord" element={<DiscordLayout />}>
                                <Route index element={<DiscordOverview />} />
                                <Route path="overview" element={<DiscordOverview />} />
                                <Route path="engagement" element={<DiscordEngagement />} />
                                <Route path="audience" element={<DiscordAudience />} />
                                <Route path="funnel" element={<DiscordFunnel />} />
                            </Route>

                            {/* Instagram Routes */}
                            <Route path="instagram" element={<InstagramLayout />}>
                                <Route index element={<InstagramOverview />} />
                                <Route path="overview" element={<InstagramOverview />} />
                                <Route path="audience" element={<InstagramAudience />} />
                                <Route path="content" element={<InstagramContent />} />
                                <Route path="engagement" element={<InstagramEngagement />} />
                            </Route>

                            {/* TikTok Routes */}
                            <Route path="tiktok" element={<TikTokLayout />}>
                                <Route index element={<TikTokOverview />} />
                                <Route path="overview" element={<TikTokOverview />} />
                                <Route path="audience" element={<TikTokAudience />} />
                                <Route path="content" element={<TikTokContent />} />
                                <Route path="engagement" element={<TikTokEngagement />} />
                            </Route>
                        </Route>
                    </Route>

                    {/* ========== CATCH ALL - Redirect to Dashboard ========== */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
