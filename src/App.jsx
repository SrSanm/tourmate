import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// --- LAYOUTS Y COMPONENTES ---
import MainLayout from "./components/MainLayout";
import ModalNotificacion from "./components/ModalNotificacion";

// --- PÁGINAS PÚBLICAS ---
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ContactPage from "./pages/ContactPage";
import PackagesPage from "./pages/PackagesPage";
import TourDetailPage from "./pages/TourDetailPage"; 
import WaitingApproval from "./pages/WaitingApproval"; // Nueva: Para guías pendientes

// --- DASHBOARDS ---
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
 * RequireAuth: Protege rutas y maneja la lógica de aprobación de guías
 */
function RequireAuth({ roles }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !profile) return <LoadingScreen />;

  // Lógica crítica: Si es guía pero no está aprobado, se manda a la sala de espera
  if (profile?.role === "guide" && profile?.status !== "approved" && !roles.includes("admin")) {
    return <Navigate to="/waiting-approval" replace />;
  }

  if (roles && !roles.includes(profile?.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />; // Permite renderizar las rutas hijas
}

function DashboardRedirect() {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/" replace />;
  
  const routes = { admin: "/admin", guide: "/guide", tourist: "/tourist" };
  // Si el guía no está aprobado, redirigir a espera incluso si intenta entrar al login
  if (profile.role === "guide" && profile.status !== "approved") return <Navigate to="/waiting-approval" replace />;
  
  return <Navigate to={routes[profile.role] || "/"} replace />;
}

function LoadingScreen() {
  return (
    <div className="v4-app-loading">
      <div className="v4-spinner" />
      <p>Cargando TourMate Medellín...</p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* SECCIÓN PÚBLICA */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/tour/:id" element={<TourDetailPage />} />
        <Route path="/waiting-approval" element={<WaitingApproval />} />
        
        <Route 
          path="/login" 
          element={user ? <DashboardRedirect /> : <LoginPage />} 
        />
        <Route 
          path="/register" 
          element={user ? <DashboardRedirect /> : <RegisterPage />} 
        />
      </Route>

      {/* DASHBOARD ADMIN (Rutas Protegidas) */}
      <Route element={<RequireAuth roles={["admin"]} />}>
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<Navigate to="guides" replace />} />
          <Route path="guides" element={<ApproveGuides />} />
          <Route path="tours" element={<ApproveTours />} />
          <Route path="analytics" element={<SiteAnalytics />} />
        </Route>
      </Route>
      
      {/* DASHBOARD GUÍA (Rutas Protegidas) */}
      <Route element={<RequireAuth roles={["guide"]} />}>
        <Route path="/guide" element={<GuideDashboard />}>
          <Route index element={<Navigate to="my-tours" replace />} />
          <Route path="my-tours" element={<MyTours />} />
          <Route path="create-tour" element={<CreateTour />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="profile" element={<GuideProfile />} />
        </Route>
      </Route>
      
      {/* DASHBOARD TURISTA (Rutas Protegidas) */}
      <Route element={<RequireAuth roles={["tourist"]} />}>
        <Route path="/tourist" element={<TouristDashboard />}>
          <Route index element={<Navigate to="explore" replace />} />
          <Route path="explore" element={<ExploreTours />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="profile" element={<TouristProfile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="v4-app-main-wrapper">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Estilos dinámicos para una experiencia fluida
const style = document.createElement('style');
style.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
  :root { --tm-orange: #ff5a3c; --tm-gray: #f1f5f9; }
  body { margin: 0; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  .v4-app-loading { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; }
  .v4-spinner { width: 50px; height: 50px; border: 5px solid var(--tm-gray); border-top: 5px solid var(--tm-orange); border-radius: 50%; animation: v4-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
  @keyframes v4-spin { to { transform: rotate(360deg); } }
  .v4-app-main-wrapper { min-height: 100vh; overflow-x: hidden; }
`;
document.head.appendChild(style);