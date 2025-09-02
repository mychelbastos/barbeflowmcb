import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import Agenda from "./pages/Agenda";
import Bookings from "./pages/Bookings";
import Services from "./pages/Services";
import Staff from "./pages/Staff";
import Customers from "./pages/Customers";
import Settings from "./pages/Settings";
import BookingPublic from "./pages/BookingPublic";
import NotFound from "./pages/NotFound";
import AuthWatcher from "./components/AuthWatcher";
import ProtectedRoute from "./components/ProtectedRoute";
import AppShell from "./components/layout/AppShell";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthWatcher />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app/login" element={<Login />} />
          <Route path="/app/register" element={<Login />} />
          
          {/* Protected App Routes */}
          <Route path="/app" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="services" element={<Services />} />
            <Route path="staff" element={<Staff />} />
            <Route path="customers" element={<Customers />} />
            <Route path="finance" element={<Finance />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          <Route path="/:slug" element={<BookingPublic />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
