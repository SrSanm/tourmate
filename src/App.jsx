import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";

// ─── CONTEXTOS ────────────────────────────────────────────────
import { AuthProvider, useAuth } from "./context/AuthContext";
import { TourProvider } from "./context/TourContext";
import { UIProvider } from "./context/UIContext";

// ─── LAYOUT PÚBLICO ───────────────────────────────────────────
import MainLayout from "./components/MainLayout";

// ─── PÁGINAS PÚBLICAS ─────────────────────────────────────────
import HomePage        from "./pages/HomePage";
import LoginPage       from "./pages/LoginPage";
import RegisterPage    from "./pages/RegisterPage";
import PackagesPage    from "./pages/PackagesPage";
import TourDetailPage  from "./pages/TourDetailPage";
import WaitingApproval from "./pages/WaitingApproval";
import ContactPage     from "./pages/ContactPage";
import CheckoutPage    from "./pages/CheckoutPage";

// ─── DASHBOARDS ADMIN ─────────────────────────────────────────
import AdminDashboard  from "./components/AdminDashboard/AdminDashboard";
import ApproveGuides   from "./components/AdminDashboard/ApproveGuides";
import ApproveTours    from "./components/AdminDashboard/ApproveTours";
import SiteAnalytics   from "./components/AdminDashboard/SiteAnalytics";

// ─── DASHBOARDS GUÍA ──────────────────────────────────────────
import GuideDashboard  from "./components/GuideDashboard/GuideDashboard";
import MyTours         from "./components/GuideDashboard/MyTours";
import CreateTour      from "./components/GuideDashboard/CreateTour";
import Bookings        from "./components/GuideDashboard/Bookings";
import Commissions     from "./components/GuideDashboard/Commissions";
import GuideProfile    from "./components/GuideDashboard/GuideProfile";

// ─── DASHBOARDS TURISTA ───────────────────────────────────────
import TouristDashboard from "./components/TouristDashboard/TouristDashboard";
import ExploreTours     from "./components/TouristDashboard/ExploreTours";
import MyBookings       from "./components/TouristDashboard/MyBookings";
import TouristProfile   from "./components/TouristDashboard/TouristProfile";

// ─── CONTROL DE DESPLAZAMIENTO GLOBAL ─────────────────────────
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// ─── LOADING SCREEN ───────────────────────────────────────────
const LoadingScreen = () => (
  <div className="tm-loading-container">
    <div className="tm-spinner" />
    <p>Cargando TourMate Medellín...</p>
  </div>
);

/**
 * RequireAuth — Protege rutas por rol.
 */
function RequireAuth({ roles }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile || Object.keys(profile).length === 0) return <LoadingScreen />;

  if (profile.role === "guide" && profile.status !== "approved") {
    return <Navigate to="/waiting-approval" replace />;
  }

  if (roles && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

/**
 * DashboardRedirect — Lleva al usuario al panel correcto según su rol.
 */
function DashboardRedirect() {
  const { profile, loading } = useAuth();
  
  if (loading || !profile) return <LoadingScreen />;

  switch (profile.role) {
    case "admin":   
      return <Navigate to="/admin/analytics" replace />;
    case "guide":
      return profile.status === "approved"
        ? <Navigate to="/guide/my-tours" replace />
        : <Navigate to="/waiting-approval" replace />;
    case "tourist": 
      return <Navigate to="/tourist/explore" replace />;
    default:        
      return <Navigate to="/" replace />;
  }
}

/**
 * AppRoutes — Árbol de rutas completo conectado a los dashboards reales.
 */
function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* ═══════════════ RUTAS PÚBLICAS ═══════════════ */}
      <Route element={<MainLayout />}>
        <Route path="/"         element={<HomePage />} />
        <Route path="/packages" element={<PackagesPage />} />
        <Route path="/contact"  element={<ContactPage />} />
        <Route path="/tour/:id" element={<TourDetailPage />} />
        <Route path="/checkout/:bookingId" element={<CheckoutPage />} />
        <Route path="/waiting-approval" element={<WaitingApproval />} />

        <Route path="/login"    element={user ? <DashboardRedirect /> : <LoginPage />} />
        <Route path="/register" element={user ? <DashboardRedirect /> : <RegisterPage />} />
      </Route>

      {/* Atajo directo */}
      <Route path="/dashboard" element={
        user ? <DashboardRedirect /> : <Navigate to="/login" replace />
      } />

      {/* ═══════════════ PRIVADAS: ADMIN ═══════════════ */}
      <Route element={<RequireAuth roles={["admin"]} />}>
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<Navigate to="analytics" replace />} />
          <Route path="analytics" element={<SiteAnalytics />} />
          <Route path="guides"    element={<ApproveGuides />} />
          <Route path="tours"     element={<ApproveTours />} />
          <Route path="settings"  element={
            <div style={{ padding: 40, color: "#64748b" }}>
              <h2>Configuración</h2><p>Próximamente disponible.</p>
            </div>
          } />
        </Route>
      </Route>

      {/* ═══════════════ PRIVADAS: GUÍA ═══════════════ */}
      <Route element={<RequireAuth roles={["guide"]} />}>
        <Route path="/guide" element={<GuideDashboard />}>
          <Route index element={<Navigate to="my-tours" replace />} />
          <Route path="my-tours"    element={<MyTours />} />
          <Route path="create-tour" element={<CreateTour />} />
          <Route path="bookings"    element={<Bookings />} />
          <Route path="stats"       element={<Commissions />} />
          <Route path="profile"     element={<GuideProfile />} />
        </Route>
      </Route>

      {/* ═══════════════ PRIVADAS: TURISTA ═══════════════ */}
      <Route element={<RequireAuth roles={["tourist"]} />}>
        <Route path="/tourist" element={<TouristDashboard />}>
          <Route index element={<Navigate to="explore" replace />} />
          <Route path="explore"     element={<ExploreTours />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="profile"     element={<TouristProfile />} />
        </Route>
      </Route>

      {/* Fallback de seguridad global */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TourProvider>
        <UIProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AppRoutes />
          </BrowserRouter>
        </UIProvider>
      </TourProvider>

      <style>{`
        :root {
          --tm-primary: #ff5a3c;
          --tm-dark: #0f172a;
          --tm-light: #f8fafc;
        }
        *, *::before, *::after { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
          background: var(--tm-light);
        }
        .tm-loading-container {
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 15px;
          color: #64748b;
          font-weight: 600;
        }
        .tm-spinner {
          width: 48px;
          height: 48px;
          border: 5px solid #e2e8f0;
          border-top: 5px solid var(--tm-primary);
          border-radius: 50%;
          animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </AuthProvider>
  );
}