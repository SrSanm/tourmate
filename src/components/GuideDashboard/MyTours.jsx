import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

/**
 * MyTours - Vista oficial del catálogo de experiencias de TourMate.
 */
const MyTours = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myTours, setMyTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorNet, setErrorNet] = useState(false);
  const [stats, setStats] = useState({ active: 0, pending: 0 });

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setErrorNet(false);

    // Mapeo adaptativo: Busca por 'creatorGuideId' según la estructura real de tu Firestore
    const q = query(
      collection(db, "tours"),
      where("creatorGuideId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const toursData = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            title: data.title || data.name || "Tour sin título",
            price: Number(data.price) || 0,
            location: data.location || "Medellín, Colombia",
            active: data.active ?? false,
            isApproved: data.isApproved ?? false
          };
        });

        setMyTours(toursData);
        setStats({
          active: toursData.filter(t => t.isApproved && t.active).length,
          pending: toursData.filter(t => !t.isApproved).length
        });
        setErrorNet(false);
      } catch (error) {
        console.error("Error procesando los datos de Firestore:", error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error en la conexión onSnapshot de Firebase:", error);
      setErrorNet(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleVisibility = async (tourId, currentStatus) => {
    if (!tourId) return;
    try {
      await updateDoc(doc(db, "tours", tourId), {
        active: !currentStatus,
        lastUpdate: serverTimestamp()
      });
    } catch (error) {
      alert("Error de red: No se pudo cambiar el estado del tour.");
    }
  };

  const handleDelete = async (tourId) => {
    if (!tourId) return;
    if (!window.confirm("¿Deseas eliminar este tour del sistema de forma permanente?")) return;
    
    try {
      await deleteDoc(doc(db, "tours", tourId));
    } catch (error) {
      alert("Error al intentar remover la ruta.");
    }
  };

  const renderStatusBadge = (tour) => {
    if (!tour.isApproved) return <span className="status-badge pending">⏳ En Revisión</span>;
    if (tour.active) return <span className="status-badge approved">✓ Activo</span>;
    return <span className="status-badge paused">⏸ Pausado</span>;
  };

  return (
    <div className="my-tours-container">
      
      <header className="section-header">
        <div className="title-group">
          <h1>Mis Experiencias</h1>
          <p>Gestiona el catálogo de tours que ofreces en la ciudad.</p>
        </div>
        
        <div className="header-actions">
          <div className="mini-stats">
            <span><strong>{stats.active}</strong> Visibles</span>
            <span><strong>{stats.pending}</strong> Pendientes</span>
          </div>
          <button className="btn-add-tour" onClick={() => navigate('/guide/create-tour')}>
            + Crear Nuevo Tour
          </button>
        </div>
      </header>

      {errorNet && (
        <div className="network-warning-banner">
          ⚠️ <strong>Conexión bloqueada:</strong> Detectamos que las peticiones a la base de datos están siendo canceladas. Por favor desactiva tu AdBlocker o los escudos del navegador para operar el panel.
        </div>
      )}

      <div className="tours-grid-layout">
        {loading ? (
          <div className="loading-placeholder">
            <div className="spinner-tourmate"></div>
            <p>Sincronizando rutas en tiempo real...</p>
          </div>
        ) : myTours.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-art">🗺️</div>
            <h3>Aún no tienes tours publicados</h3>
            <p>Empieza a generar ingresos compartiendo lo mejor de Medellín con el mundo.</p>
            <button className="btn-cta-primary" onClick={() => navigate('/guide/create-tour')}>
              Publicar mi primera ruta
            </button>
          </div>
        ) : (
          myTours.map((tour) => (
            <article key={tour.id} className="tour-management-card">
              <div className="card-image-wrapper">
                <img
                  src={tour.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'}
                  alt={tour.title}
                  onError={(e) => { 
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'; 
                  }}
                />
                {renderStatusBadge(tour)}
              </div>

              <div className="card-content">
                <div className="card-main-info">
                  <h3>{tour.title}</h3>
                  <div className="info-meta">
                    <span>📍 {tour.location}</span>
                    <span>💰 ${tour.price.toLocaleString('es-CO')} COP</span>
                    {tour.duration && <span>🕐 {tour.duration}</span>}
                  </div>
                </div>

                <div className="card-actions">
                  <div className="visibility-control">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={!!tour.active}
                        onChange={() => toggleVisibility(tour.id, tour.active)}
                        disabled={!tour.isApproved}
                      />
                      <span className="slider round"></span>
                    </label>
                    <span className="switch-label">
                      {tour.isApproved ? (tour.active ? 'Visible' : 'Oculto') : 'Esperando aprobación'}
                    </span>
                  </div>

                  <div className="btn-group">
                    <button className="btn-icon delete" onClick={() => handleDelete(tour.id)}>🗑</button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <style>{`
        .my-tours-container { padding: 30px; max-width: 1250px; margin: 0 auto; font-family: system-ui, sans-serif; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; flex-wrap: wrap; gap: 20px; }
        .title-group h1 { font-size: 2.2rem; color: #0f172a; margin: 0 0 6px 0; font-weight: 800; }
        .title-group p { color: #64748b; margin: 0; }
        .header-actions { display: flex; align-items: center; gap: 20px; }
        .mini-stats { background: #fff; padding: 12px 24px; border-radius: 14px; display: flex; gap: 20px; font-size: 0.92rem; border: 1px solid #e2e8f0; }
        .btn-add-tour { background: #ff5a3c; color: white; border: none; padding: 14px 26px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; font-size: 0.95rem; }
        .btn-add-tour:hover { transform: translateY(-2px); background: #f04f32; }
        .network-warning-banner { background: #fff7ed; border: 1px solid #ffedd5; color: #c2410c; padding: 16px; border-radius: 12px; margin-bottom: 30px; font-size: 0.95rem; }
        .tours-grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 30px; }
        .tour-management-card { background: white; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; display: flex; flex-direction: column; transition: transform 0.2s; }
        .tour-management-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); }
        .card-image-wrapper { position: relative; height: 200px; background: #f1f5f9; }
        .card-image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
        .status-badge { position: absolute; top: 15px; right: 15px; padding: 6px 14px; border-radius: 50px; font-size: 0.75rem; font-weight: 800; }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.approved { background: #dcfce7; color: #166534; }
        .status-badge.paused { background: #f1f5f9; color: #475569; }
        .card-content { padding: 24px; display: flex; flex-direction: column; flex: 1; justify-content: space-between; }
        .card-main-info h3 { margin: 0 0 12px 0; color: #1e293b; font-size: 1.25rem; font-weight: 700; }
        .info-meta { display: flex; flex-direction: column; gap: 6px; margin-bottom: 24px; color: #64748b; font-size: 0.9rem; }
        .card-actions { display: flex; justify-content: space-between; align-items: center; padding-top: 18px; border-top: 1px solid #f1f5f9; }
        .visibility-control { display: flex; align-items: center; gap: 12px; }
        .switch { position: relative; display: inline-block; width: 46px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(22px); }
        .switch-label { font-size: 0.8rem; font-weight: 700; color: #475569; text-transform: uppercase; }
        .btn-icon.delete { width: 40px; height: 40px; border-radius: 12px; border: none; background: #fee2e2; color: #ef4444; cursor: pointer; font-size: 1.1rem; transition: background 0.2s; }
        .btn-icon.delete:hover { background: #fca5a5; }
        .loading-placeholder { grid-column: 1/-1; padding: 100px; text-align: center; color: #94a3b8; }
        .spinner-tourmate { width: 40px; height: 40px; border: 4px solid #f1f5f9; border-top: 4px solid #ff5a3c; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
        .empty-state-card { grid-column: 1/-1; text-align: center; padding: 80px 40px; background: white; border-radius: 24px; border: 2px dashed #e2e8f0; }
        .empty-art { font-size: 3.5rem; margin-bottom: 20px; }
        .btn-cta-primary { background: #ff5a3c; color: white; border: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MyTours;