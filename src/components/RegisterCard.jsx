import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import ModalNotificacion from "./ModalNotificacion";
import "../styles/LoginCard.css";

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
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRoleSelect = (val) => {
    setForm({ ...form, role: val });
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones básicas
    if (!form.displayName || !form.email || !form.password || !form.confirm) {
      setNotif({ type: "warning", title: "Campos requeridos", message: "Por favor completa todos los campos." });
      return;
    }
    if (form.password !== form.confirm) {
      setNotif({ type: "error", title: "Error", message: "Las contraseñas no coinciden." });
      return;
    }

    setLoading(true);
    try {
      // Llamamos al registro pasándole el rol
      const { profile } = await register(form.email, form.password, form.displayName, form.role);
      
      // Personalizamos la notificación según el rol
      if (form.role === "guide") {
        setNotif({ 
          type: "success", 
          title: "Solicitud enviada", 
          message: "Tu cuenta de guía está siendo revisada por el administrador. Te avisaremos pronto." 
        });
      } else {
        setNotif({ 
          type: "success", 
          title: "¡Bienvenido!", 
          message: "Tu cuenta de turista ha sido creada con éxito." 
        });
      }

      // Redirección inteligente
      setTimeout(() => {
        if (form.role === "guide") {
          // El guía va a una página de espera, NO al dashboard
          navigate("/waiting-approval"); 
        } else {
          // El turista va a su panel normal
          navigate("/tourist"); 
        }
      }, 3000); // Damos un poco más de tiempo para que lean el mensaje

    } catch (err) {
      console.error(err);
      setNotif({ 
        type: "error", 
        title: "Error", 
        message: "Ocurrió un error al crear la cuenta. Inténtalo de nuevo." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-card__header">
          <div className="auth-card__icon">✈</div>
          <h2 className="auth-card__title">Únete a Tourmate</h2>
          <p className="auth-card__sub">Crea tu cuenta en pocos segundos</p>
        </div>

        <div className="auth-card__field">
          <label>Nombre completo</label>
          <input name="displayName" type="text" value={form.displayName} onChange={handleChange} placeholder="Ej: Juan Pérez" />
        </div>

        <div className="auth-card__field">
          <label>Correo electrónico</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="tu@email.com" />
        </div>

        <div className="auth-card__row">
          <div className="auth-card__field">
            <label>Contraseña</label>
            <div className="auth-card__pwd-wrap">
              <input name="password" type={showPwd ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="••••••••" />
              <button type="button" className="auth-card__toggle" onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>
          <div className="auth-card__field">
            <label>Confirmar</label>
            <input name="confirm" type={showPwd ? "text" : "password"} value={form.confirm} onChange={handleChange} placeholder="••••••••" />
          </div>
        </div>

        <div className="auth-card__field">
          <label>¿Cuál es tu rol?</label>
          <div className={`custom-dropdown ${isDropdownOpen ? "is-open" : ""}`} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className="selected-text">
              {form.role === "tourist" ? "🌍 Turista — Quiero explorar" : "🧭 Guía — Quiero trabajar"}
            </div>
            <span className="arrow">▼</span>
            {isDropdownOpen && (
              <div className="dropdown-options">
                <div className="option-item" onClick={() => handleRoleSelect("tourist")}>
                  <strong>🌍 Turista</strong>
                  <span>Explora Medellín y reserva tours fácilmente.</span>
                </div>
                <div className="option-item" onClick={() => handleRoleSelect("guide")}>
                  <strong>🧭 Guía</strong>
                  <span>Publica tus rutas (Requiere aprobación del admin).</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <button type="submit" className="auth-card__submit" disabled={loading}>
          {loading ? <div className="auth-card__spinner" /> : "Crear mi cuenta"}
        </button>

        <p className="auth-card__footer-text">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
        </p>
      </form>

      {notif && <ModalNotificacion {...notif} onClose={() => setNotif(null)} />}
    </div>
  );
}