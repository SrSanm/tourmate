import React, { useState } from 'react';
import { db, auth } from '../../firebase/firebaseConfig'; // Ajusta la ruta según tu carpeta
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ModalNotificacion from '../../components/ModalNotificacion';

const CreateTour = () => {
  const navigate = useNavigate();
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
    if (file) {
      if (file.size > 1048576) {
        setNotif({ type: 'warning', title: 'Imagen muy pesada', message: 'El límite es 1MB para optimizar la base de datos.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        setForm({ ...form, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
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
        ...form,
        price: Number(form.price),
        capacity: Number(form.capacity),
        guideId: user.uid,
        guideName: user.displayName || 'Guía TourMate',
        rating: 5.0,
        createdAt: serverTimestamp()
      });

      setNotif({ type: 'success', title: '¡Publicación Exitosa!', message: 'Tu experiencia ya es visible en Medellín.' });
      
      setTimeout(() => navigate('/guide/my-tours'), 2000);
    } catch (error) {
      console.error("Error Firestore:", error);
      setNotif({ type: 'error', title: 'Error de permisos', message: 'Asegúrate de haber actualizado las reglas en Firebase Console.' });
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
          {/* LADO IZQUIERDO: IMAGEN */}
          <div className="ct-upload-section">
            <label className="ct-label">Imagen de Portada (Base64 Optimizada)*</label>
            <div className={`ct-dropzone ${preview ? 'has-preview' : ''}`} style={{ backgroundImage: `url(${preview})` }}>
              {!preview && (
                <div className="ct-placeholder">
                  <span className="icon">📸</span>
                  <p>Arrastra o haz clic para subir foto</p>
                  <small>Máximo 1MB - Formato JPG/PNG</small>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleImage} hidden />
            </div>
          </div>

          {/* LADO DERECHO: INPUTS */}
          <div className="ct-inputs-section">
            <div className="ct-group full">
              <label>Título de la Experiencia*</label>
              <input name="title" value={form.title} onChange={handleChange} placeholder="Ej: Tour de Café y Fincas en Envigado" required />
            </div>

            <div className="ct-row">
              <div className="ct-group">
                <label>Precio (COP)*</label>
                <input name="price" type="number" value={form.price} onChange={handleChange} placeholder="Precio por persona" required />
              </div>
              <div className="ct-group">
                <label>Duración</label>
                <input name="duration" value={form.duration} onChange={handleChange} placeholder="Ej: 4 horas" />
              </div>
              <div className="ct-group">
                <label>Cupos</label>
                <input name="capacity" type="number" value={form.capacity} onChange={handleChange} placeholder="10" />
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
              {loading ? <span className="loader"></span> : "Publicar Experiencia en Medellín"}
            </button>
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
        
        .ct-dropzone { width: 100%; height: 380px; border: 2px dashed #cbd5e1; border-radius: 20px; position: relative; cursor: pointer; transition: 0.3s; background-size: cover; background-position: center; overflow: hidden; }
        .ct-dropzone:hover { border-color: #ff5a3c; background-color: #fffaf9; }
        .ct-dropzone.has-preview { border: none; }
        
        .ct-placeholder { text-align: center; padding: 40px 20px; height: 100%; display: flex; flex-direction: column; justify-content: center; color: #94a3b8; }
        .ct-placeholder .icon { font-size: 2.5rem; display: block; margin-bottom: 15px; }
        
        .ct-inputs-section { display: flex; flex-direction: column; gap: 20px; }
        .ct-row { display: grid; grid-template-columns: 1.5fr 1fr 0.8fr; gap: 15px; }
        .ct-group label { display: block; font-size: 0.85rem; font-weight: 700; color: #64748b; margin-bottom: 8px; }
        .ct-group input, .ct-group select, .ct-group textarea { width: 100%; padding: 14px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; transition: 0.2s; }
        .ct-group input:focus { border-color: #ff5a3c; outline: none; box-shadow: 0 0 0 4px rgba(255,90,60,0.1); }

        .ct-btn-submit { background: #ff5a3c; color: white; border: none; padding: 18px; border-radius: 16px; font-size: 1.05rem; font-weight: 800; cursor: pointer; margin-top: 15px; transition: 0.3s; }
        .ct-btn-submit:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(255,90,60,0.3); }
        .ct-btn-submit:disabled { background: #cbd5e1; cursor: not-allowed; }

        @media (max-width: 900px) {
          .ct-form-grid { grid-template-columns: 1fr; }
          .ct-dropzone { height: 250px; }
        }
      `}</style>
    </div>
  );
};

export default CreateTour;