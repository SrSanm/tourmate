import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/firebaseConfig';
import { signOut } from 'firebase/auth';
import '../styles/WaitingApproval.css';

const WaitingApproval = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="wa-container">
      <div className="wa-card">
        <div className="wa-icon-wrapper">
          <div className="wa-pulse"></div>
          <span className="wa-icon">🧭</span>
        </div>
        
        <h1>Solicitud en Revisión</h1>
        <p className="wa-description">
          ¡Gracias por querer ser parte de <strong>TourMate</strong>! Hemos recibido tu registro como guía. 
          Nuestro equipo administrativo está validando tus datos para asegurar la mejor calidad en nuestras rutas por Medellín.
        </p>

        <div className="wa-info-box">
          <div className="wa-info-item">
            <span className="wa-bullet">🕒</span>
            <p>El proceso suele tardar entre <strong>24 y 48 horas</strong> hábiles.</p>
          </div>
          <div className="wa-info-item">
            <span className="wa-bullet">📧</span>
            <p>Te enviaremos un correo electrónico una vez tu perfil sea <strong>aprobado</strong>.</p>
          </div>
        </div>

        <div className="wa-actions">
          <button className="wa-btn-primary" onClick={() => window.location.reload()}>
            Verificar estado actual
          </button>
          <button className="wa-btn-secondary" onClick={handleLogout}>
            Cerrar sesión y volver al inicio
          </button>
        </div>

        <footer className="wa-footer">
          ¿Tienes dudas? Escríbenos a <a href="mailto:soporte@tourmate.com">soporte@tourmate.com</a>
        </footer>
      </div>

      <style>{`
        .wa-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          padding: 20px;
          font-family: 'Inter', sans-serif;
        }

        .wa-card {
          background: white;
          max-width: 550px;
          width: 100%;
          padding: 50px 40px;
          border-radius: 32px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.04);
          text-align: center;
        }

        .wa-icon-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wa-icon {
          font-size: 3.5rem;
          z-index: 2;
        }

        .wa-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          background: rgba(255, 90, 60, 0.1);
          border-radius: 50%;
          animation: pulse-animation 2s infinite;
        }

        @keyframes pulse-animation {
          0% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        h1 {
          font-size: 2rem;
          font-weight: 900;
          color: #1e293b;
          margin-bottom: 15px;
        }

        .wa-description {
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 30px;
        }

        .wa-info-box {
          background: #f8fafc;
          border-radius: 20px;
          padding: 20px;
          text-align: left;
          margin-bottom: 35px;
          border: 1px solid #e2e8f0;
        }

        .wa-info-item {
          display: flex;
          gap: 15px;
          margin-bottom: 10px;
          align-items: center;
        }

        .wa-info-item:last-child { margin-bottom: 0; }

        .wa-info-item p {
          margin: 0;
          font-size: 0.9rem;
          color: #475569;
        }

        .wa-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .wa-btn-primary {
          background: #ff5a3c;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 16px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.3s;
        }

        .wa-btn-primary:hover {
          background: #e0482b;
          transform: translateY(-2px);
        }

        .wa-btn-secondary {
          background: transparent;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 14px;
          border-radius: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .wa-btn-secondary:hover {
          background: #f1f5f9;
        }

        .wa-footer {
          margin-top: 30px;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .wa-footer a {
          color: #ff5a3c;
          text-decoration: none;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default WaitingApproval;