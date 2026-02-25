import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isDashboardDomain, isPublicDomain, isPreviewOrLocal, isCustomDomain } from "@/lib/hostname";

// Public pages — loaded eagerly (these are what public visitors need)
import Landing from "./pages/Landing";
import BookingPublic from "./pages/BookingPublic";
import NotFound from "./pages/NotFound";

// Auth pages — small, lazy loaded
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Public sub-pages — lazy loaded (only after booking flow)
const PaymentReturn = lazy(() => import("./pages/PaymentReturn"));
const PackagePaymentReturn = lazy(() => import("./pages/PackagePaymentReturn"));
const SubscriptionCallback = lazy(() => import("./pages/SubscriptionCallback"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));

// Admin pages — ALL lazy loaded (never needed by public visitors)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));
const Finance = lazy(() => import("./pages/Finance"));
const CommissionsPage = lazy(() => import("./pages/CommissionsPage"));
const CashRegister = lazy(() => import("./pages/CashRegister"));
const PackagesPage = lazy(() => import("./pages/PackagesPage"));
const SubscriptionPlansPage = lazy(() => import("./pages/SubscriptionPlansPage"));
const SubscriptionMembers = lazy(() => import("./pages/SubscriptionMembers"));
const SubscriptionReceivables = lazy(() => import("./pages/SubscriptionReceivables"));
const SubscriptionCalendar = lazy(() => import("./pages/SubscriptionCalendar"));
const SubscriptionDelinquents = lazy(() => import("./pages/SubscriptionDelinquents"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Services = lazy(() => import("./pages/Services"));
const Staff = lazy(() => import("./pages/Staff"));
const Customers = lazy(() => import("./pages/Customers"));
const Settings = lazy(() => import("./pages/Settings"));
const Products = lazy(() => import("./pages/Products"));
const RecurringClients = lazy(() => import("./pages/RecurringClients"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

// Lazy-loaded components
const AuthWatcher = lazy(() => import("./components/AuthWatcher"));
import ProtectedRoute from "./components/ProtectedRoute";
const AppShell = lazy(() => import("./components/layout/AppShell"));

import { ScrollToTop } from "./components/ScrollToTop";
import { CookieBanner } from "./components/CookieBanner";
import { useEffect } from "react";
import { checkConsentOnLoad } from "@/utils/consent";
import { persistFbclid } from "@/utils/metaTracking";

const queryClient = new QueryClient();

const showPublic = isPublicDomain() || isPreviewOrLocal() || isCustomDomain();
const showDashboard = isDashboardDomain() || isPreviewOrLocal();

// On dashboard domain, routes have no /app prefix
// On preview/local, routes use /app prefix
const dashPrefix = isDashboardDomain() ? '' : '/app';

// Minimal loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
  </div>
);

const ProtectedAppShell = () => (
  <ProtectedRoute>
    <ThemeProvider>
      <DateRangeProvider>
        <Suspense fallback={<PageLoader />}>
          <AppShell />
        </Suspense>
      </DateRangeProvider>
    </ThemeProvider>
  </ProtectedRoute>
);

const App = () => {
  useEffect(() => {
    checkConsentOnLoad();
    persistFbclid();
  }, []);

  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={null}>
            <AuthWatcher />
          </Suspense>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes - modogestor.com.br */}
              {showPublic && (
                <>
                  {/* On custom domains, root shows the booking page directly */}
                  <Route path="/" element={isCustomDomain() ? <BookingPublic /> : <Landing />} />
                  <Route path="/termos" element={<Terms />} />
                  <Route path="/privacidade" element={<Privacy />} />
                  <Route path="/:slug" element={<BookingPublic />} />
                  <Route path="/:slug/pagamento/retorno" element={<PaymentReturn />} />
                  <Route path="/:slug/pacote/retorno" element={<PackagePaymentReturn />} />
                  <Route path="/:slug/subscription/callback" element={<SubscriptionCallback />} />
                </>
              )}

              {/* Dashboard routes */}
              {showDashboard && (
                <>
                  <Route path={`${dashPrefix}/login`} element={<Login />} />
                  <Route path={`${dashPrefix}/register`} element={<Login />} />
                  <Route path={`${dashPrefix}/forgot-password`} element={<ForgotPassword />} />
                  <Route path={`${dashPrefix}/reset-password`} element={<ResetPassword />} />
                  
                  <Route path={`${dashPrefix}/onboarding`} element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  
                  <Route path={dashPrefix || '/'} element={<ProtectedAppShell />}>
                    <Route path={dashPrefix ? 'dashboard' : 'dashboard'} element={<Dashboard />} />
                    <Route path="bookings" element={<Bookings />} />
                    <Route path="services" element={<Services />} />
                    <Route path="packages" element={<PackagesPage />} />
                    <Route path="subscription-plans" element={<Navigate to={`${dashPrefix}/subscriptions/plans`} replace />} />
                    <Route path="subscriptions/plans" element={<SubscriptionPlansPage />} />
                    <Route path="subscriptions/members" element={<SubscriptionMembers />} />
                    <Route path="subscriptions/receivables" element={<SubscriptionReceivables />} />
                    <Route path="subscriptions/calendar" element={<SubscriptionCalendar />} />
                    <Route path="subscriptions/delinquents" element={<SubscriptionDelinquents />} />
                    <Route path="staff" element={<Staff />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="recurring-clients" element={<RecurringClients />} />
                    <Route path="finance" element={<Finance />} />
                    <Route path="commissions" element={<CommissionsPage />} />
                    <Route path="caixa" element={<CashRegister />} />
                    <Route path="products" element={<Products />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                </>
              )}

              {/* On dashboard domain, redirect root to login (handled by AuthWatcher if logged in) */}
              {isDashboardDomain() && (
                <Route path="/" element={<Login />} />
              )}
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CookieBanner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
