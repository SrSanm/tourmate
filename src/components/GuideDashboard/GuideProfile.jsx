import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";

/**
 * GuideProfile - Perfil editable del guía.
 * Carga y guarda datos desde/hacia Firestore.
 */
const GuideProfile = () => {
  const { user } = useAuth();
  const { showNotification } = useUI();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    bio: "",
    phone: "",
    languages: "",
    city: "Medellín",
    experience: ""
  });

  // ── Cargar datos actuales desde Firestore ──
  useEffect(() => {
    const loadProfile = async () => {
      const currentUser = user || auth.currentUser;
      if (!currentUser) return;
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          const d = snap.data();
          setForm({
            name: d.name || "",
            bio: d.bio || "",
            phone: d.phone || "",
            languages: d.languages || "",
            city: d.city || "Medellín",
            experience: d.experience || ""
          });
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const currentUser = user || auth.currentUser;
    if (!currentUser) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        ...form,
        updatedAt: new Date()
      });
      showNotification?.("Perfil actualizado correctamente ✅", "success");
    } catch (err) {
      console.error(err);
      showNotification?.("Error al guardar los cambios", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
        <div className="gp-spinner"></div>
        <p>Cargando tu perfil...</p>
      </div>
    );
  }

  return (
    <div className="guide-section profile-edit">
      <div className="gp-header">
        <div className="gp-avatar">{form.name?.charAt(0)?.toUpperCase() || 'G'}</div>
        <div>
          <h2>Mi Perfil de Guía</h2>
          <p>Esta información es visible para los turistas que reserven tus tours.</p>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="guide-form gp-form">
        <div className="gp-grid">
          <div className="form-group">
            <label>Nombre Público *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Tu nombre completo"
              required
            />
          </div>

          <div className="form-group">
            <label>Teléfono / WhatsApp</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+57 300 000 0000"
            />
          </div>

          <div className="form-group">
            <label>Idiomas que hablas</label>
            <input
              name="languages"
              value={form.languages}
              onChange={handleChange}
              placeholder="Ej: Español, Inglés, Portugués"
            />
          </div>

          <div className="form-group">
            <label>Ciudad base</label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Medellín"
            />
          </div>

          <div className="form-group">
            <label>Años de experiencia</label>
            <input
              name="experience"
              value={form.experience}
              onChange={handleChange}
              placeholder="Ej: 5 años guiando en el Área Metropolitana"
            />
          </div>
        </div>

        <div className="form-group full-width">
          <label>Biografía profesional</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={5}
            placeholder="Cuéntales a los turistas quién eres, qué zonas conoces mejor y qué hace únicos tus tours..."
          />
        </div>

        <button type="submit" className="gp-btn-save" disabled={saving}>
          {saving ? "Guardando..." : "💾 Guardar Cambios"}
        </button>
      </form>

      <style>{`
        .gp-header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
        .gp-avatar { width: 70px; height: 70px; background: linear-gradient(135deg, #ff5a3c, #ff8a75); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; flex-shrink: 0; }
        .gp-header h2 { margin: 0 0 5px 0; color: #1e293b; font-size: 1.6rem; }
        .gp-header p { margin: 0; color: #64748b; font-size: 0.9rem; }
        .gp-form { background: white; border-radius: 20px; padding: 30px; border: 1px solid #f1f5f9; }
        .gp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .form-group label { display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; }
        .form-group input, .form-group textarea { width: 100%; padding: 12px 15px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; transition: 0.2s; box-sizing: border-box; font-family: inherit; }
        .form-group input:focus, .form-group textarea:focus { border-color: #ff5a3c; outline: none; box-shadow: 0 0 0 3px rgba(255,90,60,0.1); }
        .full-width { grid-column: 1 / -1; }
        .gp-btn-save { background: #ff5a3c; color: white; border: none; padding: 14px 30px; border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: 0.3s; margin-top: 10px; }
        .gp-btn-save:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255,90,60,0.3); }
        .gp-btn-save:disabled { background: #cbd5e1; cursor: not-allowed; transform: none; box-shadow: none; }
        .gp-spinner { width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #ff5a3c; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .gp-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default GuideProfile;