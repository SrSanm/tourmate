import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import ModalNotificacion from "./ModalNotificacion";
import "../styles/LoginCard.css";

export default function LoginCard() {
  const { login, loginWithGoogle } = useAuth(); // Asumiendo que loginWithGoogle existe en tu context
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // --- LÓGICA DE REDIRECCIÓN REUTILIZABLE ---
  const handleRoleRedirect = (profile) => {
    if (profile?.role === "guide") {
      // Si es guía, verificamos si está aprobado por el admin
      if (profile.status === "approved") {
        navigate("/guide-dashboard");
      } else {
        navigate("/waiting-approval");
      }
    } else {
      // Si es turista, entra directo
      navigate("/tourist");
    }
  };

  // --- LOGIN TRADICIONAL ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setNotif({ type: "warning", title: "Campos requeridos", message: "Por favor completa todos los campos." });
      return;
    }
    setLoading(true);
    try {
      const { profile } = await login(form.email, form.password);
      setNotif({ type: "success", title: "¡Bienvenido!", message: "Iniciando sesión..." });

      setTimeout(() => {
        handleRoleRedirect(profile);
      }, 1000);

    } catch (err) {
      console.error(err);
      const msg =
        err.code === "auth/user-not-found" ? "No existe una cuenta con ese correo." :
        err.code === "auth/wrong-password" ? "Contraseña incorrecta." :
        err.code === "auth/invalid-credential" ? "Credenciales inválidas." :
        "Error al iniciar sesión. Intenta de nuevo.";
      setNotif({ type: "error", title: "Error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIN CON GOOGLE ---
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { profile } = await loginWithGoogle();
      setNotif({ type: "success", title: "Acceso con Google", message: "Sincronizando cuenta..." });
      
      setTimeout(() => {
        handleRoleRedirect(profile);
      }, 1000);
    } catch (err) {
      console.error(err);
      setNotif({ type: "error", title: "Error", message: "No se pudo conectar con Google." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-card__header">
          <div className="auth-card__icon">✈</div>
          <h2 className="auth-card__title">Iniciar sesión</h2>
          <p className="auth-card__sub">Accede a tu cuenta de Tourmate</p>
        </div>

        {/* BOTÓN DE GOOGLE */}
        <button 
          type="button" 
          className="auth-card__google-btn" 
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" />
          Continuar con Google
        </button>

        <div className="auth-card__divider">
          <span>o usa tu correo</span>
        </div>

        <div className="auth-card__field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="tu@email.com"
          />
        </div>

        <div className="auth-card__field">
          <label htmlFor="password">Contraseña</label>
          <div className="auth-card__pwd-wrap">
            <input
              id="password"
              name="password"
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
            <button type="button" className="auth-card__toggle" onClick={() => setShowPwd(!showPwd)}>
              {showPwd ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <button type="submit" className="auth-card__submit" disabled={loading}>
          {loading ? <div className="auth-card__spinner" /> : "Iniciar sesión"}
        </button>

        <p className="auth-card__footer-text">
          ¿No tienes cuenta? <Link to="/register">Regístrate gratis</Link>
        </p>
      </form>

      {notif && (
        <ModalNotificacion
          type={notif.type}
          title={notif.title}
          message={notif.message}
          onClose={() => setNotif(null)}
        />
      )}
    </div>
  );
}