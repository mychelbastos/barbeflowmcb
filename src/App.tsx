import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isDashboardDomain, isPublicDomain, isPreviewOrLocal } from "@/lib/hostname";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import CommissionsPage from "./pages/CommissionsPage";
import PackagesPage from "./pages/PackagesPage";
import SubscriptionPlansPage from "./pages/SubscriptionPlansPage";
import SubscriptionCallback from "./pages/SubscriptionCallback";
import Bookings from "./pages/Bookings";
import Services from "./pages/Services";
import Staff from "./pages/Staff";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import Products from "./pages/Products";
import RecurringClients from "./pages/RecurringClients";
import BookingPublic from "./pages/BookingPublic";
import PaymentReturn from "./pages/PaymentReturn";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Onboarding from "./pages/Onboarding";
import AuthWatcher from "./components/AuthWatcher";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/layout/AppShell";
import { ScrollToTop } from "./components/ScrollToTop";

const queryClient = new QueryClient();

const showPublic = isPublicDomain() || isPreviewOrLocal();
const showDashboard = isDashboardDomain() || isPreviewOrLocal();

// On dashboard domain, routes have no /app prefix
// On preview/local, routes use /app prefix
const dashPrefix = isDashboardDomain() ? '' : '/app';

const ProtectedAppShell = () => (
  <ProtectedRoute>
    <DateRangeProvider>
      <AppShell />
    </DateRangeProvider>
  </ProtectedRoute>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthWatcher />
          <Routes>
            {/* Public routes - barberflow.store */}
            {showPublic && (
              <>
                <Route path="/" element={<Landing />} />
                <Route path="/termos" element={<Terms />} />
                <Route path="/privacidade" element={<Privacy />} />
                <Route path="/:slug" element={<BookingPublic />} />
                <Route path="/:slug/pagamento/retorno" element={<PaymentReturn />} />
                <Route path="/:slug/subscription/callback" element={<SubscriptionCallback />} />
              </>
            )}

            {/* Dashboard routes */}
            {showDashboard && (
              <>
                <Route path={`${dashPrefix}/login`} element={<Login />} />
                <Route path={`${dashPrefix}/register`} element={<Login />} />
                
                <Route path={`${dashPrefix}/onboarding`} element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                
                <Route path={dashPrefix || '/'} element={<ProtectedAppShell />}>
                  <Route path={dashPrefix ? 'dashboard' : 'dashboard'} element={<Dashboard />} />
                  <Route path="bookings" element={<Bookings />} />
                  <Route path="services" element={<Services />} />
                  <Route path="packages" element={<PackagesPage />} />
                  <Route path="subscription-plans" element={<SubscriptionPlansPage />} />
                  <Route path="staff" element={<Staff />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="recurring-clients" element={<RecurringClients />} />
                  <Route path="finance" element={<Finance />} />
                  <Route path="commissions" element={<CommissionsPage />} />
                  <Route path="products" element={<Products />} />
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
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
