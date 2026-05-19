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

const MyBookings = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');

  const isGuide = profile?.role === 'guide';

  useEffect(() => {
    if (!user) return;

    let q;
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`--- SINCRONIZACIÓN ${isGuide ? 'GUÍA' : 'TURISTA'} ---`);
      console.log("Documentos en Firebase:", snapshot.size);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (isGuide) {
        const guideData = data.filter(b => b.status === 'published' || b.guideId === user.uid);
        setBookings(guideData);
      } else {
        setBookings(data);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error en Firebase:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isGuide]);

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const status = b.status?.toLowerCase() || 'pending';
      if (filter === 'Todos') return true;
      
      if (isGuide) {
        if (filter === 'Bolsa Abierta') return status === 'published';
        if (filter === 'Por Confirmar') return status === 'pending' || status === 'pendiente';
        if (filter === 'Historial') return status === 'confirmed' || status === 'paid';
      } else {
        if (filter === 'Pendientes') return status === 'published' || status === 'pending' || status === 'pendiente';
        if (filter === 'Por Pagar') return status === 'confirmed' || status === 'approved';
        if (filter === 'Pagados') return status === 'paid';
      }
      return false;
    });
  }, [bookings, filter, isGuide]);

  // Redirección directa al componente CheckoutPage simulando el comportamiento de Wompi
  const handleGoToCheckout = (id, total) => {
    navigate(`/checkout/${id}?amount=${total}`);
  };

  const handleAcceptBooking = async (id) => {
    if (!window.confirm("¿Deseas aceptar y confirmar esta reserva?")) return;
    try {
      await updateDoc(doc(db, "bookings", id), {
        status: 'confirmed',
        guideId: user.uid,
        guideName: user.displayName || profile?.name || "Guía Local",
        acceptedAt: serverTimestamp()
      });
      alert("¡Reserva confirmada con éxito!");
    } catch (e) {
      alert("Error al confirmar la reserva");
    }
  };

  if (loading) return <div className="loading-screen">Cargando aventuras...</div>;

  const tabs = isGuide 
    ? ['Todos', 'Bolsa Abierta', 'Por Confirmar', 'Historial'] 
    : ['Todos', 'Pendientes', 'Por Pagar', 'Pagados'];

  return (
    <div className="bookings-view">
      <header className="view-header">
        <h1>{isGuide ? "Panel de Servicios (Guía)" : "Mis Reservas (Turista)"}</h1>
        <p>{isGuide ? "Toma servicios de la bolsa o gestiona tus asignaciones." : "Gestiona tus tours y confirma pagos pendientes."}</p>
      </header>

      <div className="filter-tabs-container">
        {tabs.map(tab => (
          <button 
            key={tab}
            className={`tab-item ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bookings-grid">
        {filteredBookings.length === 0 ? (
          <div className="empty-state">
            <p>No encontramos registros en <strong>{filter}</strong></p>
          </div>
        ) : (
          filteredBookings.map(book => (
            <div key={book.id} className={`booking-card status-${book.status}`}>
              <div className="card-badge">
                {book.status === 'published' && '🌍 Bolsa Abierta (Libre)'}
                {book.status === 'pending' && '⏳ Esperando Confirmación'}
                {book.status === 'confirmed' && '✅ Aprobado / Por Pagar'}
                {book.status === 'paid' && '💎 Servicio Pagado'}
              </div>
              
              <div className="card-main-info">
                <h3>{book.tourTitle || "Tour en Medellín"}</h3>
                <div className="meta-info">
                  <p>📅 Fecha: {book.date}</p>
                  <p>👤 Personas: {book.numPersons || book.guests}</p>
                  {isGuide && (
                    <>
                      <p>👤 Turista: {book.touristName || "No indicado"}</p>
                      <p>✉️ Email: {book.touristEmail || "No indicado"}</p>
                    </>
                  )}
                  {!isGuide && book.guideName && (
                    <p>🗺️ Guía asignado: <strong>{book.guideName}</strong></p>
                  )}
                </div>
              </div>

              <div className="card-footer-price">
                <div className="price-box">
                  <span>Precio Total</span>
                  <strong>${book.totalPrice?.toLocaleString('es-CO')} COP</strong>
                </div>
                
                {/* ACCIÓN DEL TURISTA: Redirige a la vista de pasarela de pagos */}
                {!isGuide && (book.status === 'confirmed' || book.status === 'approved') && (
                  <button className="pay-now-btn" onClick={() => handleGoToCheckout(book.id, book.totalPrice)}>
                    Pagar Ahora 💳
                  </button>
                )}

                {/* ACCIÓN DEL GUÍA: Aceptar / Tomar servicio */}
                {isGuide && (book.status === 'published' || book.status === 'pending') && (
                  <button className="pay-now-btn" style={{ background: '#3b82f6' }} onClick={() => handleAcceptBooking(book.id)}>
                    Aceptar Servicio
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .bookings-view { padding: 40px; background-color: #f8fafc; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .view-header { margin-bottom: 40px; }
        .view-header h1 { color: #0f172a; font-size: 2.5rem; font-weight: 800; letter-spacing: -0.05em; margin-bottom: 8px; }
        .view-header p { color: #64748b; font-size: 1.1rem; }
        
        .filter-tabs-container { display: flex; gap: 12px; margin-bottom: 35px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
        .tab-item { 
          padding: 12px 24px; border-radius: 50px; border: 1px solid #cbd5e1; 
          background: white; cursor: pointer; font-weight: 700; color: #475569; transition: all 0.2s ease-in-out; font-size: 0.95rem;
        }
        .tab-item:hover { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; }
        .tab-item.active { background: #ff5a3c; color: white; border-color: #ff5a3c; box-shadow: 0 10px 15px -3px rgba(255,90,60,0.3); }
        
        .bookings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 28px; }
        .booking-card { 
          background: white; padding: 30px; border-radius: 24px; border: 1px solid #e2e8f0;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.01), 0 4px 6px -4px rgba(0,0,0,0.015); position: relative;
          display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, box-shadow 0.2s;
        }
        .booking-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); }
        
        .card-badge { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; padding: 6px 14px; border-radius: 50px; display: inline-block; width: fit-content; }
        
        .status-published { border-top: 4px solid #10b981; }
        .status-published .card-badge { background: #d1fae5; color: #065f46; }
        
        .status-pending { border-top: 4px solid #f59e0b; }
        .status-pending .card-badge { background: #fef3c7; color: #92400e; }
        
        .status-confirmed { border-top: 4px solid #3b82f6; }
        .status-confirmed .card-badge { background: #dbeafe; color: #1e40af; }
        
        .status-paid { border-top: 4px solid #6366f1; }
        .status-paid .card-badge { background: #e0e7ff; color: #3730a3; }
        
        .card-main-info h3 { font-size: 1.35rem; color: #1e293b; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.02em; }
        .meta-info p { color: #64748b; font-size: 0.95rem; margin: 6px 0; display: flex; align-items: center; gap: 8px; }
        
        .card-footer-price { border-top: 1px solid #f1f5f9; margin-top: 25px; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
        .price-box span { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 700; tracking: 0.05em; display: block; }
        .price-box strong { font-size: 1.3rem; color: #0f172a; font-weight: 800; }
        
        .pay-now-btn { 
          background: #10b981; color: white; border: none; padding: 12px 22px; 
          border-radius: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s ease; font-size: 0.95rem;
          box-shadow: 0 4px 6px -1px rgba(16,185,129,0.2);
        }
        .pay-now-btn:hover { background: #059669; transform: translateY(-1px); box-shadow: 0 10px 15px -3px rgba(16,185,129,0.3); }
        .pay-now-btn:active { transform: translateY(1px); }
        
        .empty-state { grid-column: 1 / -1; text-align: center; padding: 60px; background: white; border-radius: 20px; border: 2px dashed #cbd5e1; color: #64748b; font-size: 1.1rem; }
        .loading-screen { display: flex; justify-content: center; align-items: center; min-height: 100vh; font-size: 1.2rem; font-weight: 700; color: #64748b; background: #f8fafc; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default MyBookings;