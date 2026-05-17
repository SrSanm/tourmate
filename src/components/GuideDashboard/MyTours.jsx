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
 * MyTours - Lista y gestión de tours del guía autenticado.
 */
const MyTours = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myTours, setMyTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, pending: 0 });

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(
      collection(db, "tours"),
      where("guideId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const toursData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyTours(toursData);
      setStats({
        active: toursData.filter(t => t.isApproved && t.active).length,
        pending: toursData.filter(t => !t.isApproved).length
      });
      setLoading(false);
    }, (error) => {
      console.error("Error al cargar mis tours:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleVisibility = async (tourId, currentStatus) => {
    try {
      await updateDoc(doc(db, "tours", tourId), {
        active: !currentStatus,
        lastUpdate: serverTimestamp()
      });
    } catch (error) {
      alert("No se pudo actualizar la visibilidad.");
    }
  };

  const handleDelete = async (tourId) => {
    if (!window.confirm("¿Eliminar este tour permanentemente?")) return;
    try {
      await deleteDoc(doc(db, "tours", tourId));
    } catch (error) {
      alert("Error al eliminar el tour.");
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
          {/* ← useNavigate en lugar de window.location.href */}
          <button className="btn-add-tour" onClick={() => navigate('/guide/create-tour')}>
            + Crear Nuevo Tour
          </button>
        </div>
      </header>

      <div className="tours-grid-layout">
        {loading ? (
          <div className="loading-placeholder">
            <div className="spinner-tourmate"></div>
            <p>Obteniendo tus rutas...</p>
          </div>
        ) : myTours.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-art">🗺️</div>
            <h3>Aún no tienes tours publicados</h3>
            <p>Empieza a ganar dinero compartiendo lo que sabes de Medellín.</p>
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
                  alt={tour.title || tour.name}
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'; }}
                />
                {renderStatusBadge(tour)}
              </div>

              <div className="card-content">
                <div className="card-main-info">
                  <h3>{tour.title || tour.name}</h3>
                  <div className="info-meta">
                    <span>📍 {tour.location || 'Medellín'}</span>
                    <span>💰 ${Number(tour.price).toLocaleString()} COP</span>
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
                      {tour.isApproved
                        ? (tour.active ? 'Visible' : 'Oculto')
                        : 'Esperando aprobación'}
                    </span>
                  </div>

                  <div className="btn-group">
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDelete(tour.id)}
                      title="Eliminar experiencia"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <style>{`
        .my-tours-container { padding: 30px; max-width: 1200px; margin: 0 auto; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; flex-wrap: wrap; gap: 20px; }
        .title-group h1 { font-size: 2rem; color: #1e293b; margin-bottom: 5px; }
        .title-group p { color: #64748b; }
        .header-actions { display: flex; align-items: center; gap: 20px; }
        .mini-stats { background: #fff; padding: 10px 20px; border-radius: 12px; display: flex; gap: 15px; font-size: 0.9rem; border: 1px solid #e2e8f0; }
        .btn-add-tour { background: #ff5a3c; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.3s; }
        .btn-add-tour:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255,90,60,0.2); }
        .tours-grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }
        .tour-management-card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transition: 0.3s; }
        .tour-management-card:hover { transform: scale(1.02); }
        .card-image-wrapper { position: relative; height: 180px; }
        .card-image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
        .status-badge { position: absolute; top: 15px; right: 15px; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.approved { background: #dcfce7; color: #166534; }
        .status-badge.paused { background: #f1f5f9; color: #475569; }
        .card-content { padding: 20px; }
        .card-main-info h3 { margin-bottom: 10px; color: #0f172a; font-size: 1.2rem; }
        .info-meta { display: flex; flex-direction: column; gap: 5px; margin-bottom: 20px; }
        .info-meta span { color: #64748b; font-size: 0.9rem; }
        .card-actions { display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #f1f5f9; }
        .switch { position: relative; display: inline-block; width: 44px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(22px); }
        input:disabled + .slider { opacity: 0.5; cursor: not-allowed; }
        .visibility-control { display: flex; align-items: center; gap: 10px; }
        .switch-label { font-size: 0.8rem; font-weight: 600; color: #475569; max-width: 130px; }
        .btn-group { display: flex; gap: 8px; }
        .btn-icon { width: 36px; height: 36px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; font-size: 1rem; }
        .btn-icon.delete { background: #fee2e2; color: #ef4444; }
        .btn-icon:hover { opacity: 0.8; transform: translateY(-2px); }
        .loading-placeholder { grid-column: 1/-1; padding: 100px; text-align: center; color: #94a3b8; }
        .spinner-tourmate { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #ff5a3c; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        .empty-state-card { grid-column: 1/-1; text-align: center; padding: 80px; background: white; border-radius: 20px; border: 1px dashed #e2e8f0; }
        .empty-art { font-size: 3rem; margin-bottom: 15px; }
        .btn-cta-primary { background: #ff5a3c; color: white; border: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; cursor: pointer; margin-top: 15px; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MyTours;