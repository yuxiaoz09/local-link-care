import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useBusinessSetup } from "./hooks/useBusinessSetup";
import { CSRFProvider } from "./components/security/CSRFProtection";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import Auth from "./pages/Auth";
import SecurityDashboard from "./pages/SecurityDashboard";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Appointments from "./pages/Appointments";
import Tasks from "./pages/Tasks";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import Locations from "./pages/Locations";
import Employees from "./pages/Employees";
import Products from "./pages/Products";
import Widgets from "./pages/Widgets";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { hasBusiness, businessData, needsOnboarding, loading: businessLoading, createPlaceholderBusiness } = useBusinessSetup();
  
  if (loading || businessLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Auto-create placeholder business if none exists
  if (hasBusiness === false) {
    createPlaceholderBusiness();
    return <div className="min-h-screen flex items-center justify-center">Setting up your business...</div>;
  }

  // Show onboarding wizard if business needs onboarding
  if (needsOnboarding && businessData) {
    return (
      <OnboardingWizard 
        businessId={businessData.id}
        onComplete={() => window.location.reload()}
      />
    );
  }
  
  return <Layout>{children}</Layout>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CSRFProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            } />
            <Route path="/customers/:id" element={
              <ProtectedRoute>
                <CustomerDetail />
              </ProtectedRoute>
            } />
            <Route path="/appointments" element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            } />
            <Route path="/tasks" element={
              <ProtectedRoute>
                <Tasks />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/locations" element={
              <ProtectedRoute>
                <Locations />
              </ProtectedRoute>
            } />
            <Route path="/employees" element={
              <ProtectedRoute>
                <Employees />
              </ProtectedRoute>
            } />
            <Route path="/products" element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            } />
            <Route path="/widgets" element={
              <ProtectedRoute>
                <Widgets />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/security" element={
              <ProtectedRoute>
                <SecurityDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </CSRFProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
