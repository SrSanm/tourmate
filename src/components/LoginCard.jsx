import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import ModalNotificacion from "./ModalNotificacion";

export default function LoginCard() {
  const { login, loginWithGoogle, resetPassword, profile, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]         = useState({ email: "", password: "" });
  const [loading, setLoading]   = useState(false);
  const [notif, setNotif]       = useState(null);
  const [showPwd, setShowPwd]   = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // Redirección automática coordinada con el estado de autenticación y el perfil de Firestore
  useEffect(() => {
    if (!user || !profile) return;

    if (profile.role === "admin") { 
      navigate("/admin/analytics", { replace: true }); 
      return; 
    }
    
    if (profile.role === "tourist") { 
      navigate("/tourist/explore", { replace: true }); 
      return; 
    }
    
    if (profile.role === "guide") {
      if (profile.status === "approved") {
        navigate("/guide/my-tours", { replace: true });
      } else {
        navigate("/waiting-approval", { replace: true });
      }
    }
  }, [user, profile, navigate]);

  const onGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      // La redirección la maneja el useEffect de arriba cuando llegan los datos
    } catch (error) {
      console.error("Google Error:", error);
      setNotif({ type: "error", title: "Error de Google", message: "No se pudo completar el acceso." });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!form.email) {
      setNotif({ type: "warning", title: "Correo requerido", message: "Ingresa tu email para enviar el enlace." });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(form.email);
      setNotif({ type: "success", title: "Correo enviado ✅", message: "Revisa tu bandeja de entrada." });
      setForgotMode(false);
    } catch {
      setNotif({ type: "error", title: "Error", message: "No se pudo enviar el correo de recuperación." });
    } finally {
      setLoading(false);
    }
  };

  const onEmailLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setNotif({ type: "warning", title: "Campos incompletos", message: "Por favor llena todos los campos." });
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      // Redirección automática vía useEffect al actualizar el estado global de AuthContext
    } catch (err) {
      const msg =
        err.code === "auth/user-not-found"      ? "Usuario no registrado." :
        err.code === "auth/wrong-password"       ? "Contraseña incorrecta." :
        err.code === "auth/invalid-credential"   ? "Email o contraseña incorrectos." :
        err.code === "auth/too-many-requests"    ? "Demasiados intentos. Intenta más tarde." :
        "Error al conectar con el servidor.";
      setNotif({ type: "error", title: "Error de acceso", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tm-auth-wrapper">
      <div className="tm-auth-card">

        {/* Panel decorativo */}
        <div className="tm-auth-aside">
          <div className="aside-content">
            <h2>Descubre Medellín con TourMate</h2>
            <p>La plataforma que conecta guías locales apasionados con aventureros del mundo.</p>
          </div>
        </div>

        {/* Formulario */}
        <div className="tm-auth-main">
          <header className="tm-form-header">
            <div className="tm-brand-icon">⛰️</div>
            <h1>{forgotMode ? "Recuperar cuenta" : "Iniciar sesión"}</h1>
            <p>{forgotMode ? "Te enviaremos un enlace a tu correo" : "¡Qué bueno verte de nuevo!"}</p>
          </header>

          {!forgotMode ? (
            <>
              <button type="button" className="tm-btn-google" onClick={onGoogleLogin} disabled={loading}>
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Continuar con Google</span>
              </button>

              <div className="tm-separator"><span>o ingresa con correo</span></div>

              <form className="tm-login-form" onSubmit={onEmailLogin}>
                <div className="tm-input-group">
                  <label>Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="ejemplo@tourmate.com" required />
                </div>

                <div className="tm-input-group">
                  <div className="label-row">
                    <label>Contraseña</label>
                    <span className="forgot-link" onClick={() => setForgotMode(true)}>¿Olvidaste tu contraseña?</span>
                  </div>
                  <div className="pwd-input-wrapper">
                    <input name="password" type={showPwd ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="••••••••" required />
                    <button type="button" className="pwd-toggle" onClick={() => setShowPwd(p => !p)}>
                      {showPwd ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                <button type="submit" className="tm-btn-submit" disabled={loading}>
                  {loading ? <div className="tm-spinner-btn"></div> : "Entrar a mi cuenta"}
                </button>
              </form>
            </>
          ) : (
            <form className="tm-login-form" onSubmit={handleResetPassword}>
              <div className="tm-input-group">
                <label>Ingresa tu correo registrado</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="ejemplo@tourmate.com" required />
              </div>
              <button type="submit" className="tm-btn-submit" disabled={loading}>
                {loading ? <div className="tm-spinner-btn"></div> : "Enviar enlace de recuperación"}
              </button>
              <button type="button" className="tm-btn-back" onClick={() => setForgotMode(false)}>
                ← Volver al inicio de sesión
              </button>
            </form>
          )}

          <footer className="tm-auth-footer">
            <p>¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link></p>
          </footer>
        </div>
      </div>

      {notif && <ModalNotificacion {...notif} onClose={() => setNotif(null)} />}

      <style>{`
        .tm-auth-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f4f8; padding: 20px; font-family: 'Inter', system-ui, sans-serif; }
        .tm-auth-card { display: grid; grid-template-columns: 1fr 1.2fr; background: white; width: 100%; max-width: 1000px; min-height: 600px; border-radius: 30px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.12); }
        .tm-auth-aside { background: linear-gradient(135deg, #ff5a3c 0%, #ff8a75 100%); display: flex; align-items: center; padding: 60px; color: white; }
        .aside-content h2 { font-size: 2.2rem; font-weight: 800; margin-bottom: 20px; line-height: 1.15; }
        .aside-content p { font-size: 1.05rem; opacity: 0.9; line-height: 1.6; }
        .tm-auth-main { padding: 50px 55px; display: flex; flex-direction: column; justify-content: center; }
        .tm-form-header { margin-bottom: 28px; }
        .tm-brand-icon { font-size: 2rem; margin-bottom: 10px; }
        .tm-form-header h1 { font-size: 1.9rem; font-weight: 800; color: #1e293b; margin: 0; }
        .tm-form-header p { color: #64748b; margin-top: 5px; }
        .tm-btn-google { width: 100%; padding: 13px; background: white; border: 1.5px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 12px; font-weight: 600; color: #475569; cursor: pointer; transition: 0.2s; font-size: 0.95rem; }
        .tm-btn-google:hover { background: #f8fafc; border-color: #cbd5e1; }
        .tm-separator { display: flex; align-items: center; margin: 22px 0; color: #94a3b8; font-size: 0.85rem; }
        .tm-separator::before, .tm-separator::after { content: ""; flex: 1; border-bottom: 1px solid #f1f5f9; }
        .tm-separator span { padding: 0 15px; }
        .tm-login-form { display: flex; flex-direction: column; gap: 18px; }
        .tm-input-group label { display: block; font-size: 0.88rem; font-weight: 700; color: #334155; margin-bottom: 8px; }
        .tm-input-group input { width: 100%; padding: 13px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; transition: 0.2s; box-sizing: border-box; }
        .tm-input-group input:focus { outline: none; border-color: #ff5a3c; box-shadow: 0 0 0 3px rgba(255,90,60,0.1); }
        .label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .label-row label { margin-bottom: 0; }
        .forgot-link { font-size: 0.8rem; color: #ff5a3c; font-weight: 700; cursor: pointer; }
        .pwd-input-wrapper { position: relative; }
        .pwd-toggle { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #64748b; font-weight: 600; font-size: 0.82rem; cursor: pointer; }
        .tm-btn-submit { background: #ff5a3c; color: white; border: none; padding: 15px; border-radius: 12px; font-size: 1rem; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .tm-btn-submit:hover:not(:disabled) { transform: translateY(-2px); background: #e0482b; box-shadow: 0 10px 20px rgba(255,90,60,0.25); }
        .tm-btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .tm-btn-back { background: none; border: none; color: #64748b; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
        .tm-spinner-btn { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tm-auth-footer { margin-top: 25px; text-align: center; color: #64748b; font-size: 0.9rem; }
        .tm-auth-footer a { color: #ff5a3c; font-weight: 700; text-decoration: none; }
        @media (max-width: 800px) { .tm-auth-card { grid-template-columns: 1fr; max-width: 480px; } .tm-auth-aside { display: none; } .tm-auth-main { padding: 40px 30px; } }
      `}</style>
    </div>
  );
}