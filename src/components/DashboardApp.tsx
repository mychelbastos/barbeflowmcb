"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { checkConsentOnLoad } from "@/utils/consent";
import { persistFbclid } from "@/utils/metaTracking";
import { CookieBanner } from "@/components/CookieBanner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DateRangeProvider } from "@/contexts/DateRangeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Login from "@/views/Login";
import ForgotPassword from "@/views/ForgotPassword";
import ResetPassword from "@/views/ResetPassword";
import Dashboard from "@/views/Dashboard";
import Finance from "@/views/Finance";
import CommissionsPage from "@/views/CommissionsPage";
import CashRegister from "@/views/CashRegister";
import PackagesPage from "@/views/PackagesPage";
import SubscriptionPlansPage from "@/views/SubscriptionPlansPage";
import Bookings from "@/views/Bookings";
import Services from "@/views/Services";
import Staff from "@/views/Staff";
import Customers from "@/views/Customers";
import Settings from "@/views/Settings";
import Products from "@/views/Products";
import RecurringClients from "@/views/RecurringClients";
import NotFound from "@/views/NotFound";
import Onboarding from "@/views/Onboarding";
import AuthWatcher from "@/components/AuthWatcher";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import { ScrollToTop } from "@/components/ScrollToTop";

const queryClient = new QueryClient();

const ProtectedAppShell = () => (
  <ProtectedRoute>
    <ThemeProvider>
      <DateRangeProvider>
        <AppShell />
      </DateRangeProvider>
    </ThemeProvider>
  </ProtectedRoute>
);

export default function DashboardApp() {
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
            <AuthWatcher />
            <Routes>
              <Route path="/app/login" element={<Login />} />
              <Route path="/app/register" element={<Login />} />
              <Route path="/app/forgot-password" element={<ForgotPassword />} />
              <Route path="/app/reset-password" element={<ResetPassword />} />
              <Route
                path="/app/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route path="/app" element={<ProtectedAppShell />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="services" element={<Services />} />
                <Route path="packages" element={<PackagesPage />} />
                <Route
                  path="subscription-plans"
                  element={<SubscriptionPlansPage />}
                />
                <Route path="staff" element={<Staff />} />
                <Route path="customers" element={<Customers />} />
                <Route path="recurring-clients" element={<RecurringClients />} />
                <Route path="finance" element={<Finance />} />
                <Route path="commissions" element={<CommissionsPage />} />
                <Route path="caixa" element={<CashRegister />} />
                <Route path="products" element={<Products />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* On dashboard domain, root goes to login */}
              <Route path="/" element={<Login />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <CookieBanner />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
