import React, { useState, useEffect } from 'react';
import { 
  FiClock, 
  FiRefreshCw, 
  FiLogOut, 
  FiMail, 
  FiAlertCircle, 
  FiCheckCircle,
  FiExternalLink,
  FiMapPin,
  FiShield
} from "react-icons/fi"; 
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useNavigate } from 'react-router-dom';

/**
 * WaitingApproval.jsx - Professional Edition
 * Esta página gestiona el estado de espera de los guías de TourMate Medellín.
 */
const WaitingApproval = () => {
  const { profile, refreshProfile, logout } = useAuth();
  const { showNotification } = useUI();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const navigate = useNavigate();

  // Redirección automática si el perfil cambia a aprobado mientras la página está abierta
  useEffect(() => {
    if (profile?.status === 'approved') {
      navigate('/guide-dashboard');
    }
  }, [profile, navigate]);

  /**
   * Verifica manualmente si el administrador ya cambió el status en Firestore
   */
  const handleCheckStatus = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      // Llamamos a la función del AuthContext que actualiza el estado global
      const updatedProfile = await refreshProfile();
      
      if (updatedProfile?.status === 'approved') {
        showNotification("¡Excelente! Tu cuenta ha sido activada.", "success");
        navigate('/guide-dashboard');
      } else if (updatedProfile?.status === 'rejected') {
        showNotification("Tu solicitud no pudo ser aprobada en este momento.", "error");
      } else {
        showNotification("Seguimos trabajando en tu validación.", "info");
      }
    } catch (err) {
      setErrorCount(prev => prev + 1);
      showNotification("Error de conexión con los servidores de TourMate.", "error");
    } finally {
      setTimeout(() => setIsRefreshing(false), 800); // Evita el spam del botón
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      showNotification("Error al cerrar sesión.", "error");
    }
  };

  return (
    <div className="waiting-page-wrapper">
      <div className="waiting-card animate-slide-up">
        
        {/* Encabezado Visual */}
        <div className="status-visual">
          <div className="icon-blob">
            <FiClock className="main-icon spin-slow" />
            <div className="pulse-ring"></div>
          </div>
          <div className="badge-status">
            <span className="dot pulse"></span>
            Revisión en curso
          </div>
        </div>

        {/* Contenido de Texto */}
        <header className="content-header">
          <h1>Hola, {profile?.name?.split(' ')[0] || 'Guía'}</h1>
          <p className="lead">
            Estamos verificando tus credenciales para asegurar la mejor experiencia 
            en las calles de <strong>Medellín</strong>.
          </p>
        </header>

        {/* Detalles del Proceso */}
        <div className="process-details">
          <div className="detail-item">
            <FiShield className="detail-icon" />
            <div>
              <h4>Seguridad TourMate</h4>
              <p>Validamos antecedentes y experiencia local.</p>
            </div>
          </div>
          <div className="detail-item">
            <FiMapPin className="detail-icon" />
            <div>
              <h4>Zona de Cobertura</h4>
              <p>Actualmente validando rutas en Valle de Aburrá.</p>
            </div>
          </div>
        </div>

        {/* Panel de Estado Actual */}
        <div className={`status-panel ${profile?.status}`}>
          <div className="status-info">
            <small>ESTADO DE SOLICITUD</small>
            <p>{profile?.status === 'pending' ? 'Esperando aprobación' : profile?.status}</p>
          </div>
          <FiAlertCircle className="status-icon" />
        </div>

        {/* Botones de Acción */}
        <footer className="waiting-footer">
          <button 
            className={`btn-check ${isRefreshing ? 'is-loading' : ''}`}
            onClick={handleCheckStatus}
            disabled={isRefreshing}
          >
            <FiRefreshCw className={isRefreshing ? 'icon-spin' : ''} />
            {isRefreshing ? 'Consultando...' : 'Verificar actualización'}
          </button>

          <button className="btn-exit" onClick={handleLogout}>
            <FiLogOut /> Salir de la cuenta
          </button>
        </footer>

        {/* Pie de página de Soporte */}
        <div className="support-link">
          <p>
            <FiMail /> ¿Necesitas ayuda rápida? <br />
            <a href="mailto:guias@tourmate.com">guias@tourmate.com</a>
          </p>
        </div>
      </div>

      {/* Estilos Avanzados Scoped */}
      <style>{`
        .waiting-page-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 24px;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .waiting-card {
          background: white;
          width: 100%;
          max-width: 480px;
          border-radius: 32px;
          padding: 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        /* Visuales */
        .status-visual { margin-bottom: 30px; display: flex; flex-direction: column; align-items: center; }
        .icon-blob {
          width: 80px; height: 80px; background: #fff1f0; border-radius: 24px;
          display: flex; align-items: center; justify-content: center;
          color: #ff5a3c; font-size: 40px; margin-bottom: 15px; position: relative;
        }
        .pulse-ring {
          position: absolute; width: 100%; height: 100%; border: 2px solid #ff5a3c;
          border-radius: 24px; animation: ring-pulse 2s infinite;
        }
        .badge-status {
          background: #f1f5f9; padding: 6px 14px; border-radius: 20px;
          font-size: 13px; font-weight: 700; color: #64748b; display: flex; align-items: center; gap: 8px;
        }
        .dot.pulse { width: 8px; height: 8px; background: #ff5a3c; border-radius: 50%; animation: dot-blink 1s infinite; }

        /* Tipografía */
        h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0 0 8px 0; }
        .lead { color: #64748b; font-size: 16px; line-height: 1.5; margin-bottom: 32px; }

        /* Detalles */
        .process-details { text-align: left; background: #f8fafc; border-radius: 20px; padding: 20px; margin-bottom: 24px; }
        .detail-item { display: flex; gap: 15px; margin-bottom: 15px; }
        .detail-item:last-child { margin-bottom: 0; }
        .detail-icon { color: #94a3b8; font-size: 20px; margin-top: 3px; }
        .detail-item h4 { font-size: 14px; font-weight: 700; color: #334155; margin: 0; }
        .detail-item p { font-size: 13px; color: #64748b; margin: 2px 0 0 0; }

        /* Panel de Status */
        .status-panel {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 24px; border-radius: 16px; background: #fffbeb; border: 1px solid #fef3c7;
          margin-bottom: 32px; text-align: left;
        }
        .status-info small { font-size: 10px; font-weight: 800; color: #d97706; letter-spacing: 1px; }
        .status-info p { margin: 0; font-weight: 700; color: #92400e; }
        .status-icon { color: #f59e0b; font-size: 24px; }

        /* Botones */
        .waiting-footer { display: flex; flex-direction: column; gap: 12px; }
        .btn-check {
          background: #1e293b; color: white; border: none; padding: 18px;
          border-radius: 16px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-check:hover:not(:disabled) { background: #0f172a; transform: translateY(-2px); }
        .btn-check:active { transform: scale(0.98); }
        .btn-exit {
          background: white; color: #64748b; border: 1px solid #e2e8f0; padding: 14px;
          border-radius: 16px; font-weight: 600; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.2s;
        }
        .btn-exit:hover { background: #f1f5f9; color: #ef4444; border-color: #fecaca; }

        .support-link { margin-top: 30px; border-top: 1px solid #f1f5f9; pt: 20px; color: #94a3b8; font-size: 13px; }
        .support-link a { color: #ff5a3c; font-weight: 700; text-decoration: none; }

        /* Animaciones */
        @keyframes ring-pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes dot-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .icon-spin { animation: spin-slow 1s linear infinite; }
        .animate-slide-up { animation: slideUp 0.6s ease-out forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default WaitingApproval;