// 4culori CRM/ERP - v2.3 (Added Realtime Notifications)
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { DepartmentsProvider } from "@/hooks/useDepartments";
import { RealtimeNotificationProvider } from "@/providers/RealtimeNotificationProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Direct imports
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import Products from "./pages/Products";
import PriceCalculator from "./pages/PriceCalculator";
import ProductionCalendar from "./pages/ProductionCalendar";
import TasksCalendar from "./pages/TasksCalendar";
import Settings from "./pages/Settings";
import Clients from "./pages/Clients";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const HealthPage = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
    <p>App router is working</p>
  </div>
);

const App = () => {
  console.log('[APP RENDER] App rendered');
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <DepartmentsProvider>
                <RealtimeNotificationProvider>
                  <Routes>
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/health" element={<HealthPage />} />
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/production-calendar" element={<ProtectedRoute><ProductionCalendar /></ProtectedRoute>} />
                    <Route path="/tasks-calendar" element={<ProtectedRoute><TasksCalendar /></ProtectedRoute>} />
                    <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                    <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                    <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
                    <Route path="/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
                    <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                    <Route path="/price-calculator" element={<ProtectedRoute><PriceCalculator /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </RealtimeNotificationProvider>
              </DepartmentsProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
