import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import ModalNotificacion from "./ModalNotificacion";

export default function RegisterCard() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    confirm: "",
    role: "tourist"
  });
  const [loading, setLoading]           = useState(false);
  const [notif, setNotif]               = useState(null);
  const [showPwd, setShowPwd]           = useState(false);
  const [isDropdownOpen, setDropdown]   = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleRoleSelect = (val) => { setForm(prev => ({ ...prev, role: val })); setDropdown(false); };

  const getStrength = () => {
    if (!form.password) return { label: "", color: "transparent", width: "0%" };
    if (form.password.length < 6)  return { label: "Débil",  color: "#ef4444", width: "33%" };
    if (form.password.length < 10) return { label: "Media",  color: "#f59e0b", width: "66%" };
    return { label: "Fuerte", color: "#10b981", width: "100%" };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.displayName || !form.email || !form.password || !form.confirm) {
      setNotif({ type: "warning", title: "Campos incompletos", message: "Todos los campos son obligatorios." }); return;
    }
    if (form.password.length < 6) {
      setNotif({ type: "error", title: "Contraseña corta", message: "Usa al menos 6 caracteres." }); return;
    }
    if (form.password !== form.confirm) {
      setNotif({ type: "error", title: "Contraseñas distintas", message: "Las contraseñas no coinciden." }); return;
    }

    setLoading(true);
    try {
      await register(form.email, form.password, form.displayName, form.role);

      if (form.role === "guide") {
        setNotif({ type: "success", title: "Solicitud enviada 🎉", message: "Tu perfil está en revisión. Te avisaremos por correo." });
        setTimeout(() => navigate("/waiting-approval"), 2200);
      } else {
        setNotif({ type: "success", title: "¡Bienvenido a TourMate!", message: "Tu cuenta fue creada exitosamente." });
        // La redirección la maneja App.jsx → DashboardRedirect al cargar el profile
        setTimeout(() => navigate("/tourist/explore"), 2200);
      }
    } catch (err) {
      let msg = "No pudimos crear tu cuenta.";
      if (err.code === "auth/email-already-in-use") msg = "Este correo ya está registrado.";
      if (err.code === "auth/invalid-email")         msg = "El formato del correo es inválido.";
      setNotif({ type: "error", title: "Error de registro", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength();

  return (
    <div className="tm-register-page">
      <div className="tm-register-card">

        {/* Panel izquierdo */}
        <div className="tm-register-info">
          <div className="info-overlay">
            <span className="badge">TourMate Medellín</span>
            <h2>Comienza tu próxima aventura</h2>
            <p>Únete a miles de personas que ya están descubriendo los secretos de la ciudad de la eterna primavera.</p>
            <ul className="feat-list">
              <li>✓ Tours verificados por expertos</li>
              <li>✓ Pagos seguros y garantizados</li>
              <li>✓ Soporte local 24/7</li>
            </ul>
          </div>
        </div>

        {/* Formulario */}
        <div className="tm-register-form-area">
          <header className="form-header">
            <h1>Crea tu cuenta</h1>
            <p>Es gratis y solo toma un minuto</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="tm-input-group">
              <label>Nombre y Apellido</label>
              <input name="displayName" type="text" value={form.displayName} onChange={handleChange} placeholder="Ej: Mateo Arango" />
            </div>

            <div className="tm-input-group">
              <label>Correo electrónico</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="nombre@correo.com" />
            </div>

            <div className="form-row">
              <div className="tm-input-group">
                <label>Contraseña</label>
                <div className="pwd-wrapper">
                  <input name="password" type={showPwd ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="••••••••" />
                  <button type="button" className="toggle-btn" onClick={() => setShowPwd(p => !p)}>
                    {showPwd ? "Ocultar" : "Ver"}
                  </button>
                </div>
                <div className="strength-meter">
                  <div className="strength-bar" style={{ width: strength.width, backgroundColor: strength.color }}></div>
                </div>
                {strength.label && <small style={{ color: strength.color, fontWeight: 700 }}>{strength.label}</small>}
              </div>

              <div className="tm-input-group">
                <label>Confirmar contraseña</label>
                <input name="confirm" type={showPwd ? "text" : "password"} value={form.confirm} onChange={handleChange} placeholder="••••••••" />
              </div>
            </div>

            <div className="tm-input-group">
              <label>Tipo de cuenta</label>
              <div className={`tm-custom-select ${isDropdownOpen ? "open" : ""}`} onClick={() => setDropdown(p => !p)}>
                <div className="current-val">
                  {form.role === "tourist" ? "🌍 Quiero explorar (Turista)" : "🧭 Quiero trabajar (Guía Local)"}
                </div>
                <span className="tm-arrow">⌄</span>
                {isDropdownOpen && (
                  <div className="tm-options">
                    <div className="tm-opt" onClick={() => handleRoleSelect("tourist")}>
                      <b>🌍 Turista</b>
                      <p>Busca rutas, reserva y califica guías locales.</p>
                    </div>
                    <div className="tm-opt" onClick={() => handleRoleSelect("guide")}>
                      <b>🧭 Guía Local</b>
                      <p>Crea rutas y gana dinero (sujeto a aprobación del admin).</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {form.role === "guide" && (
              <div className="guide-notice">
                ℹ️ Los guías deben ser aprobados por el equipo de TourMate antes de publicar tours.
              </div>
            )}

            <button type="submit" className="tm-btn-primary" disabled={loading}>
              {loading ? <div className="tm-loader"></div> : "Crear cuenta ahora"}
            </button>
          </form>

          <footer className="form-footer">
            <p>¿Ya eres parte de TourMate? <Link to="/login">Inicia sesión</Link></p>
          </footer>
        </div>
      </div>

      {notif && <ModalNotificacion {...notif} onClose={() => setNotif(null)} />}

      <style>{`
        .tm-register-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f1f5f9; padding: 20px; font-family: 'Inter', sans-serif; }
        .tm-register-card { display: grid; grid-template-columns: 0.8fr 1.2fr; background: white; width: 100%; max-width: 1050px; border-radius: 32px; overflow: hidden; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.15); }
        .tm-register-info { background-image: url('https://images.unsplash.com/photo-1595231712325-9febb4752c97?q=80&w=800'); background-size: cover; background-position: center; }
        .info-overlay { background: linear-gradient(to top, rgba(255,90,60,0.95), rgba(255,90,60,0.45)); height: 100%; padding: 55px; color: white; display: flex; flex-direction: column; justify-content: center; }
        .badge { background: rgba(255,255,255,0.2); padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; width: fit-content; margin-bottom: 20px; }
        .info-overlay h2 { font-size: 2.4rem; font-weight: 800; line-height: 1.15; margin-bottom: 15px; }
        .info-overlay p { opacity: 0.9; line-height: 1.6; margin-bottom: 25px; }
        .feat-list { list-style: none; padding: 0; margin: 0; }
        .feat-list li { margin-bottom: 12px; font-weight: 600; font-size: 1rem; }
        .tm-register-form-area { padding: 45px 60px; overflow-y: auto; }
        .form-header { margin-bottom: 28px; }
        .form-header h1 { font-size: 2rem; font-weight: 800; color: #1e293b; margin: 0; }
        .form-header p { color: #64748b; margin-top: 5px; }
        .tm-input-group { margin-bottom: 20px; }
        .tm-input-group label { display: block; font-size: 0.85rem; font-weight: 800; color: #334155; margin-bottom: 8px; }
        .tm-input-group input { width: 100%; padding: 13px 15px; border: 1.5px solid #e2e8f0; border-radius: 13px; font-size: 0.95rem; transition: 0.2s; box-sizing: border-box; }
        .tm-input-group input:focus { outline: none; border-color: #ff5a3c; box-shadow: 0 0 0 3px rgba(255,90,60,0.1); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .pwd-wrapper { position: relative; }
        .toggle-btn { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #ff5a3c; font-weight: 700; cursor: pointer; font-size: 0.82rem; }
        .strength-meter { height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 8px; overflow: hidden; }
        .strength-bar { height: 100%; transition: 0.3s; border-radius: 2px; }
        .tm-custom-select { position: relative; padding: 13px 15px; border: 1.5px solid #e2e8f0; border-radius: 13px; cursor: pointer; background: white; display: flex; justify-content: space-between; align-items: center; user-select: none; }
        .tm-custom-select.open { border-color: #ff5a3c; box-shadow: 0 0 0 3px rgba(255,90,60,0.1); }
        .current-val { font-size: 0.95rem; color: #1e293b; font-weight: 500; }
        .tm-arrow { color: #64748b; }
        .tm-options { position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: white; border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 20; padding: 8px; border: 1px solid #f1f5f9; }
        .tm-opt { padding: 12px; border-radius: 10px; cursor: pointer; transition: 0.15s; }
        .tm-opt:hover { background: #fff1f0; }
        .tm-opt b { display: block; color: #1e293b; font-size: 0.9rem; margin-bottom: 2px; }
        .tm-opt p { font-size: 0.78rem; color: #64748b; margin: 0; }
        .guide-notice { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px 15px; color: #1e40af; font-size: 0.85rem; margin-bottom: 20px; line-height: 1.5; }
        .tm-btn-primary { width: 100%; background: #ff5a3c; color: white; padding: 16px; border: none; border-radius: 14px; font-size: 1.05rem; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .tm-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(255,90,60,0.3); background: #e0482b; }
        .tm-btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .form-footer { margin-top: 25px; text-align: center; color: #64748b; font-size: 0.9rem; }
        .form-footer a { color: #ff5a3c; font-weight: 800; text-decoration: none; }
        .tm-loader { width: 22px; height: 22px; border: 3px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 860px) { .tm-register-card { grid-template-columns: 1fr; } .tm-register-info { display: none; } .tm-register-form-area { padding: 35px 25px; } .form-row { grid-template-columns: 1fr; gap: 0; } }
      `}</style>
    </div>
  );
}