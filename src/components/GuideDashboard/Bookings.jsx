import React, { useState, useEffect, useMemo } from 'react';
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
  serverTimestamp 
} from 'firebase/firestore';
import Chat from '../../components/chat/Chat';

/**
 * COMPONENTE PRINCIPAL: Bookings
 */
const Bookings = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  // Estados principales
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('Nuevas');
  
  // Controles de búsqueda y ordenación
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  
  // Modales independientes: Detalles y Chat directo
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeChatBooking, setActiveChatBooking] = useState(null); 
  
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const isGuide = profile?.role === 'guide';

  useEffect(() => {
    if (!user) {
      setError("No se detectó una sesión activa de usuario.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let q;

    try {
      if (isGuide) {
        q = query(
          collection(db, "bookings"),
          where("status", "in", ["published", "pending", "confirmed", "paid"])
        );
      } else {
        q = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid)
        );
      }
    } catch (err) {
      console.error("Error al estructurar la query de Firestore:", err);
      setError("Error interno al configurar la consulta de datos.");
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const data = snapshot.docs.map(doc => {
          const rawData = doc.data();
          return {
            id: doc.id,
            ...rawData,
            totalPrice: Number(rawData.totalPrice) || 0,
            date: rawData.date || "Fecha no estipulada",
            tourTitle: rawData.tourTitle || "Tour por Medellín"
          };
        });

        if (isGuide) {
          const guideData = data.filter(b => 
            !b.guideId || b.guideId === "" || b.guideId === user.uid
          );
          setBookings(guideData);
        } else {
          setBookings(data);
        }
        setError(null);
      } catch (mappingError) {
        console.error("Error procesando los documentos:", mappingError);
        setError("Ocurrió un error al procesar la lista de reservas.");
      } finally {
        setLoading(false);
      }
    }, (firebaseError) => {
      console.error("Error de conexión con Firebase Firestore:", firebaseError);
      setError("Fallo de conexión de red con el servidor de base de datos.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isGuide]);

  const processedBookings = useMemo(() => {
    let result = bookings.filter(b => {
      const status = b.status?.toLowerCase() || 'pending';
      if (filter === 'Nuevas') {
        return status === 'published' || status === 'pending' || status === 'pendiente';
      }
      if (filter === 'En Curso') {
        return status === 'confirmed' || status === 'approved';
      }
      if (filter === 'Historial') {
        return status === 'paid';
      }
      return false;
    });

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(b => 
        b.tourTitle.toLowerCase().includes(term) ||
        b.id.toLowerCase().includes(term) ||
        (b.touristName && b.touristName.toLowerCase().includes(term)) ||
        (b.guideName && b.guideName.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'price-high') return b.totalPrice - a.totalPrice;
      if (sortBy === 'price-low') return a.totalPrice - b.totalPrice;
      return 0;
    });

    return result;
  }, [bookings, filter, searchTerm, sortBy]);

  const panelMetrics = useMemo(() => {
    const bolsaCount = bookings.filter(b => !b.guideId && (b.status === 'published' || b.status === 'pending')).length;
    const activosCount = bookings.filter(b => b.guideId === user?.uid && ['confirmed', 'approved'].includes(b.status)).length;
    const totalCaja = bookings
      .filter(b => b.guideId === user?.uid && b.status === 'paid')
      .reduce((acc, curr) => acc + curr.totalPrice, 0);

    return {
      bolsa: bolsaCount,
      activos: activosCount,
      ingresos: totalCaja.toLocaleString('es-CO')
    };
  }, [bookings, user]);

  const handleNavigateToCheckout = (id, total) => {
    if (!id || total <= 0) {
      alert("La reserva no cuenta con los parámetros de facturación válidos.");
      return;
    }
    navigate(`/checkout/${id}?amount=${total}`);
  };

  const handleAcceptService = async (id) => {
    if (!id) return;
    if (!window.confirm("¿Estás seguro de que deseas aceptar y tomar esta asignación?")) return;

    setActionLoadingId(id);
    try {
      const bookingRef = doc(db, "bookings", id);
      await updateDoc(bookingRef, {
        status: 'confirmed',
        guideId: user.uid,
        guideName: user.displayName || profile?.name || "Guía Profesional asignado",
        acceptedAt: serverTimestamp()
      });
      alert("Asignación confirmada. El servicio fue movido a la pestaña de 'En Curso'.");
      setFilter('En Curso');
    } catch (err) {
      console.error("Fallo crítico al actualizar documento de reserva:", err);
      alert("Hubo un error al intentar registrar el servicio. Inténtalo de nuevo.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bookings-loading-wrapper">
        <div className="spinner-element"></div>
        <p>Sincronizando con los servidores de TourMate...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bookings-error-wrapper">
        <div className="error-icon-box">⚠️</div>
        <h3>Error de Sincronización</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="retry-view-btn">Reintentar Carga</button>
      </div>
    );
  }

  const tabsArray = ['Nuevas', 'En Curso', 'Historial'];

  return (
    <div className="bookings-dashboard-container">
      
      {/* SECCIÓN DE MÉTRICAS GENERALES */}
      <section className="metrics-layout-grid" aria-label="Estadísticas de reservas">
        <div className="metric-item-card variant-blue">
          <div className="metric-visual-icon">🌍</div>
          <div className="metric-content-data">
            <span className="metric-title-lbl">{isGuide ? "BOLSA DISPONIBLE" : "TOURS SOLICITADOS"}</span>
            <h2 className="metric-value-display">{panelMetrics.bolsa} tours</h2>
          </div>
        </div>

        <div className="metric-item-card variant-orange">
          <div className="metric-visual-icon">💼</div>
          <div className="metric-content-data">
            <span className="metric-title-lbl">{isGuide ? "SERVICIOS ACTIVOS" : "PLANES EN RUTA"}</span>
            <h2 className="metric-value-display">{panelMetrics.activos} en ruta</h2>
          </div>
        </div>

        <div className="metric-item-card variant-green">
          <div className="metric-visual-icon">💰</div>
          <div className="metric-content-data">
            <span className="metric-title-lbl">{isGuide ? "FACTURACIÓN TOTAL" : "INVERSIÓN TOTAL"}</span>
            <h2 className="metric-value-display">${panelMetrics.ingresos} COP</h2>
          </div>
        </div>
      </section>

      {/* FILTROS, CONTROLES DE ORDENAMIENTO Y BÚSQUEDA */}
      <section className="controls-bar-layout">
        <div className="tabs-navigation-list">
          {tabsArray.map(tab => (
            <button
              key={tab}
              className={`navigation-tab-trigger ${filter === tab ? 'state-active' : ''}`}
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="search-and-sort-group">
          <input
            type="text"
            className="search-input-control"
            placeholder="Buscar por tour, turista o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select 
            className="sort-dropdown-control"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recent">Más recientes primero</option>
            <option value="oldest">Más antiguos primero</option>
            <option value="price-high">Precio: Mayor a Menor</option>
            <option value="price-low">Precio: Menor a Mayor</option>
          </select>
        </div>
      </section>

      {/* CONTENEDOR PRINCIPAL DE RESULTADOS */}
      <main className="bookings-results-view">
        {processedBookings.length === 0 ? (
          <div className="empty-results-fallback">
            <div className="fallback-illustration">📂</div>
            <h4>Sin開coincidencias disponibles</h4>
            <p>No se encontraron registros activos en la sección de <strong>{filter}</strong> con los filtros actuales.</p>
          </div>
        ) : (
          <div className="bookings-cards-grid-system">
            {processedBookings.map(item => (
              <article key={item.id} className={`booking-render-card theme-${item.status}`}>
                
                <div className="card-top-identity">
                  <span className="status-badge-indicator">
                    {item.status === 'published' && 'Bolsa Abierta'}
                    {item.status === 'pending' && 'Esperando Confirmación'}
                    {item.status === 'confirmed' && 'Por Pagar'}
                    {item.status === 'approved' && 'Aprobado'}
                    {item.status === 'paid' && 'Completado'}
                  </span>
                  <span className="booking-id-tag">ID: {item.id.substring(0, 8).toUpperCase()}</span>
                </div>

                <div className="card-body-core">
                  {item.tourImage && (
                    <div className="card-cover-wrapper">
                      <img src={item.tourImage} alt={item.tourTitle} className="card-cover-img" />
                    </div>
                  )}
                  <h3 className="tour-title-heading">{item.tourTitle}</h3>
                  
                  <div className="tour-specs-list">
                    <div className="spec-row-item">
                      <span className="spec-icon">📅</span>
                      <span className="spec-text">Fecha programada: {item.date}</span>
                    </div>
                    <div className="spec-row-item">
                      <span className="spec-icon">👥</span>
                      <span className="spec-text">Asistentes: {item.numPersons || item.guests || 1} personas</span>
                    </div>
                    {isGuide ? (
                      <div className="spec-row-item">
                        <span className="spec-icon">👤</span>
                        <span className="spec-text">Cliente: {item.touristName || "Usuario Registrado"}</span>
                      </div>
                    ) : (
                      item.guideName && (
                        <div className="spec-row-item">
                          <span className="spec-icon">🤠</span>
                          <span className="spec-text">Guía local: {item.guideName}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="card-action-footer">
                  <div className="price-stack-container">
                    <span className="price-stack-lbl">Monto Total</span>
                    <span className="price-stack-val">${item.totalPrice.toLocaleString('es-CO')} COP</span>
                  </div>

                  <div className="footer-buttons-group">
                    <button 
                      className="action-btn-secondary"
                      onClick={() => setSelectedBooking(item)}
                    >
                      Detalles
                    </button>

                    {/* BOTÓN DIRECTO DE CHAT PARA RESERVAS PAGADAS */}
                    {item.status === 'paid' && (
                      <button 
                        className="action-btn-chat-direct"
                        onClick={() => setActiveChatBooking(item)}
                      >
                        💬 Chat
                      </button>
                    )}

                    {/* Acciones para Turista */}
                    {!isGuide && (item.status === 'confirmed' || item.status === 'approved') && (
                      <button 
                        className="action-btn-primary variant-pay"
                        onClick={() => handleNavigateToCheckout(item.id, item.totalPrice)}
                      >
                        Pagar Seguro
                      </button>
                    )}

                    {/* Acciones para Guía */}
                    {isGuide && (!item.guideId) && (item.status === 'published' || item.status === 'pending') && (
                      <button 
                        className="action-btn-primary variant-accept"
                        disabled={actionLoadingId === item.id}
                        onClick={() => handleAcceptService(item.id)}
                      >
                        {actionLoadingId === item.id ? 'Procesando...' : 'Aceptar Tour'}
                      </button>
                    )}
                  </div>
                </div>

              </article>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DETALLADO CLÁSICO (FICHA TÉCNICA) */}
      {selectedBooking && (
        <div className="modal-overlay-shroud" onClick={() => setSelectedBooking(null)}>
          <div className="modal-content-surface" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header-section">
              <h3>Ficha Técnica de Reserva</h3>
              <button className="close-modal-x" onClick={() => setSelectedBooking(null)}>&times;</button>
            </header>
            <main className="modal-body-content">
              <div className="modal-data-grid">
                <div className="grid-cell-full">
                  <label>Título del Recorrido</label>
                  <p>{selectedBooking.tourTitle}</p>
                </div>
                <div>
                  <label>Identificador Único</label>
                  <p>{selectedBooking.id}</p>
                </div>
                <div>
                  <label>Estado del Registro</label>
                  <p style={{textTransform: 'uppercase', fontWeight: 'bold'}}>{selectedBooking.status}</p>
                </div>
                <div>
                  <label>Fecha de Operación</label>
                  <p>{selectedBooking.date}</p>
                </div>
                <div>
                  <label>Cupos Reservados</label>
                  <p>{selectedBooking.numPersons || selectedBooking.guests || 1} Personas</p>
                </div>
              </div>
            </main>
            <footer className="modal-footer-section">
              <button className="action-btn-secondary" onClick={() => setSelectedBooking(null)}>Cerrar Ficha</button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL EXCLUSIVO DE CHAT FLOTANTE DIRECTO */}
      {activeChatBooking && (
        <div className="modal-overlay-shroud" onClick={() => setActiveChatBooking(null)}>
          <div className="modal-content-surface chat-modal-size" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header-section chat-purple-header">
              <div className="chat-header-identity">
                <span className="chat-avatar-circle">💬</span>
                <div>
                  <h3>Conexión del Recorrido</h3>
                  <p className="chat-subtitle-user">
                    {isGuide ? `Turista: ${activeChatBooking.touristName || 'Usuario'}` : `Guía: ${activeChatBooking.guideName || 'Asignado'}`}
                  </p>
                </div>
              </div>
              <button className="close-modal-x white-text" onClick={() => setActiveChatBooking(null)}>&times;</button>
            </header>
            <main className="modal-body-chat-direct">
              <Chat bookingId={activeChatBooking.id} />
            </main>
          </div>
        </div>
      )}

      {/* ESTILOS ENCAPSULADOS */}
      <style>{`
        .bookings-dashboard-container { padding: 30px; background-color: #f8fafc; min-height: 100vh; font-family: system-ui, -apple-system, sans-serif; }
        .metrics-layout-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 35px; }
        .metric-item-card { background: #fff; padding: 24px; border-radius: 16px; display: flex; align-items: center; gap: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .metric-visual-icon { font-size: 2.2rem; padding: 12px; border-radius: 14px; }
        .variant-blue .metric-visual-icon { background: #eff6ff; }
        .variant-orange .metric-visual-icon { background: #fff7ed; }
        .variant-green .metric-visual-icon { background: #f0fdf4; }
        .metric-title-lbl { font-size: 0.75rem; color: #64748b; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
        .metric-value-display { font-size: 1.6rem; margin: 0; color: #0f172a; font-weight: 800; }
        .controls-bar-layout { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
        .tabs-navigation-list { display: flex; background: #e2e8f0; padding: 4px; border-radius: 12px; gap: 4px; }
        .navigation-tab-trigger { border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; background: transparent; color: #475569; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
        .navigation-tab-trigger.state-active { background: #fff; color: #ff5a3c; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .search-and-sort-group { display: flex; gap: 12px; flex-wrap: wrap; }
        .search-input-control { padding: 10px 16px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.9rem; width: 260px; outline: none; }
        .search-input-control:focus { border-color: #ff5a3c; }
        .sort-dropdown-control { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; font-size: 0.9rem; color: #334155; outline: none; cursor: pointer; }
        .bookings-cards-grid-system { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
        .booking-render-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 280px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: all 0.2s; overflow: hidden; }
        .booking-render-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .card-top-identity { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .status-badge-indicator { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 50px; }
        
        .theme-published { border-top: 4px solid #10b981; }
        .theme-published .status-badge-indicator { background: #d1fae5; color: #065f46; }
        .theme-pending { border-top: 4px solid #f59e0b; }
        .theme-pending .status-badge-indicator { background: #fef3c7; color: #92400e; }
        .theme-confirmed { border-top: 4px solid #3b82f6; }
        .theme-confirmed .status-badge-indicator { background: #dbeafe; color: #1e40af; }
        .theme-approved { border-top: 4px solid #06b6d4; }
        .theme-approved .status-badge-indicator { background: #ecfeff; color: #083344; }
        .theme-paid { border-top: 4px solid #7c3aed; }
        .theme-paid .status-badge-indicator { background: #f3e8ff; color: #6d28d9; }
        
        .booking-id-tag { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }
        .card-cover-wrapper { width: 100%; height: 130px; border-radius: 12px; overflow: hidden; margin-bottom: 14px; }
        .card-cover-img { width: 100%; height: 100%; object-fit: cover; }
        .tour-title-heading { font-size: 1.2rem; margin: 0 0 12px 0; color: #1e293b; font-weight: 700; }
        .tour-specs-list { display: flex; flex-direction: column; gap: 6px; }
        .spec-row-item { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: #64748b; }
        .card-action-footer { border-top: 1px solid #f1f5f9; margin-top: 20px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
        .price-stack-lbl { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; display: block; font-weight: 600; }
        .price-stack-val { font-size: 1.2rem; color: #0f172a; font-weight: 800; }
        .footer-buttons-group { display: flex; gap: 8px; }
        
        /* BOTONES */
        .action-btn-secondary { background: #f1f5f9; border: none; padding: 10px 14px; border-radius: 10px; font-weight: 700; color: #475569; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; }
        .action-btn-secondary:hover { background: #e2e8f0; }
        
        .action-btn-chat-direct { background: #7c3aed; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 700; color: #fff; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; }
        .action-btn-chat-direct:hover { background: #6d28d9; }
        
        .action-btn-primary { border: none; padding: 10px 16px; border-radius: 10px; font-weight: 700; color: #fff; cursor: pointer; font-size: 0.85rem; transition: opacity 0.2s; }
        .action-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .variant-pay { background: #10b981; }
        .variant-accept { background: #3b82f6; }

        /* MODALES */
        .modal-overlay-shroud { position: fixed; top:0; left:0; width:100vw; height:100vh; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content-surface { background: #fff; width: 90%; max-width: 500px; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; animation: modalSlide 0.2s ease-out; }
        
        /* MODAL EXCLUSIVO DE CHAT */
        .modal-content-surface.chat-modal-size { max-width: 450px; height: 80vh; }
        .chat-purple-header { background: #7c3aed; color: white; border: none; }
        .chat-header-identity { display: flex; align-items: center; gap: 12px; }
        .chat-avatar-circle { font-size: 1.5rem; background: rgba(255,255,255,0.2); padding: 6px; border-radius: 50%; }
        .chat-purple-header h3 { color: white; margin: 0; font-size: 1.1rem; }
        .chat-subtitle-user { margin: 2px 0 0 0; font-size: 0.8rem; color: #e9d5ff; }
        .white-text { color: white !important; }
        .modal-body-chat-direct { flex: 1; padding: 12px; background: #f8fafc; overflow-y: auto; display: flex; flex-direction: column; }
        
        .modal-header-section { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .close-modal-x { background: none; border:none; font-size: 1.6rem; cursor: pointer; color: #94a3b8; }
        .modal-body-content { padding: 24px; }
        .modal-data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .grid-cell-full { grid-column: 1 / -1; }
        .modal-data-grid label { font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px; }
        .modal-data-grid p { margin: 0; color: #1e293b; font-size: 0.95rem; font-weight: 500; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #f1f5f9; }
        .modal-footer-section { padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #f8fafc; }
        @keyframes modalSlide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default Bookings;