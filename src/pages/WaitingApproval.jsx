import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  LogOut, 
  Clock, 
  CheckCircle, 
  ShieldCheck, 
  Mail, 
  MapPin, 
  RefreshCcw 
} from "lucide-react"; // Asumiendo que usas lucide-react, si no, usa emojis o SVGs

/**
 * WaitingApproval - Componente de transicion para guías de TourMate.
 * Detecta en tiempo real cambios en el perfil de Firestore.
 */
export default function WaitingApproval() {
  const { profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // EFECTO: Redirección automática cuando el admin aprueba
  useEffect(() => {
    if (profile?.role === "guide" && profile?.status === "approved") {
      // Pequeño delay para que el usuario vea la transición exitosa
      const timer = setTimeout(() => {
        navigate("/guide");
      }, 2000);
      return () => clearTimeout(timer);
    }
    
    // Si por alguna razón el rol cambia a turista o admin, redirigir
    if (profile?.role === "tourist") navigate("/tourist");
    if (profile?.role === "admin") navigate("/admin");
  }, [profile, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // UI de éxito si acaba de ser aprobado
  if (profile?.status === "approved") {
    return (
      <div className="tm-waiting-screen approved">
        <div className="tm-waiting-card">
          <div className="success-anim">
            <CheckCircle size={80} color="#10b981" />
          </div>
          <h1>¡Solicitud Aprobada!</h1>
          <p>Bienvenido a la familia de guías de TourMate Medellín. Estamos preparando tu panel...</p>
          <div className="tm-loader-bar"><div className="progress"></div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="tm-waiting-screen">
      <div className="tm-waiting-container">
        
        {/* Header de la App */}
        <header className="tm-waiting-header">
          <div className="tm-logo">
            <span className="logo-icon">🧭</span>
            <span className="logo-text">TourMate</span>
          </div>
          <button onClick={handleLogout} className="tm-logout-minimal">
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </header>

        <main className="tm-waiting-content">
          <div className="tm-waiting-card main-card">
            <div className="status-header">
              <div className="pulse-container">
                <div className="pulse-ring"></div>
                <Clock size={40} className="status-icon" />
              </div>
              <span className="status-tag">Revisión en curso</span>
            </div>

            <section className="text-content">
              <h1>Hola, {profile?.displayName || "Guía"}</h1>
              <p>
                Hemos recibido tu solicitud para ser guía en <strong>Medellín</strong>. 
                Nuestro equipo está verificando tus credenciales para garantizar la mejor experiencia a los turistas.
              </p>
            </section>

            {/* Timeline de Proceso */}
            <div className="tm-process-steps">
              <div className="step completed">
                <div className="step-circle">✓</div>
                <div className="step-label">Registro exitoso</div>
              </div>
              <div className="step active">
                <div className="step-circle">2</div>
                <div className="step-label">Validación de identidad</div>
              </div>
              <div className="step">
                <div className="step-circle">3</div>
                <div className="step-label">Activación de panel</div>
              </div>
            </div>

            <div className="info-box">
              <ShieldCheck size={20} />
              <span>Esto suele tardar entre 12 y 24 horas hábiles.</span>
            </div>

            <div className="action-buttons">
              <button 
                onClick={handleRefresh} 
                className={`tm-btn-secondary ${isRefreshing ? 'loading' : ''}`}
              >
                <RefreshCcw size={18} className={isRefreshing ? 'spin' : ''} />
                {isRefreshing ? 'Verificando...' : 'Verificar estado ahora'}
              </button>
            </div>
          </div>

          {/* Sidebar de Ayuda */}
          <aside className="tm-waiting-sidebar">
            <div className="sidebar-card">
              <h3>¿Qué puedes preparar?</h3>
              <ul>
                <li><MapPin size={16} /> Define tus rutas favoritas de la ciudad.</li>
                <li><Mail size={16} /> Revisa tu correo por si pedimos más info.</li>
              </ul>
            </div>
            <div className="contact-support">
              <p>¿Tienes dudas? <a href="mailto:soporte@tourmate.com">Contactar soporte</a></p>
            </div>
          </aside>
        </main>
      </div>

      <style>{`
        .tm-waiting-screen {
          min-height: 100vh;
          background: #f1f5f9;
          display: flex;
          justify-content: center;
          padding: 40px 20px;
          font-family: 'Inter', sans-serif;
        }

        .tm-waiting-container {
          width: 100%;
          max-width: 1000px;
        }

        .tm-waiting-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }

        .tm-logo { display: flex; align-items: center; gap: 10px; }
        .logo-icon { font-size: 24px; }
        .logo-text { font-size: 22px; font-weight: 800; color: #1e293b; }

        .tm-logout-minimal {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: #64748b;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }
        .tm-logout-minimal:hover { color: #ef4444; }

        .tm-waiting-content {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 30px;
        }

        .main-card {
          background: white;
          border-radius: 32px;
          padding: 50px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.05);
          position: relative;
          overflow: hidden;
        }

        .status-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 30px;
        }

        .pulse-container {
          position: relative;
          margin-bottom: 15px;
        }

        .status-icon { color: #ff5a3c; position: relative; z-index: 2; }

        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 4px solid #ff5a3c;
          border-radius: 50%;
          animation: tm-pulse 2s infinite;
          opacity: 0;
        }

        @keyframes tm-pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .status-tag {
          background: #fff1f0;
          color: #ff5a3c;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .text-content h1 { font-size: 2rem; color: #1e293b; margin-bottom: 15px; }
        .text-content p { color: #64748b; line-height: 1.6; font-size: 1.1rem; }

        .tm-process-steps {
          display: flex;
          justify-content: space-between;
          margin: 40px 0;
          position: relative;
        }

        .tm-process-steps::before {
          content: '';
          position: absolute;
          top: 15px;
          left: 10%;
          right: 10%;
          height: 2px;
          background: #e2e8f0;
          z-index: 1;
        }

        .step { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; }
        .step-circle { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; color: #94a3b8; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.9rem; }
        .step.completed .step-circle { background: #10b981; color: white; }
        .step.active .step-circle { background: #ff5a3c; color: white; box-shadow: 0 0 15px rgba(255,90,60,0.4); }
        .step-label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-align: center; }
        .step.active .step-label { color: #1e293b; }

        .info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 15px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #475569;
          font-size: 0.9rem;
        }

        .tm-btn-secondary {
          margin-top: 30px;
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          border: 1.5px solid #e2e8f0;
          background: white;
          font-weight: 700;
          color: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: 0.2s;
        }
        .tm-btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }
        .spin { animation: tm-spin 1s linear infinite; }
        @keyframes tm-spin { to { transform: rotate(360deg); } }

        .sidebar-card { background: #1e293b; border-radius: 24px; padding: 30px; color: white; }
        .sidebar-card h3 { font-size: 1.2rem; margin-bottom: 20px; }
        .sidebar-card ul { padding: 0; list-style: none; }
        .sidebar-card li { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 15px; font-size: 0.9rem; color: #94a3b8; line-height: 1.4; }

        .contact-support { text-align: center; margin-top: 20px; }
        .contact-support p { font-size: 0.85rem; color: #64748b; }
        .contact-support a { color: #ff5a3c; text-decoration: none; font-weight: 700; }

        /* Estilos Aprobado */
        .tm-waiting-screen.approved { background: white; align-items: center; }
        .tm-loader-bar { width: 100%; height: 6px; background: #f1f5f9; border-radius: 10px; margin-top: 30px; overflow: hidden; }
        .progress { height: 100%; background: #10b981; width: 0; animation: tm-load 2s forwards; }
        @keyframes tm-load { to { width: 100%; } }

        @media (max-width: 800px) {
          .tm-waiting-content { grid-template-columns: 1fr; }
          .main-card { padding: 30px; }
        }
      `}</style>
    </div>
  );
}