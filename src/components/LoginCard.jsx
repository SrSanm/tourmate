import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import ModalNotificacion from "./ModalNotificacion";

/**
 * LoginCard - Versión Empresarial TourMate
 * Maneja: Autenticación Email/Pass, Google Auth, 
 * Redirección por Roles y Estados de Aprobación.
 */
export default function LoginCard() {
  // --- Hooks y Estado ---
  const { login, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // --- Manejo de Inputs ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // --- Lógica de Redirección Inteligente ---
  const handleRoleLogic = (profile) => {
    if (!profile) {
      setNotif({ type: "error", title: "Perfil no encontrado", message: "Error al recuperar datos de usuario." });
      return;
    }

    const { role, status } = profile;

    // 1. Caso Guía: Verificar aprobación de Admin
    if (role === "guide") {
      if (status === "approved") {
        navigate("/guide-dashboard");
      } else {
        navigate("/waiting-approval");
      }
      return;
    }

    // 2. Caso Admin
    if (role === "admin") {
      navigate("/admin-dashboard");
      return;
    }

    // 3. Caso Turista (Default)
    navigate("/tourist");
  };

  // --- Acción: Login con Google ---
  const onGoogleLogin = async () => {
    setLoading(true);
    try {
      const { profile } = await loginWithGoogle();
      setNotif({ type: "success", title: "Acceso con Google", message: "Autenticación exitosa." });
      setTimeout(() => handleRoleLogic(profile), 1000);
    } catch (error) {
      console.error("Google Error:", error);
      setNotif({ type: "error", title: "Error de Google", message: "No se pudo completar el acceso." });
    } finally {
      setLoading(false);
    }
  };

  // --- Acción: Recuperar Contraseña ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!form.email) {
      setNotif({ type: "warning", title: "Correo requerido", message: "Ingresa tu email para enviar el enlace." });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(form.email);
      setNotif({ type: "success", title: "Correo enviado", message: "Revisa tu bandeja de entrada." });
      setForgotMode(false);
    } catch (error) {
      setNotif({ type: "error", title: "Error", message: "No se pudo enviar el correo de recuperación." });
    } finally {
      setLoading(false);
    }
  };

  // --- Acción: Login Tradicional ---
  const onEmailLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setNotif({ type: "warning", title: "Campos incompletos", message: "Por favor llena todos los campos." });
      return;
    }

    setLoading(true);
    try {
      const { profile } = await login(form.email, form.password);
      setNotif({ type: "success", title: "¡Bienvenido de nuevo!", message: "Iniciando sesión..." });
      setTimeout(() => handleRoleLogic(profile), 1200);
    } catch (err) {
      const errorMsg = 
        err.code === "auth/user-not-found" ? "Usuario no registrado." :
        err.code === "auth/wrong-password" ? "Contraseña incorrecta." :
        err.code === "auth/too-many-requests" ? "Demasiados intentos. Intenta más tarde." :
        "Error al conectar con el servidor.";
      setNotif({ type: "error", title: "Error de acceso", message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tm-auth-wrapper">
      <div className="tm-auth-card">
        
        {/* Lado Decorativo (Solo visible en Desktop) */}
        <div className="tm-auth-aside">
          <div className="aside-content">
            <h2>Descubre Medellín con TourMate</h2>
            <p>La plataforma líder para conectar guías locales con aventureros del mundo.</p>
          </div>
        </div>

        {/* Lado del Formulario */}
        <div className="tm-auth-main">
          <header className="tm-form-header">
            <div className="tm-brand-icon">⛰️</div>
            <h1>{forgotMode ? "Recuperar cuenta" : "Iniciar sesión"}</h1>
            <p>{forgotMode ? "Te enviaremos un enlace a tu correo" : "¡Qué bueno verte de nuevo!"}</p>
          </header>

          {!forgotMode ? (
            <>
              {/* Botón Google Integrado */}
             <button 
  type="button" 
  className="tm-btn-google" 
  onClick={onGoogleLogin} 
  disabled={loading}
>
  <div className="google-icon-wrapper">
    <img 
      src="https://e7.pngegg.com/pngimages/337/722/png-clipart-google-search-google-account-google-s-google-play-google-company-text.png" 
      alt="Google" 
      className="google-icon-img"
    />
  </div>
  <span className="google-btn-text">Continuar con Google</span>
</button>

              <div className="tm-separator">
                <span>o ingresa con correo</span>
              </div>

              <form className="tm-login-form" onSubmit={onEmailLogin}>
                <div className="tm-input-group">
                  <label>Email</label>
                  <input 
                    name="email" 
                    type="email" 
                    value={form.email} 
                    onChange={handleChange} 
                    placeholder="ejemplo@tourmate.com" 
                    required 
                  />
                </div>

                <div className="tm-input-group">
                  <div className="label-row">
                    <label>Contraseña</label>
                    <span className="forgot-link" onClick={() => setForgotMode(true)}>¿Olvidaste tu contraseña?</span>
                  </div>
                  <div className="pwd-input-wrapper">
                    <input 
                      name="password" 
                      type={showPwd ? "text" : "password"} 
                      value={form.password} 
                      onChange={handleChange} 
                      placeholder="••••••••" 
                      required 
                    />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className="tm-options-row">
                  <label className="checkbox-container">
                    <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                    <span className="checkmark"></span>
                    Mantener sesión iniciada
                  </label>
                </div>

                <button type="submit" className="tm-btn-submit" disabled={loading}>
                  {loading ? <div className="tm-spinner"></div> : "Entrar a mi cuenta"}
                </button>
              </form>
            </>
          ) : (
            <form className="tm-login-form" onSubmit={handleResetPassword}>
              <div className="tm-input-group">
                <label>Ingresa tu correo registrado</label>
                <input 
                  name="email" 
                  type="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  placeholder="ejemplo@tourmate.com" 
                  required 
                />
              </div>
              <button type="submit" className="tm-btn-submit" disabled={loading}>
                {loading ? <div className="tm-spinner"></div> : "Enviar enlace de recuperación"}
              </button>
              <button type="button" className="tm-btn-back" onClick={() => setForgotMode(false)}>
                Volver al inicio de sesión
              </button>
            </form>
          )}

          <footer className="tm-auth-footer">
            <p>¿No tienes una cuenta aún? <Link to="/register">Regístrate aquí</Link></p>
          </footer>
        </div>
      </div>

      {notif && <ModalNotificacion {...notif} onClose={() => setNotif(null)} />}

      <style>{`
        /* Estilos Integrados Pro */
        .tm-auth-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f4f8;
          padding: 20px;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .tm-auth-card {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          background: white;
          width: 100%;
          max-width: 1100px;
          min-height: 650px;
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
        }

        .tm-auth-aside {
          background: linear-gradient(135deg, #ff5a3c 0%, #ff8a75 100%);
          display: flex;
          align-items: center;
          padding: 60px;
          color: white;
        }

        .aside-content h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 20px; line-height: 1.1; }
        .aside-content p { font-size: 1.1rem; opacity: 0.9; line-height: 1.6; }

        .tm-auth-main { padding: 60px; display: flex; flex-direction: column; justify-content: center; }

        .tm-form-header { margin-bottom: 30px; text-align: left; }
        .tm-brand-icon { font-size: 2rem; margin-bottom: 10px; }
        .tm-form-header h1 { font-size: 2rem; font-weight: 800; color: #1e293b; margin: 0; }
        .tm-form-header p { color: #64748b; margin-top: 5px; }

        .tm-btn-google {
          width: 100%;
          padding: 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: 0.2s;
        }

        .tm-btn-google:hover { background: #f8fafc; border-color: #cbd5e1; }
        .tm-btn-google img { width: 20px; }

        .tm-separator {
          display: flex;
          align-items: center;
          margin: 25px 0;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .tm-separator::before, .tm-separator::after { content: ""; flex: 1; border-bottom: 1px solid #f1f5f9; }
        .tm-separator span { padding: 0 15px; }

        .tm-login-form { display: flex; flex-direction: column; gap: 20px; }
        .tm-input-group label { display: block; font-size: 0.9rem; font-weight: 700; color: #334155; margin-bottom: 8px; }
        .tm-input-group input {
          width: 100%;
          padding: 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          transition: 0.2s;
        }
        .tm-input-group input:focus { outline: none; border-color: #ff5a3c; box-shadow: 0 0 0 4px rgba(255, 90, 60, 0.1); }

        .label-row { display: flex; justify-content: space-between; align-items: center; }
        .forgot-link { font-size: 0.8rem; color: #ff5a3c; font-weight: 700; cursor: pointer; }

        .pwd-input-wrapper { position: relative; }
        .pwd-toggle {
          position: absolute;
          right: 15px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
        }

        .tm-btn-submit {
          background: #ff5a3c;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 800;
          cursor: pointer;
          transition: 0.3s;
          margin-top: 10px;
        }
        .tm-btn-submit:hover { transform: translateY(-2px); background: #e0482b; box-shadow: 0 10px 20px rgba(255,90,60,0.2); }

        .tm-btn-back { background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; margin-top: 10px; }

        .tm-spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .tm-auth-footer { margin-top: 30px; text-align: center; }
        .tm-auth-footer a { color: #ff5a3c; font-weight: 700; text-decoration: none; }

        @media (max-width: 900px) {
          .tm-auth-card { grid-template-columns: 1fr; max-width: 500px; }
          .tm-auth-aside { display: none; }
          .tm-auth-main { padding: 40px; }
        }
      `}</style>
    </div>
  );
}