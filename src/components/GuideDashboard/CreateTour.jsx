import React, { useState, useRef } from 'react';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ModalNotificacion from '../../components/ModalNotificacion';
import { useAuth } from '../../context/AuthContext';

const CreateTour = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);
  const [preview, setPreview] = useState(null);

  const [form, setForm] = useState({
    title: '',
    price: '',
    duration: '',
    capacity: '10',
    category: 'Cultura y Patrimonio',
    description: '',
    image: ''
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1048576) {
      setNotif({ type: 'warning', title: 'Imagen muy pesada', message: 'El límite es 1MB para optimizar la base de datos.' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setForm(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentUser = user || auth.currentUser;

    if (!currentUser) {
      setNotif({ type: 'error', title: 'Acceso denegado', message: 'Debes iniciar sesión para publicar.' });
      return;
    }
    if (!form.title || !form.price || !form.image) {
      setNotif({ type: 'warning', title: 'Faltan campos', message: 'Título, precio e imagen son obligatorios.' });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "tours"), {
        title: form.title,
        price: Number(form.price),
        duration: form.duration,
        capacity: Number(form.capacity),
        category: form.category,
        description: form.description,
        image: form.image,
        creatorGuideId: currentUser.uid, 
        guideName: currentUser.displayName || 'Guía TourMate',
        rating: 5.0,
        isApproved: false,   
        active: false,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setNotif({ type: 'success', title: '¡Tour enviado a revisión!', message: 'El administrador revisará tu experiencia pronto.' });
      setTimeout(() => navigate('/guide/my-tours'), 2000);
    } catch (error) {
      console.error("Error Firestore:", error);
      setNotif({ type: 'error', title: 'Error al guardar', message: 'Verifica los permisos de Firestore y vuelve a intentarlo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ct-container">
      <div className="ct-card">
        <header className="ct-header">
          <h1>Publicar Nueva Experiencia</h1>
          <p>Diseña una ruta inolvidable. Los campos con * son obligatorios.</p>
        </header>

        <form onSubmit={handleSubmit} className="ct-form-grid">
          <div className="ct-upload-section">
            <label className="ct-label">Imagen de Portada*</label>
            <div
              className={`ct-dropzone ${preview ? 'has-preview' : ''}`}
              style={{ backgroundImage: preview ? `url(${preview})` : 'none' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {!preview && (
                <div className="ct-placeholder">
                  <span className="icon">📸</span>
                  <p>Haz clic para subir una foto</p>
                  <small>Máximo 1MB · JPG / PNG</small>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImage}
              style={{ display: 'none' }}
            />
            {preview && (
              <button
                type="button"
                className="ct-btn-remove-img"
                onClick={() => { setPreview(null); setForm(prev => ({ ...prev, image: '' })); }}
              >
                ✕ Cambiar imagen
              </button>
            )}
          </div>

          <div className="ct-inputs-section">
            <div className="ct-group full">
              <label>Título de la Experiencia*</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="Ej: Tour de Café y Fincas en Envigado" required />
            </div>

            <div className="ct-row">
              <div className="ct-group">
                <label>Precio (COP)*</label>
                <input name="price" type="number" min="0" value={form.price} onChange={handleChange} placeholder="80000" required />
              </div>
              <div className="ct-group">
                <label>Duración</label>
                <input name="duration" value={form.duration} onChange={handleChange} placeholder="Ej: 4 horas" />
              </div>
              <div className="ct-group">
                <label>Cupos máx.</label>
                <input name="capacity" type="number" min="1" value={form.capacity} onChange={handleChange} />
              </div>
            </div>

            <div className="ct-group full">
              <label>Categoría Principal</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="Cultura y Patrimonio">🏛️ Cultura y Patrimonio</option>
                <option value="Gastronomía">🍲 Gastronomía</option>
                <option value="Naturaleza">🌿 Naturaleza y Aventura</option>
                <option value="Vida Nocturna">💃 Vida Nocturna</option>
              </select>
            </div>

            <div className="ct-group full">
              <label>Descripción del Itinerario</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows="5" placeholder="¿Qué hace que esta ruta sea única? Describe los puntos clave..." />
            </div>

            <button type="submit" className="ct-btn-submit" disabled={loading}>
              {loading ? <span className="loader"></span> : "Enviar a Revisión"}
            </button>
            <p className="ct-hint">⏳ Tu tour será publicado después de ser aprobado por el administrador.</p>
          </div>
        </form>
      </div>

      {notif && <ModalNotificacion {...notif} onClose={() => setNotif(null)} />}

      <style>{`
        .ct-container { padding: 20px; max-width: 1100px; margin: 0 auto; }
        .ct-card { background: white; border-radius: 24px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; }
        .ct-header { margin-bottom: 35px; }
        .ct-header h1 { font-size: 2.2rem; font-weight: 900; color: #1e293b; margin: 0; }
        .ct-header p { color: #64748b; margin-top: 8px; }
        .ct-form-grid { display: grid; grid-template-columns: 300px 1fr; gap: 40px; }
        .ct-label { display: block; font-size: 0.85rem; font-weight: 800; color: #475569; margin-bottom: 12px; }
        .ct-dropzone { width: 100%; height: 380px; border: 2px dashed #cbd5e1; border-radius: 20px; cursor: pointer; transition: 0.3s; background-size: cover; background-position: center; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .ct-dropzone:hover { border-color: #ff5a3c; background-color: #fffaf9; }
        .ct-dropzone.has-preview { border: none; }
        .ct-placeholder { text-align: center; padding: 40px 20px; color: #94a3b8; }
        .ct-placeholder .icon { font-size: 2.5rem; display: block; margin-bottom: 15px; }
        .ct-btn-remove-img { margin-top: 10px; width: 100%; background: #fee2e2; color: #ef4444; border: none; border-radius: 10px; padding: 8px; cursor: pointer; font-weight: 600; }
        .ct-inputs-section { display: flex; flex-direction: column; gap: 20px; }
        .ct-row { display: grid; grid-template-columns: 1.5fr 1fr 0.8fr; gap: 15px; }
        .ct-group label { display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; }
        .ct-group input, .ct-group select, .ct-group textarea { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; transition: 0.2s; box-sizing: border-box; }
        .ct-group input:focus, .ct-group textarea:focus { border-color: #ff5a3c; outline: none; box-shadow: 0 0 0 4px rgba(255,90,60,0.1); }
        .ct-btn-submit { background: #ff5a3c; color: white; border: none; padding: 18px; border-radius: 16px; font-size: 1.05rem; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .ct-btn-submit:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(255,90,60,0.3); }
        .ct-btn-submit:disabled { background: #cbd5e1; cursor: not-allowed; transform: none; box-shadow: none; }
        .ct-hint { color: #94a3b8; font-size: 0.8rem; text-align: center; margin: 0; }
        @media (max-width: 900px) { .ct-form-grid { grid-template-columns: 1fr; } .ct-dropzone { height: 250px; } }
      `}</style>
    </div>
  );
};

export default CreateTour;