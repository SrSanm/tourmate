import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();

  // 1. Sincronizando estado inicial de Firebase Auth
  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-spinner" />
      </div>
    );
  }

  // 2. Usuario no autenticado de forma activa
  if (!user) return <Navigate to="/login" replace />;

  // 3. Esperando datos adicionales desde Firestore
  if (roles && !profile) {
    return (
      <div className="app-loading">
        <div className="app-spinner" />
      </div>
    );
  }

  // 4. Protección extra: Guías sin aprobación previa de administración
  const isApproved = profile?.status === "approved" || profile?.status === "active";
  if (profile?.role === "guide" && !isApproved) {
    return <Navigate to="/waiting-approval" replace />;
  }

  // 5. Validación estricta de rol requerido
  if (roles && !roles.includes(profile?.role)) {
    console.warn("Acceso denegado: Rol insuficiente");
    return <Navigate to="/" replace />;
  }

  return children;
}