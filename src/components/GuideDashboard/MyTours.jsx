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
 * MyTours - Vista del catálogo de experiencias del guía.
 * Integrado al layout global sin romper la estructura de navegación de TourMate.
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

    // Consulta adaptada a tu campo real de Firestore
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
    <div className="my-tours-wrapper-content">
      
      {/* CUADRO DE AVISO DE RED */}
      {errorNet && (
        <div className="network-warning-banner">
          ⚠️ <strong>Conexión bloqueada:</strong> Las peticiones están siendo canceladas por el navegador. Desactiva los escudos o extensiones AdBlock para operar correctamente.
        </div>
      )}

      {/* ENCABEZADO INTERNO */}
      <header className="tours-dash-header">
        <div className="text-header-group">
          <h1>Mis Experiencias</h1>
          <p>Gestiona el catálogo de tours que ofreces en la ciudad.</p>
        </div>
        
        <div className="actions-header-group">
          <div className="stats-box-pills">
            <span className="pill-stat dynamic-green"><strong>{stats.active}</strong> Visibles</span>
            <span className="pill-stat dynamic-amber"><strong>{stats.pending}</strong> Pendientes</span>
          </div>
          <button className="btn-create-tour-orange" onClick={() => navigate('/guide/create-tour')}>
            + Crear Nuevo Tour
          </button>
        </div>
      </header>

      {/* GRILLA PRINCIPAL */}
      <div className="tours-grid-cards-layout">
        {loading ? (
          <div className="loading-state-container">
            <div className="spinner-tourmate-ring"></div>
            <p>Sincronizando rutas en tiempo real...</p>
          </div>
        ) : myTours.length === 0 ? (
          <div className="empty-catalog-card">
            <div className="empty-icon-avatar">🗺️</div>
            <h3>Aún no tienes tours publicados</h3>
            <p>Empieza a generar ingresos compartiendo lo mejor de Medellín con el mundo.</p>
            <button className="btn-cta-orange-action" onClick={() => navigate('/guide/create-tour')}>
              Publicar mi primera ruta
            </button>
          </div>
        ) : (
          myTours.map((tour) => (
            <article key={tour.id} className="tour-management-item-card">
              <div className="card-media-box">
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

              <div className="card-data-body">
                <div className="card-main-meta-info">
                  <h3>{tour.title}</h3>
                  <div className="meta-lines-list">
                    <span>📍 {tour.location}</span>
                    <span className="price-tag-cop">💰 ${tour.price.toLocaleString('es-CO')} COP</span>
                    {tour.duration && <span>🕐 {tour.duration}</span>}
                  </div>
                </div>

                <div className="card-footer-controls">
                  <div className="visibility-switch-box">
                    <label className="switch-toggle">
                      <input
                        type="checkbox"
                        checked={!!tour.active}
                        onChange={() => toggleVisibility(tour.id, tour.active)}
                        disabled={!tour.isApproved}
                      />
                      <span className="slider-round-bar"></span>
                    </label>
                    <span className="switch-label-text">
                      {tour.isApproved ? (tour.active ? 'Visible' : 'Oculto') : 'En revisión'}
                    </span>
                  </div>

                  <div className="actions-button-wrapper">
                    <button className="btn-icon-trash-action" onClick={() => handleDelete(tour.id)} title="Eliminar definitivamente">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <style>{`
        /* Reset e integración limpia en la sección derecha del panel */
        .my-tours-wrapper-content { 
          width: 100%;
          max-width: 1140px; 
          margin: 0 auto; 
          padding: 10px 5px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        }

        /* Encabezado */
        .tours-dash-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 35px; 
          flex-wrap: wrap; 
          gap: 20px; 
        }
        .text-header-group h1 { 
          font-size: 2rem; 
          color: #0f172a; 
          margin: 0 0 6px 0; 
          font-weight: 800; 
        }
        .text-header-group p { 
          color: #64748b; 
          margin: 0;
          font-size: 0.95rem;
        }

        /* Controles superiores */
        .actions-header-group { 
          display: flex; 
          align-items: center; 
          gap: 16px; 
          flex-wrap: wrap;
        }
        .stats-box-pills { 
          background: #ffffff; 
          padding: 8px 16px; 
          border-radius: 12px; 
          display: flex; 
          gap: 16px; 
          font-size: 0.88rem; 
          border: 1px solid #e2e8f0; 
        }
        .pill-stat strong { 
          color: #0f172a; 
          font-weight: 700; 
        }
        .pill-stat.dynamic-green strong { color: #166534; }
        .pill-stat.dynamic-amber strong { color: #b45309; }

        /* Botón Crear */
        .btn-create-tour-orange { 
          background: #ff5a3c; 
          color: white; 
          border: none; 
          padding: 12px 22px; 
          border-radius: 12px; 
          font-weight: 700; 
          cursor: pointer; 
          transition: all 0.2s ease; 
          font-size: 0.9rem; 
        }
        .btn-create-tour-orange:hover { 
          background: #e04f35;
          transform: translateY(-1px);
        }

        /* Banner de Advertencia */
        .network-warning-banner { 
          background: #fff7ed; 
          border: 1px solid #ffedd5; 
          color: #c2410c; 
          padding: 14px 20px; 
          border-radius: 12px; 
          margin-bottom: 25px; 
          font-size: 0.9rem; 
        }

        /* Grilla adaptativa */
        .tours-grid-cards-layout { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
          gap: 25px; 
          width: 100%;
        }

        /* Tarjeta de diseño individual */
        .tour-management-item-card { 
          background: #ffffff; 
          border-radius: 20px; 
          overflow: hidden; 
          border: 1px solid #e2e8f0; 
          display: flex; 
          flex-direction: column; 
          transition: transform 0.2s ease, box-shadow 0.2s ease; 
        }
        .tour-management-item-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 12px 20px -5px rgba(0,0,0,0.05); 
        }

        /* Caja de imagen */
        .card-media-box { 
          position: relative; 
          height: 180px; 
          width: 100%;
          background: #f1f5f9; 
        }
        .card-media-box img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
        }

        /* Estados (Badges) */
        .status-badge { 
          position: absolute; 
          top: 12px; 
          right: 12px; 
          padding: 5px 12px; 
          border-radius: 50px; 
          font-size: 0.72rem; 
          font-weight: 800; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .status-badge.pending { background: #fef3c7; color: #92400e; }
        .status-badge.approved { background: #dcfce7; color: #166534; }
        .status-badge.paused { background: #f1f5f9; color: #475569; }

        /* Contenido de Tarjeta */
        .card-data-body { 
          padding: 20px; 
          display: flex; 
          flex-direction: column; 
          flex: 1; 
          justify-content: space-between; 
        }
        .card-main-meta-info h3 { 
          margin: 0 0 10px 0; 
          color: #1e293b; 
          font-size: 1.15rem; 
          font-weight: 700; 
          line-height: 1.4;
        }
        .meta-lines-list { 
          display: flex; 
          flex-direction: column; 
          gap: 6px; 
          margin-bottom: 20px; 
          color: #64748b; 
          font-size: 0.88rem; 
        }
        .price-tag-cop {
          font-weight: 600;
          color: #0f172a;
        }

        /* Footer de Tarjeta */
        .card-footer-controls { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding-top: 14px; 
          border-top: 1px solid #f1f5f9; 
        }
        .visibility-switch-box { 
          display: flex; 
          align-items: center; 
          gap: 10px; 
        }

        /* Custom Switch CSS */
        .switch-toggle { 
          position: relative; 
          display: inline-block; 
          width: 42px; 
          height: 22px; 
        }
        .switch-toggle input { opacity: 0; width: 0; height: 0; }
        .slider-round-bar { 
          position: absolute; 
          cursor: pointer; 
          top: 0; left: 0; right: 0; bottom: 0; 
          background-color: #cbd5e1; 
          transition: .25s; 
          border-radius: 34px; 
        }
        .slider-round-bar:before { 
          position: absolute; 
          content: ""; 
          height: 16px; 
          width: 16px; 
          left: 3px; 
          bottom: 3px; 
          background-color: white; 
          transition: .25s; 
          border-radius: 50%; 
        }
        input:checked + .slider-round-bar { background-color: #10b981; }
        input:checked + .slider-round-bar:before { transform: translateX(20px); }
        input:disabled + .slider-round-bar { opacity: 0.4; cursor: not-allowed; }
        
        .switch-label-text { 
          font-size: 0.78rem; 
          font-weight: 700; 
          color: #475569; 
          text-transform: uppercase; 
        }

        /* Botón basura */
        .btn-icon-trash-action { 
          width: 36px; 
          height: 36px; 
          border-radius: 10px; 
          border: none; 
          background: #fee2e2; 
          color: #ef4444; 
          cursor: pointer; 
          font-size: 1rem; 
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease; 
        }
        .btn-icon-trash-action:hover { background: #fca5a5; }

        /* Placeholders de carga y vacíos */
        .loading-state-container { 
          grid-column: 1/-1; 
          padding: 80px 20px; 
          text-align: center; 
          color: #94a3b8; 
        }
        .spinner-tourmate-ring { 
          width: 36px; 
          height: 36px; 
          border: 3px solid #f1f5f9; 
          border-top: 3px solid #ff5a3c; 
          border-radius: 50%; 
          animation: spinTour 0.8s linear infinite; 
          margin: 0 auto 16px; 
        }
        .empty-catalog-card { 
          grid-column: 1/-1; 
          text-align: center; 
          padding: 60px 20px; 
          background: white; 
          border-radius: 20px; 
          border: 2px dashed #e2e8f0; 
        }
        .empty-icon-avatar { font-size: 3rem; margin-bottom: 16px; }
        .empty-catalog-card h3 { font-size: 1.3rem; color: #1e293b; margin: 0 0 6px 0; }
        .empty-catalog-card p { color: #64748b; margin: 0 0 20px 0; font-size: 0.95rem; }
        .btn-cta-orange-action { 
          background: #ff5a3c; 
          color: white; 
          border: none; 
          padding: 12px 28px; 
          border-radius: 12px; 
          font-weight: 700; 
          cursor: pointer; 
          font-size: 0.95rem;
        }

        @keyframes spinTour { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MyTours;