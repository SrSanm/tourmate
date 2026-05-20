import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Chat from '../chat/Chat';

/**
 * MyBookings — Panel de reservas del TURISTA (Versión Optimizada Visualmente)
 */
const MyBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [filter, setFilter]                 = useState('Todos');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [chatOpen, setChatOpen]             = useState(false);

  // ── Query en tiempo real ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        totalPrice: Number(d.data().totalPrice) || 0
      }));

      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBookings(data);
      setLoading(false);
    }, (err) => {
      console.error("Error MyBookings:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ── Filtros Memorizados ────────────────────────────────────────
  const filtered = useMemo(() => {
    return bookings.filter(b => {
      const s = b.status?.toLowerCase() || 'pending';
      if (filter === 'Todos')      return true;
      if (filter === 'Pendientes') return s === 'pending';
      if (filter === 'Por Pagar')  return s === 'confirmed';
      if (filter === 'Pagados')    return s === 'paid' || s === 'completed';
      return false;
    });
  }, [bookings, filter]);

  // ── Manejador de enrutamiento a Wompi ──────────────────────────
  const handlePayment = (id, totalPrice) => {
    if (!id || !totalPrice || totalPrice <= 0) {
      alert("Parámetros de facturación inválidos.");
      return;
    }
    setSelectedBooking(null);
    navigate(`/checkout/${id}?amount=${totalPrice}`);
  };

  const openDetail = (booking) => {
    setSelectedBooking(booking);
    setChatOpen(false);
  };

  const canChat = (s) => s === 'confirmed' || s === 'paid' || s === 'completed';

  const statusLabel = (s) => ({
    pending:   '⏳ Esperando confirmación del guía',
    confirmed: '✅ Confirmado — Pendiente de pago',
    paid:      '💎 Pagado',
    completed: '🏁 Completado',
    cancelled: '❌ Cancelado'
  }[s] || s);

  const statusShort = (s) => ({
    pending:   '⏳ Pendiente',
    confirmed: '✅ Confirmado',
    paid:      '💎 Pagado',
    completed: '🏁 Completado',
    cancelled: '❌ Cancelado'
  }[s] || s);

  if (loading) return (
    <div className="mb-loading">
      <div className="mb-spinner" />
      <p>Cargando tus aventuras...</p>
    </div>
  );

  const tabs = ['Todos', 'Pendientes', 'Por Pagar', 'Pagados'];

  return (
    <div className="mb-page">

      {/* ── HEADER ───────────────────────────────── */}
      <header className="mb-header">
        <h1>Mis Reservas (Turista)</h1>
        <p>Gestiona tus tours, realiza pagos seguros y comunícate con tu guía asignado.</p>
      </header>

      {/* ── CONTADORES RÁPIDOS ───────────────────── */}
      <div className="mb-counts">
        <div className="mb-count-item bg-pending">
          <strong>{bookings.filter(b => b.status === 'pending').length}</strong>
          <span>Pendientes</span>
        </div>
        <div className="mb-count-item bg-confirmed">
          <strong>{bookings.filter(b => b.status === 'confirmed').length}</strong>
          <span>Por Pagar</span>
        </div>
        <div className="mb-count-item bg-paid">
          <strong>{bookings.filter(b => b.status === 'paid' || b.status === 'completed').length}</strong>
          <span>Completados</span>
        </div>
      </div>

      {/* ── TABS DE FILTRADO ─────────────────────── */}
      <div className="mb-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`mb-tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── GRILLA DE CARDS ──────────────────────── */}
      <div className="mb-grid">
        {filtered.length === 0 ? (
          <div className="mb-empty">
            <p>No tienes aventuras en la categoría <strong>{filter}</strong>.</p>
            {filter === 'Todos' && (
              <button className="mb-cta" onClick={() => navigate('/packages')}>
                Explorar Tours
              </button>
            )}
          </div>
        ) : (
          filtered.map(book => (
            <div key={book.id} className={`mb-card mb-${book.status}`}>
              
              {/* Imagen con Aspect Ratio Seguro */}
              <div className="mb-card-img-container">
                <img 
                  src={book.tourImage || 'https://images.unsplash.com/photo-1585938338392-50a59970d8ee?q=80&w=500'} 
                  alt={book.tourTitle} 
                  className="mb-card-img"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1585938338392-50a59970d8ee?q=80&w=500';
                  }}
                />
                <span className={`mb-badge-floating ${book.status}`}>{statusShort(book.status)}</span>
              </div>

              <div className="mb-card-body">
                <div className="mb-card-top">
                  <span className="mb-id">ID: #{book.id.slice(-6).toUpperCase()}</span>
                  <span className="mb-date-badge">📅 {book.date || "Pendiente"}</span>
                </div>

                <h3 className="mb-tour-name">{book.tourTitle || "Tour Seleccionado"}</h3>

                <div className="mb-info-list">
                  <div className="mb-info-item">👥 <span><strong>{book.numPersons || book.guests || 1}</strong> personas</span></div>
                  {book.guideName && <div className="mb-info-item">🧭 <span>Guía: <strong>{book.guideName}</strong></span></div>}
                </div>

                {/* Caja de Estado Contextual Dinámica */}
                {book.status === 'pending' && (
                  <div className="mb-status-msg waiting">
                    ⏳ El guía revisará tu solicitud para confirmar disponibilidad pronto.
                  </div>
                )}
                {book.status === 'confirmed' && (
                  <div className="mb-status-msg ready">
                    ✅ ¡Tu cupo está reservado! Procede con el pago seguro de Wompi.
                  </div>
                )}
                {book.status === 'paid' && (
                  <div className="mb-status-msg done">
                    💎 Pago exitoso. El chat con tu guía se encuentra habilitado abajo.
                  </div>
                )}

                <div className="mb-card-footer">
                  <div className="mb-price-box">
                    <span className="mb-price-label">Precio Total</span>
                    <strong className="mb-price-value">${book.totalPrice.toLocaleString('es-CO')} COP</strong>
                  </div>

                  <div className="mb-action-btns">
                    <button className="mb-btn-action btn-secondary" onClick={() => openDetail(book)}>
                      Ver detalles
                    </button>

                    {book.status === 'confirmed' && (
                      <button className="mb-btn-action btn-pay" onClick={() => handlePayment(book.id, book.totalPrice)}>
                        💳 Pagar ahora
                      </button>
                    )}

                    {canChat(book.status) && (
                      <button
                        className="mb-btn-action btn-chat"
                        onClick={() => { openDetail(book); setChatOpen(true); }}
                      >
                        💬 Chat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── MODAL DETALLE + CHAT ─────────────────── */}
      {selectedBooking && (
        <div className="mb-modal-bg" onClick={e => e.target === e.currentTarget && setSelectedBooking(null)}>
          <div className="mb-modal">
            <button className="mb-modal-close" onClick={() => setSelectedBooking(null)}>×</button>

            <div className="mb-modal-tabs">
              <button
                className={`mb-modal-tab ${!chatOpen ? 'active' : ''}`}
                onClick={() => setChatOpen(false)}
              >
                📋 Detalles del Tour
              </button>
              {canChat(selectedBooking.status) && (
                <button
                  className={`mb-modal-tab ${chatOpen ? 'active' : ''}`}
                  onClick={() => setChatOpen(true)}
                >
                  💬 Chat con el Guía
                </button>
              )}
            </div>

            {!chatOpen ? (
              <div className="mb-modal-body">
                <h2>{selectedBooking.tourTitle}</h2>
                <div className="mb-modal-grid">
                  <div><label>Estado Actual</label>
                    <p>{statusLabel(selectedBooking.status)}</p>
                  </div>
                  <div><label>Referencia de Reserva</label>
                    <p><code>{selectedBooking.id}</code></p>
                  </div>
                  <div><label>Fecha del Evento</label>
                    <p>{selectedBooking.date || '—'}</p>
                  </div>
                  <div><label>Grupo Completo</label>
                    <p>{selectedBooking.numPersons || selectedBooking.guests || 1} viajeros</p>
                  </div>
                  <div><label>Experto Local</label>
                    <p>{selectedBooking.guideName || 'Buscando el mejor guía...'}</p>
                  </div>
                  <div><label>Liquidación Total</label>
                    <p className="highlight-price"><strong>${selectedBooking.totalPrice.toLocaleString('es-CO')} COP</strong></p>
                  </div>
                </div>

                {selectedBooking.status === 'confirmed' && (
                  <button
                    className="mb-btn-pay-full"
                    onClick={() => handlePayment(selectedBooking.id, selectedBooking.totalPrice)}
                  >
                    💳 Ir a la Pasarela de Pago Seguro
                  </button>
                )}
              </div>
            ) : (
              <div className="mb-chat-wrapper">
                <div className="mb-chat-info">
                  <strong>{selectedBooking.tourTitle}</strong>
                  <span>{selectedBooking.guideName ? `Guía: ${selectedBooking.guideName}` : 'Guía Asignado'} · {selectedBooking.date}</span>
                </div>
                <Chat bookingId={selectedBooking.id} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ARQUITECTURA CSS LIMPIA Y ESTRUCTURADA ── */}
      <style>{`
        .mb-page { padding: 40px; background: #f8fafc; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; }
        
        .mb-header { margin-bottom: 32px; }
        .mb-header h1 { font-size: 2.24rem; font-weight: 800; color: #0f172a; margin: 0 0 8px; letter-spacing: -0.02em; }
        .mb-header p { color: #64748b; margin: 0; font-size: 1.05rem; }

        .mb-counts { display: flex; gap: 16px; margin-bottom: 32px; }
        .mb-count-item { flex: 1; background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: 0.2s; }
        .mb-count-item strong { display: block; font-size: 2rem; font-weight: 800; color: #0f172a; line-height: 1; margin-bottom: 4px; }
        .mb-count-item span { font-size: 0.8rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .mb-count-item.bg-pending { border-top: 4px solid #f59e0b; }
        .mb-count-item.bg-confirmed { border-top: 4px solid #3b82f6; }
        .mb-count-item.bg-paid { border-top: 4px solid #10b981; }

        .mb-tabs { display: flex; gap: 8px; margin-bottom: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
        .mb-tab { padding: 8px 20px; border-radius: 20px; border: none; background: transparent; cursor: pointer; font-weight: 600; color: #64748b; transition: all 0.2s; font-size: 0.92rem; }
        .mb-tab.active { background: #ff5a3c; color: white; box-shadow: 0 4px 12px rgba(255,90,60,0.15); }

        .mb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 28px; }
        .mb-empty { grid-column: 1/-1; text-align: center; padding: 80px 20px; background: white; border-radius: 20px; border: 2px dashed #cbd5e1; color: #64748b; }
        
        /* Refactorización de Cards */
        .mb-card { background: white; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01); display: flex; flex-direction: column; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
        .mb-card:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 10px 10px -5px rgba(0,0,0,0.02); }
        
        .mb-card-img-container { position: relative; width: 100%; height: 180px; background: #e2e8f0; overflow: hidden; }
        .mb-card-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
        .mb-card:hover .mb-card-img { transform: scale(1.04); }
        
        .mb-badge-floating { position: absolute; top: 12px; right: 12px; padding: 6px 14px; border-radius: 30px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .mb-badge-floating.pending { background: #fff7ed; color: #c2410c; }
        .mb-badge-floating.confirmed { background: #eff6ff; color: #1d4ed8; }
        .mb-badge-floating.paid { background: #f0fdf4; color: #15803d; }
        
        .mb-card-body { padding: 24px; display: flex; flex-direction: column; flex-grow: 1; }
        .mb-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .mb-id { font-size: 0.75rem; color: #94a3b8; font-family: monospace; font-weight: 600; }
        .mb-date-badge { font-size: 0.82rem; color: #475569; font-weight: 600; }
        
        .mb-tour-name { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 14px; line-height: 1.3; min-height: 40px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        .mb-info-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 12px; }
        .mb-info-item { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: #475569; }

        .mb-status-msg { font-size: 0.82rem; font-weight: 600; padding: 12px; border-radius: 12px; margin-bottom: 20px; line-height: 1.4; }
        .mb-status-msg.waiting { background: #fff7ed; color: #a16207; border-left: 4px solid #eab308; }
        .mb-status-msg.ready { background: #eff6ff; color: #1e40af; border-left: 4px solid #3b82f6; }
        .mb-status-msg.done { background: #f0fdf4; color: #166534; border-left: 4px solid #10b981; }

        .mb-card-footer { margin-top: auto; padding-top: 18px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .mb-price-box { display: flex; flex-direction: column; min-width: 100px; }
        .mb-price-label { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; }
        .mb-price-value { font-size: 1.15rem; font-weight: 800; color: #0f172a; }
        
        .mb-action-btns { display: flex; gap: 8px; flex-grow: 1; justify-content: flex-end; }
        .mb-btn-action { padding: 10px 14px; border-radius: 10px; font-weight: 700; border: none; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; display: flex; align-items: center; gap: 4px; }
        
        .btn-secondary { background: #f1f5f9; color: #475569; }
        .btn-secondary:hover { background: #e2e8f0; }
        .btn-pay { background: #10b981; color: white; }
        .btn-pay:hover { background: #059669; }
        .btn-chat { background: #6366f1; color: white; }
        .btn-chat:hover { background: #4f46e5; }

        /* Modales */
        .mb-modal-bg { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1100; padding: 20px; }
        .mb-modal { background: white; width: 100%; max-width: 560px; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; position: relative; max-height: 85vh; }
        .mb-modal-close { position: absolute; top: 16px; right: 16px; border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; color: #64748b; z-index: 10; display: flex; align-items: center; justify-content: center; }
        
        .mb-modal-tabs { display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .mb-modal-tab { flex: 1; border: none; background: transparent; padding: 16px; font-weight: 700; cursor: pointer; color: #64748b; font-size: 0.9rem; transition: 0.2s; border-bottom: 3px solid transparent; }
        .mb-modal-tab.active { color: #ff5a3c; border-bottom-color: #ff5a3c; background: white; }
        
        .mb-modal-body { padding: 28px; overflow-y: auto; }
        .mb-modal-body h2 { margin: 0 0 20px; font-size: 1.4rem; color: #0f172a; font-weight: 800; }
        .mb-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .mb-modal-grid label { display: block; font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em; }
        .mb-modal-grid p { margin: 0; background: #f8fafc; padding: 12px; border-radius: 12px; font-size: 0.9rem; color: #0f172a; border: 1px solid #e2e8f0; font-weight: 500; }
        .mb-modal-grid p.highlight-price { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }

        .mb-btn-pay-full { width: 100%; padding: 14px; border-radius: 12px; background: #10b981; color: white; font-weight: 700; font-size: 1rem; border: none; margin-top: 24px; cursor: pointer; transition: background 0.2s; }
        .mb-btn-pay-full:hover { background: #059669; }

        .mb-chat-wrapper { display: flex; flex-direction: column; height: 500px; }
        .mb-chat-info { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        
        .mb-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 70vh; gap: 16px; color: #64748b; font-weight: 500; }
        .mb-spinner { width: 44px; height: 44px; border: 4px solid #e2e8f0; border-top-color: #ff5a3c; border-radius: 50%; animation: spin 0.8s linear infinite; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .mb-page { padding: 16px; }
          .mb-counts { flex-direction: column; gap: 12px; }
          .mb-grid { grid-template-columns: 1fr; }
          .mb-card-footer { flex-direction: column; align-items: flex-start; gap: 16px; }
          .mb-action-btns { width: 100%; }
          .mb-btn-action { flex: 1; justify-content: center; }
          .mb-modal-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default MyBookings;