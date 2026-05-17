import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import '../../styles/GuideDashboard.css';

/**
 * Commissions - Dashboard financiero del guía.
 * Carga las reservas completadas/pagadas directamente desde Firebase.
 */
const Commissions = () => {
  const { user } = useAuth();
  const PLATFORM_FEE = 0.15;
  const [filterMonth, setFilterMonth] = useState('all');
  const [completedTours, setCompletedTours] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Cargar reservas completadas/pagadas del guía desde Firestore ──
  useEffect(() => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, "bookings"),
      where("guideId", "==", currentUser.uid),
      where("status", "in", ["paid", "completed"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        // Normalizamos la fecha para que siempre sea string "YYYY-MM-DD"
        let dateStr = '';
        if (d.date) {
          dateStr = d.date;
        } else if (d.createdAt?.toDate) {
          dateStr = d.createdAt.toDate().toISOString().split('T')[0];
        } else if (d.paymentDate?.toDate) {
          dateStr = d.paymentDate.toDate().toISOString().split('T')[0];
        }
        return {
          id: docSnap.id,
          tourName: d.tourTitle || 'Tour TourMate',
          totalPaid: Number(d.totalPrice) || 0,
          date: dateStr,
          status: d.status
        };
      });
      setCompletedTours(data);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando comisiones:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // ── Meses disponibles dinámicamente ──
  const availableMonths = useMemo(() => {
    const months = new Set();
    completedTours.forEach(t => {
      if (t.date && t.date.length >= 7) {
        months.add(t.date.substring(0, 7)); // "YYYY-MM"
      }
    });
    return Array.from(months).sort().reverse();
  }, [completedTours]);

  // ── Lógica financiera ──
  const financialData = useMemo(() => {
    const filtered = filterMonth === 'all'
      ? completedTours
      : completedTours.filter(t => t.date?.startsWith(filterMonth));

    const totalBruto = filtered.reduce((acc, t) => acc + t.totalPaid, 0);
    const comisionPlataforma = totalBruto * PLATFORM_FEE;
    const gananciaNeta = totalBruto - comisionPlataforma;
    const promedioVenta = filtered.length > 0 ? totalBruto / filtered.length : 0;

    return { totalBruto, comisionPlataforma, gananciaNeta, promedioVenta, count: filtered.length, list: filtered };
  }, [completedTours, filterMonth]);

  const InfoTooltip = ({ text }) => (
    <div className="tooltip-container">
      <span className="info-icon">ⓘ</span>
      <span className="tooltip-text">{text}</span>
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
        <div className="spinner-comm"></div>
        <p>Calculando tus ganancias...</p>
      </div>
    );
  }

  return (
    <div className="guide-section stats-container animate-fade-in">
      {/* HEADER */}
      <div className="section-header-admin">
        <div className="header-text">
          <h2>Centro de Liquidación</h2>
          <p>Desglose de ingresos y comisiones aplicadas a tus servicios completados.</p>
        </div>
        <div className="header-actions">
          <select
            className="admin-select"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">Todo el historial</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          <button className="btn-save" onClick={() => window.print()}>
            📥 Exportar Reporte
          </button>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS */}
      <div className="guide-header-stats">
        <div className="stat-card">
          <div className="card-top">
            <span>Ventas Brutas</span>
            <InfoTooltip text="Total pagado por los clientes antes de comisiones." />
          </div>
          <strong>${financialData.totalBruto.toLocaleString('es-CO')}</strong>
          <small className="trend-up">↑ {financialData.count} tours completados</small>
        </div>

        <div className="stat-card comision">
          <div className="card-top">
            <span>Comisión TourMate</span>
            <span className="fee-badge">15% Fee</span>
          </div>
          <strong className="negative">-${financialData.comisionPlataforma.toLocaleString('es-CO')}</strong>
          <small>Incluye seguro y marketing</small>
        </div>

        <div className="stat-card neta">
          <div className="card-top">
            <span>Mi Ganancia Neta</span>
            <div className="pulse-dot"></div>
          </div>
          <strong className="positive">${financialData.gananciaNeta.toLocaleString('es-CO')}</strong>
          <small>Disponible para retiro</small>
        </div>
      </div>

      {/* TABLA DE LIQUIDACIONES */}
      <div className="admin-table-container" style={{ marginTop: '2.5rem' }}>
        <div className="table-header-flex">
          <h3>Historial de Liquidaciones</h3>
          <p className="table-subtitle">Valores en Pesos Colombianos (COP)</p>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>ID Reserva</th>
              <th>Tour / Experiencia</th>
              <th>Fecha</th>
              <th>Venta Bruta</th>
              <th>Comisión (15%)</th>
              <th>Ganancia Neta</th>
            </tr>
          </thead>
          <tbody>
            {financialData.list.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  {completedTours.length === 0
                    ? "Aún no tienes tours pagados o completados."
                    : "No hay tours liquidados en este periodo."}
                </td>
              </tr>
            ) : (
              financialData.list.map(t => (
                <tr key={t.id}>
                  <td><code className="id-tag">#{t.id?.slice(-6).toUpperCase()}</code></td>
                  <td><strong>{t.tourName}</strong></td>
                  <td>{t.date || '—'}</td>
                  <td>${t.totalPaid.toLocaleString('es-CO')}</td>
                  <td className="negative">-${(t.totalPaid * PLATFORM_FEE).toLocaleString('es-CO')}</td>
                  <td className="profit-cell">+${(t.totalPaid * (1 - PLATFORM_FEE)).toLocaleString('es-CO')}</td>
                </tr>
              ))
            )}
          </tbody>
          {financialData.list.length > 0 && (
            <tfoot>
              <tr className="footer-summary">
                <td colSpan="3">TOTALES DEL PERIODO</td>
                <td>${financialData.totalBruto.toLocaleString('es-CO')}</td>
                <td className="negative">-${financialData.comisionPlataforma.toLocaleString('es-CO')}</td>
                <td className="total-highlight">${financialData.gananciaNeta.toLocaleString('es-CO')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* PANEL DE TRANSPARENCIA */}
      <div className="transparency-panel">
        <div className="panel-icon">🛡️</div>
        <div className="panel-text">
          <h4>¿A dónde va tu comisión?</h4>
          <p>
            El 15% permite que TourMate Medellín mantenga soporte técnico 24/7,
            seguro de accidentes para tus viajeros y publicidad que trae más clientes.
          </p>
        </div>
      </div>

      <style>{`
        .stats-container { padding: 10px; }
        .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; color: #64748b; font-weight: 600; font-size: 0.85rem; }
        .fee-badge { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; }
        .stat-card strong { font-size: 1.8rem; display: block; margin-bottom: 5px; }
        .negative { color: #ef4444 !important; }
        .positive { color: #10b981 !important; }
        .profit-cell { font-weight: 800; color: #10b981; background: #f0fdf4; }
        .id-tag { background: #f8fafc; padding: 4px; border-radius: 4px; font-family: monospace; color: #64748b; }
        .footer-summary { background: #1e293b; color: white; font-weight: 700; }
        .total-highlight { background: #10b981; color: white; }
        .transparency-panel { margin-top: 3rem; display: flex; gap: 20px; background: #f8fafc; padding: 2rem; border-radius: 15px; border: 1px dashed #cbd5e1; }
        .panel-icon { font-size: 2.5rem; }
        .panel-text h4 { margin: 0 0 10px 0; color: #1e293b; }
        .panel-text p { margin: 0; color: #64748b; font-size: 0.9rem; line-height: 1.5; }
        .tooltip-container { position: relative; cursor: help; }
        .tooltip-text { visibility: hidden; width: 200px; background-color: #334155; color: #fff; text-align: center; border-radius: 6px; padding: 10px; position: absolute; z-index: 1; bottom: 125%; left: 50%; margin-left: -100px; opacity: 0; transition: opacity 0.3s; font-size: 0.75rem; }
        .tooltip-container:hover .tooltip-text { visibility: visible; opacity: 1; }
        .spinner-comm { width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print {
          .header-actions, .transparency-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Commissions;