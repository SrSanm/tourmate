import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase/firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

/**
 * Bookings - Gestión de reservas desde el lado del guía.
 * Permite aprobar, confirmar, completar o rechazar reservas.
 */
const Bookings = () => {
  const { user } = useAuth();
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Nuevas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, "bookings"),
      where("guideId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllBookings(data);
      setLoading(false);
    }, (error) => {
      console.error("Error en Snapshot:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredAndSorted = useMemo(() => {
    let result = allBookings.filter(item => {
      const s = item.status?.toLowerCase();
      const matchesTab =
        activeTab === 'Nuevas'    ? s === 'pending' :
        activeTab === 'En Curso'  ? (s === 'confirmed' || s === 'paid') :
        activeTab === 'Historial' ? (s === 'completed' || s === 'cancelled') : false;

      const matchesSearch =
        item.tourTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesTab && matchesSearch;
    });

    return result.sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return sortOrder === 'desc' ? tb - ta : ta - tb;
    });
  }, [allBookings, activeTab, searchTerm, sortOrder]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, "bookings", id), {
        status: newStatus,
        lastModification: serverTimestamp()
      });
      setSelectedBooking(null);
    } catch (error) {
      alert("Error al actualizar el estado del servicio.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este registro del historial?")) return;
    try {
      await deleteDoc(doc(db, "bookings", id));
      setSelectedBooking(null);
    } catch (err) {
      alert("No se pudo eliminar.");
    }
  };

  const stats = {
    pending:     allBookings.filter(b => b.status === 'pending').length,
    active:      allBookings.filter(b => b.status === 'confirmed' || b.status === 'paid').length,
    totalIncome: allBookings
      .filter(b => b.status === 'paid' || b.status === 'completed')
      .reduce((acc, b) => acc + (Number(b.totalPrice) || 0), 0)
  };

  const statusLabel = (status) => {
    const map = { pending: 'Pendiente', confirmed: 'Confirmado', paid: 'Pagado', completed: 'Completado', cancelled: 'Cancelado' };
    return map[status] || status;
  };

  if (loading) return (
    <div className="tm-loading-state">
      <div className="tm-spinner"></div>
      <p>Sincronizando tus rutas en Medellín...</p>
    </div>
  );

  return (
    <div className="tm-bookings-page">
      {/* 1. MÉTRICAS */}
      <section className="tm-metrics-grid">
        <div className="tm-metric-item orange">
          <div className="metric-icon">📂</div>
          <div className="metric-text">
            <span className="label">Por Aprobar</span>
            <span className="value">{stats.pending}</span>
          </div>
        </div>
        <div className="tm-metric-item green">
          <div className="metric-icon">🚀</div>
          <div className="metric-text">
            <span className="label">Servicios Activos</span>
            <span className="value">{stats.active}</span>
          </div>
        </div>
        <div className="tm-metric-item blue">
          <div className="metric-icon">📈</div>
          <div className="metric-text">
            <span className="label">Ingresos Generados</span>
            <span className="value">${stats.totalIncome.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </section>

      {/* 2. BARRA DE CONTROL */}
      <div className="tm-control-bar">
        <div className="tm-tabs-navigation">
          {['Nuevas', 'En Curso', 'Historial'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === 'Nuevas' && stats.pending > 0 && (
                <span className="tab-badge">{stats.pending}</span>
              )}
            </button>
          ))}
        </div>

        <div className="tm-search-wrapper">
          <input
            type="text"
            placeholder="Buscar por tour o ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="sort-select"
        >
          <option value="desc">Más recientes primero</option>
          <option value="asc">Más antiguas primero</option>
        </select>
      </div>

      {/* 3. LISTADO */}
      <main className="tm-bookings-main">
        {filteredAndSorted.length === 0 ? (
          <div className="empty-tab-state">
            <p>No hay reservas en <strong>{activeTab}</strong>.</p>
            {activeTab === 'Nuevas' && <span>Cuando un turista solicite uno de tus tours, aparecerá aquí.</span>}
          </div>
        ) : (
          <div className="tm-grid">
            {filteredAndSorted.map(item => (
              <div key={item.id} className={`tm-booking-card st-${item.status}`}>
                <header className="card-top">
                  <span className={`status-pill ${item.status}`}>{statusLabel(item.status)}</span>
                  <span className="id-label">#{item.id.slice(-6).toUpperCase()}</span>
                </header>

                <div className="card-body">
                  <h3 className="tour-title">{item.tourTitle || "Experiencia TourMate"}</h3>
                  <div className="info-group">
                    <div className="info-item">
                      <span className="i-icon">👥</span>
                      <span>{item.numPersons || item.people || 1} personas</span>
                    </div>
                    {item.date && (
                      <div className="info-item">
                        <span className="i-icon">📅</span>
                        <span>{item.date}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <span className="i-icon">🆔</span>
                      <span>Turista: {(item.userId || item.touristId || '—').slice(0, 12)}...</span>
                    </div>
                  </div>
                </div>

                <footer className="card-footer">
                  <div className="price-display">
                    <span className="p-label">Total</span>
                    <span className="p-value">${(Number(item.totalPrice) || 0).toLocaleString('es-CO')} COP</span>
                  </div>
                  <button className="btn-details" onClick={() => setSelectedBooking(item)}>
                    Ver Detalles
                  </button>
                </footer>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 4. MODAL DE DETALLES */}
      {selectedBooking && (
        <div className="tm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedBooking(null)}>
          <div className="tm-modal-content">
            <button className="close-modal" onClick={() => setSelectedBooking(null)}>×</button>
            <h2>Detalle de la Reserva</h2>
            <hr />
            <div className="modal-data">
              <p><strong>Tour:</strong> {selectedBooking.tourTitle || '—'}</p>
              <p><strong>ID:</strong> <code>{selectedBooking.id}</code></p>
              <p><strong>Estado:</strong> <span className={`status-pill ${selectedBooking.status}`}>{statusLabel(selectedBooking.status)}</span></p>
              <p><strong>Personas:</strong> {selectedBooking.numPersons || selectedBooking.people || 1}</p>
              <p><strong>Fecha del tour:</strong> {selectedBooking.date || "Pendiente por confirmar"}</p>
              <p><strong>Total:</strong> ${Number(selectedBooking.totalPrice || 0).toLocaleString('es-CO')} COP</p>
            </div>

            <div className="modal-actions">
              {selectedBooking.status === 'pending' && (
                <>
                  <button className="btn-approve-big" onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}>
                    ✓ Aceptar y Confirmar Servicio
                  </button>
                  <button className="btn-cancel-big" onClick={() => handleUpdateStatus(selectedBooking.id, 'cancelled')}>
                    ✕ Rechazar Solicitud
                  </button>
                </>
              )}
              {selectedBooking.status === 'confirmed' && (
                <p className="status-notice">⏳ Esperando que el turista realice el pago.</p>
              )}
              {selectedBooking.status === 'paid' && (
                <button className="btn-complete-big" onClick={() => handleUpdateStatus(selectedBooking.id, 'completed')}>
                  🏁 Finalizar Servicio con Éxito
                </button>
              )}
              {(selectedBooking.status === 'completed' || selectedBooking.status === 'cancelled') && (
                <button className="btn-delete-big" onClick={() => handleDelete(selectedBooking.id)}>
                  🗑 Eliminar del Registro
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tm-bookings-page { padding: 30px; background: #f8fafc; min-height: 100vh; }
        .tm-metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .tm-metric-item { background: white; padding: 25px; border-radius: 20px; display: flex; align-items: center; gap: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border-bottom: 4px solid transparent; transition: 0.3s; }
        .tm-metric-item:hover { transform: translateY(-4px); }
        .tm-metric-item.orange { border-color: #ff5a3c; }
        .tm-metric-item.green { border-color: #10b981; }
        .tm-metric-item.blue { border-color: #3b82f6; }
        .metric-icon { font-size: 1.8rem; background: #f1f5f9; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border-radius: 14px; }
        .metric-text .label { display: block; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
        .metric-text .value { font-size: 1.8rem; font-weight: 800; color: #1e293b; }
        .tm-control-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
        .tm-tabs-navigation { display: flex; background: #e2e8f0; padding: 5px; border-radius: 14px; gap: 4px; }
        .tab-btn { border: none; padding: 10px 22px; border-radius: 10px; cursor: pointer; font-weight: 700; color: #64748b; background: transparent; transition: 0.2s; position: relative; }
        .tab-btn.active { background: white; color: #ff5a3c; box-shadow: 0 4px 10px rgba(0,0,0,0.08); }
        .tab-badge { position: absolute; top: -5px; right: -5px; background: #ff5a3c; color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; border: 2px solid #f8fafc; }
        .tm-search-wrapper input { padding: 11px 18px; border-radius: 12px; border: 1px solid #e2e8f0; width: 260px; font-size: 0.9rem; outline: none; }
        .tm-search-wrapper input:focus { border-color: #ff5a3c; box-shadow: 0 0 0 3px rgba(255,90,60,0.1); }
        .sort-select { padding: 11px 15px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 0.85rem; font-weight: 600; color: #475569; cursor: pointer; outline: none; }
        .empty-tab-state { text-align: center; padding: 80px 20px; color: #94a3b8; }
        .empty-tab-state p { font-size: 1.1rem; margin-bottom: 8px; }
        .tm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 22px; }
        .tm-booking-card { background: white; border-radius: 22px; padding: 25px; border: 1px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.3s; display: flex; flex-direction: column; }
        .tm-booking-card:hover { transform: translateY(-6px); box-shadow: 0 15px 25px rgba(0,0,0,0.06); }
        .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .status-pill { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; padding: 5px 12px; border-radius: 20px; }
        .status-pill.pending { background: #fff7ed; color: #c2410c; }
        .status-pill.confirmed { background: #eff6ff; color: #1d4ed8; }
        .status-pill.paid { background: #f0fdf4; color: #15803d; }
        .status-pill.completed { background: #f1f5f9; color: #475569; }
        .status-pill.cancelled { background: #fef2f2; color: #ef4444; }
        .id-label { font-size: 0.75rem; color: #94a3b8; font-family: monospace; }
        .tour-title { font-size: 1.2rem; font-weight: 800; color: #1e293b; margin-bottom: 14px; }
        .info-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .info-item { display: flex; align-items: center; gap: 10px; color: #64748b; font-size: 0.88rem; }
        .card-footer { margin-top: auto; padding-top: 18px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .p-label { display: block; font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
        .p-value { font-size: 1.05rem; font-weight: 800; color: #10b981; }
        .btn-details { background: #f1f5f9; border: none; padding: 9px 16px; border-radius: 10px; font-weight: 700; color: #475569; cursor: pointer; transition: 0.2s; font-size: 0.85rem; }
        .btn-details:hover { background: #e2e8f0; }
        .tm-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .tm-modal-content { background: white; width: 100%; max-width: 480px; border-radius: 28px; padding: 40px; position: relative; animation: modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .close-modal { position: absolute; top: 20px; right: 20px; border: none; background: #f1f5f9; width: 36px; height: 36px; border-radius: 50%; font-size: 1.4rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .modal-data p { margin: 14px 0; color: #475569; }
        .modal-data code { background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-size: 0.85rem; }
        .modal-actions { margin-top: 25px; display: flex; flex-direction: column; gap: 10px; }
        .btn-approve-big { background: #3b82f6; color: white; border: none; padding: 15px; border-radius: 14px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-approve-big:hover { background: #2563eb; }
        .btn-complete-big { background: #10b981; color: white; border: none; padding: 15px; border-radius: 14px; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .btn-complete-big:hover { background: #059669; }
        .btn-cancel-big { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 15px; border-radius: 14px; font-weight: 800; cursor: pointer; }
        .btn-delete-big { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; padding: 15px; border-radius: 14px; font-weight: 700; cursor: pointer; }
        .status-notice { text-align: center; color: #3b82f6; font-weight: 700; background: #eff6ff; padding: 15px; border-radius: 12px; margin: 0; }
        .tm-loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; color: #94a3b8; }
        .tm-spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #ff5a3c; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes modalPop { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @media (max-width: 768px) {
          .tm-bookings-page { padding: 15px; }
          .tm-control-bar { flex-direction: column; align-items: stretch; }
          .tm-search-wrapper input { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Bookings;