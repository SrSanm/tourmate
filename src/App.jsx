import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

// --- CONTEXTOS (Importancia Vital) ---
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TourProvider } from "./context/TourContext";
import { UIProvider } from "./context/UIContext";

// --- COMPONENTES DE ESTRUCTURA ---
import MainLayout from "./components/MainLayout";

// --- PÁGINAS PÚBLICAS ---
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ContactPage from "./pages/ContactPage";
import PackagesPage from "./pages/PackagesPage";
import TourDetailPage from "./pages/TourDetailPage"; 
import WaitingApproval from "./pages/WaitingApproval";

// --- DASHBOARDS (ADMIN, GUIDE, TOURIST) ---
import AdminDashboard from "./components/AdminDashboard/AdminDashboard";
import ApproveGuides from "./components/AdminDashboard/ApproveGuides";
import ApproveTours from "./components/AdminDashboard/ApproveTours";
import SiteAnalytics from "./components/AdminDashboard/SiteAnalytics";
import GuideDashboard from "./components/GuideDashboard/GuideDashboard";
import MyTours from "./components/GuideDashboard/MyTours";
import CreateTour from "./components/GuideDashboard/CreateTour";
import Bookings from "./components/GuideDashboard/Bookings";
import GuideProfile from "./components/GuideDashboard/GuideProfile";
import TouristDashboard from "./components/TouristDashboard/TouristDashboard";
import ExploreTours from "./components/TouristDashboard/ExploreTours";
import MyBookings from "./components/TouristDashboard/MyBookings";
import TouristProfile from './components/TouristDashboard/TouristProfile';

/**
 * RequireAuth: El guardián de las rutas.
 * Verifica autenticación, roles y estado de aprobación de guías.
 */
function RequireAuth({ roles }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  // Si el perfil aún no carga pero el usuario sí, esperamos un momento
  if (roles && !profile) return <LoadingScreen />;

  // Regla de Oro: Guías no aprobados solo ven la sala de espera
  const isUnapprovedGuide = profile?.role === "guide" && profile?.status !== "approved";
  if (isUnapprovedGuide && !roles.includes("admin")) {
    return <Navigate to="/waiting-approval" replace />;
  }

  // Protección por Rol
  if (roles && !roles.includes(profile?.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/**
 * DashboardRedirect: Decide a dónde enviar al usuario según su rol al loguearse.
 */
function DashboardRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/" replace />;
  
  if (profile.role === "guide" && profile.status !== "approved") {
    return <Navigate to="/waiting-approval" replace />;
  }
  
  const dashboardRoutes = { admin: "/admin", guide: "/guide", tourist: "/tourist" };
  return <Navigate to={dashboardRoutes[profile.role] || "/"} replace />;
}

function LoadingScreen() {
  return (
    <div className="tm-loading-container">
      <div className="tm-spinner" />
      <p>Cargando experiencias en Medellín...</p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* RUTAS PÚBLICAS CON LAYOUT COMÚN */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/tour/:id" element={<TourDetailPage />} />
        <Route path="/waiting-approval" element={<WaitingApproval />} />
        <Route path="/login" element={user ? <DashboardRedirect /> : <LoginPage />} />
        <Route path="/register" element={user ? <DashboardRedirect /> : <RegisterPage />} />
      </Route>

      {/* RUTAS PRIVADAS: ADMINISTRADOR */}
      <Route element={<RequireAuth roles={["admin"]} />}>
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<Navigate to="analytics" replace />} />
          <Route path="guides" element={<ApproveGuides />} />
          <Route path="tours" element={<ApproveTours />} />
          <Route path="analytics" element={<SiteAnalytics />} />
        </Route>
      </Route>
      
      {/* RUTAS PRIVADAS: GUÍA */}
      <Route element={<RequireAuth roles={["guide"]} />}>
        <Route path="/guide" element={<GuideDashboard />}>
          <Route index element={<Navigate to="my-tours" replace />} />
          <Route path="my-tours" element={<MyTours />} />
          <Route path="create-tour" element={<CreateTour />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="profile" element={<GuideProfile />} />
        </Route>
      </Route>
      
      {/* RUTAS PRIVADAS: TURISTA */}
      <Route element={<RequireAuth roles={["tourist"]} />}>
        <Route path="/tourist" element={<TouristDashboard />}>
          <Route index element={<Navigate to="explore" replace />} />
          <Route path="explore" element={<ExploreTours />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="profile" element={<TouristProfile />} />
        </Route>
      </Route>

      {/* 404: REDIRIGIR AL HOME */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TourProvider>
        <UIProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div className="tourmate-app-root">
              <AppRoutes />
            </div>
          </BrowserRouter>
        </UIProvider>
      </TourProvider>
    </AuthProvider>
  );
}

// ESTILOS GLOBALES DE ALTO IMPACTO
const style = document.createElement('style');
style.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
  :root { --tm-primary: #ff5a3c; --tm-dark: #0f172a; --tm-light: #f8fafc; }
  body { margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; background: var(--tm-light); color: var(--tm-dark); }
  .tm-loading-container { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
  .tm-spinner { width: 45px; height: 45px; border: 4px solid #e2e8f0; border-top: 4px solid var(--tm-primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .tourmate-app-root { min-height: 100vh; position: relative; }
`;
document.head.appendChild(style);