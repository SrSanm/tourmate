import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../../firebase/firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

/**
 * Commissions - Dashboard financiero y centro de liquidación del guía.
 * Versión con CSS ultra-pulido y diseño de interfaz premium aislado.
 */
const Commissions = () => {
  const { user } = useAuth();
  const PLATFORM_FEE = 0.15;
  const [filterMonth, setFilterMonth] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedTours, setCompletedTours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) return;

    const q = query(
      collection(db, "bookings"),
      where("guideId", "==", currentUser.uid),
      where("status", "in", ["paid", "completed"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const data = snapshot.docs.map(docSnap => {
          const d = docSnap.data();
          let dateStr = '—';
          if (d.date) {
            dateStr = d.date;
          } else if (d.createdAt?.toDate) {
            dateStr = d.createdAt.toDate().toISOString().split('T')[0];
          } else if (d.paymentDate?.toDate) {
            dateStr = d.paymentDate.toDate().toISOString().split('T')[0];
          }

          return {
            id: docSnap.id,
            tourName: d.tourTitle || d.tourName || 'Tour TourMate',
            totalPaid: Number(d.totalPrice) || 0,
            date: dateStr,
            status: d.status || 'paid',
            // CORRECCIÓN: Soporte nativo para el nuevo campo y fallback al campo real de email en tu DB
            customerName: d.customerName || d.touristEmail?.split('@')[0] || d.userEmail?.split('@')[0] || 'Cliente'
          };
        });

        data.sort((a, b) => b.date.localeCompare(a.date));
        setCompletedTours(data);
      } catch (error) {
        console.error("Error procesando comisiones:", error);
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error crítico en canal de comisiones:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    completedTours.forEach(t => {
      if (t.date && t.date.length >= 7 && t.date !== '—') {
        months.add(t.date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [completedTours]);

  const financialData = useMemo(() => {
    let stepFiltered = filterMonth === 'all'
      ? completedTours
      : completedTours.filter(t => t.date?.startsWith(filterMonth));

    if (searchQuery.trim() !== '') {
      const queryLower = searchQuery.toLowerCase();
      stepFiltered = stepFiltered.filter(t => 
        t.id.toLowerCase().includes(queryLower) || 
        t.tourName.toLowerCase().includes(queryLower) ||
        t.customerName.toLowerCase().includes(queryLower)
      );
    }

    const totalBruto = stepFiltered.reduce((acc, t) => acc + t.totalPaid, 0);
    const comisionPlataforma = totalBruto * PLATFORM_FEE;
    const gananciaNeta = totalBruto - comisionPlataforma;
    const ticketPromedio = stepFiltered.length > 0 ? totalBruto / stepFiltered.length : 0;

    return { totalBruto, comisionPlataforma, gananciaNeta, ticketPromedio, count: stepFiltered.length, list: stepFiltered };
  }, [completedTours, filterMonth, searchQuery]);

  const InfoTooltip = ({ text }) => (
    <div className="tm-tooltip-wrapper">
      <span className="tm-tooltip-icon">ⓘ</span>
      <span className="tm-tooltip-box">{text}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="tm-finance-loading">
        <div className="tm-spinner"></div>
        <p>Cargando balance financiero...</p>
      </div>
    );
  }

  return (
    <div className="tm-finance-wrapper animate-tm-fade-in">
      
      {/* HEADER CONTENEDOR */}
      <div className="tm-finance-header">
        <div className="tm-header-left">
          <h2>Centro de Liquidación</h2>
          <p>Monitorea tus ingresos del catálogo, deducciones de la plataforma y balances netos.</p>
        </div>
        
        <div className="tm-header-right">
          <div className="tm-search-box">
            <span className="tm-search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar ID, tour o cliente..."
              className="tm-input-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="tm-select-filter"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">Todo el historial</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-02').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>

          <button className="tm-btn-export" onClick={() => window.print()}>
            📥 Exportar PDF
          </button>
        </div>
      </div>

      {/* METRICAS / CARDS GRID */}
      <div className="tm-cards-grid">
        
        <div className="tm-card card-bruto">
          <div className="tm-card-top">
            <span>VENTAS BRUTAS</span>
            <InfoTooltip text="Ingresos totales facturados antes de comisiones e impuestos." />
          </div>
          <div className="tm-card-value">${financialData.totalBruto.toLocaleString('es-CO')} <span className="tm-currency">COP</span></div>
          <div className="tm-card-bottom text-blue">💸 {financialData.count} servicios liquidados</div>
        </div>

        <div className="tm-card card-comision">
          <div className="tm-card-top">
            <span>DEDUCCIÓN PLATAFORMA</span>
            <span className="tm-badge-fee">15% Tarifa</span>
          </div>
          <div className="tm-card-value text-red">-${financialData.comisionPlataforma.toLocaleString('es-CO')} <span className="tm-currency">COP</span></div>
          <div className="tm-card-bottom text-muted">Pasarela de pago, soporte y marketing</div>
        </div>

        <div className="tm-card card-neta">
          <div className="tm-card-top">
            <span>GANANCIA NETA</span>
            <span className="tm-pulse-active"></span>
          </div>
          <div className="tm-card-value text-green">${financialData.gananciaNeta.toLocaleString('es-CO')} <span className="tm-currency">COP</span></div>
          <div className="tm-card-bottom text-green-dark">Fondos liquidados disponibles para retiro</div>
        </div>

        <div className="tm-card card-ticket">
          <div className="tm-card-top">
            <span>TICKET PROMEDIO</span>
            <InfoTooltip text="Valor medio de reserva en el periodo seleccionado." />
          </div>
          <div className="tm-card-value text-purple">${Math.round(financialData.ticketPromedio).toLocaleString('es-CO')} <span className="tm-currency">COP</span></div>
          <div className="tm-card-bottom text-muted">Por orden de compra</div>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="tm-table-container">
        <div className="tm-table-header">
          <div>
            <h3>Libro de Operaciones Diarias</h3>
            <p>Reporte oficial de transacciones auditadas</p>
          </div>
          {searchQuery && <span className="tm-results-badge">Filtrados: {financialData.count}</span>}
        </div>

        <div className="tm-table-responsive">
          <table className="tm-table-main">
            <thead>
              <tr>
                <th>Ref. ID</th>
                <th>Experiencia / Tour</th>
                <th>Cliente</th>
                <th>Fecha Pago</th>
                <th>Venta Bruta</th>
                <th>Comisión</th>
                <th>Neto Guía</th>
              </tr>
            </thead>
            <tbody>
              {financialData.list.length === 0 ? (
                <tr>
                  <td colSpan="7" className="tm-empty-table">
                    No se encontraron registros de transacciones para este periodo.
                  </td>
                </tr>
              ) : (
                financialData.list.map(t => (
                  <tr key={t.id}>
                    <td><code className="tm-code-id">#{t.id?.slice(-8).toUpperCase()}</code></td>
                    <td className="tm-td-bold">{t.tourName}</td>
                    <td className="text-secondary">{t.customerName}</td>
                    <td className="text-secondary">{t.date}</td>
                    <td className="tm-td-med">${t.totalPaid.toLocaleString('es-CO')}</td>
                    <td className="text-red">-${(t.totalPaid * PLATFORM_FEE).toLocaleString('es-CO')}</td>
                    <td className="text-green tm-td-bold">+${(t.totalPaid * (1 - PLATFORM_FEE)).toLocaleString('es-CO')}</td>
                  </tr>
                ))
              )}
            </tbody>
            {financialData.list.length > 0 && (
              <tfoot>
                <tr className="tm-footer-row">
                  <td colSpan="4" className="tm-text-right">SUBTOTALES EN BALANCE:</td>
                  <td>${financialData.totalBruto.toLocaleString('es-CO')}</td>
                  <td className="text-red-light">-${financialData.comisionPlataforma.toLocaleString('es-CO')}</td>
                  <td className="tm-td-total">${financialData.gananciaNeta.toLocaleString('es-CO')} COP</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* PANEL TRANSPARENCIA */}
      <div className="tm-transparency-card">
        <div className="tm-transparency-icon">🛡️</div>
        <div className="tm-transparency-body">
          <h4>Garantía de Transparencia de Comisiones</h4>
          <p>
            El cobro del 15% aplicado por TourMate se reinvierte directamente en el ecosistema técnico de Medellín: 
            procesamiento seguro de tarjetas globales, pautas publicitarias de alto impacto en buscadores internacionales 
            para tus rutas y la póliza integral contra accidentes en terreno que cubre a cada viajero que asista a tus recorridos.
          </p>
        </div>
      </div>

      {/* ESTILOS DE CORRECCIÓN PROFESIONAL (COMPLETAMENTE AISLADOS) */}
      <style>{`
        .tm-finance-wrapper {
          padding: 24px !important;
          background: #f8fafc !important;
          font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
          color: #1e293b !important;
          min-height: 100% !important;
          box-sizing: border-box !important;
        }

        /* Header Layout Plano Fix */
        .tm-finance-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          background: #ffffff !important;
          padding: 24px !important;
          border-radius: 16px !important;
          border: 1px solid #e2e8f0 !important;
          margin-bottom: 24px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02) !important;
          flex-wrap: wrap !important;
          gap: 16px !important;
        }
        .tm-header-left h2 { margin: 0 0 4px 0 !important; font-size: 1.5rem !important; font-weight: 700 !important; color: #0f172a !important; }
        .tm-header-left p { margin: 0 !important; color: #64748b !important; font-size: 0.9rem !important; }
        
        .tm-header-right { display: flex !important; gap: 12px !important; align-items: center !important; flex-wrap: wrap !important; }
        
        /* Inputs y filtros con padding real */
        .tm-search-box { position: relative !important; display: flex !important; align-items: center !important; }
        .tm-search-icon { position: absolute !important; left: 12px !important; color: #94a3b8 !important; font-size: 0.85rem !important; }
        .tm-input-search { padding: 10px 12px 10px 36px !important; border-radius: 10px !important; border: 1px solid #cbd5e1 !important; font-size: 0.88rem !important; width: 220px !important; outline: none !important; background: #fff !important; }
        .tm-select-filter { padding: 10px 16px !important; border-radius: 10px !important; border: 1px solid #cbd5e1 !important; font-size: 0.88rem !important; background: #fff !important; outline: none !important; cursor: pointer !important; }
        .tm-btn-export { background: #1e293b !important; color: #fff !important; border: none !important; padding: 10px 16px !important; border-radius: 10px !important; font-size: 0.88rem !important; font-weight: 600 !important; cursor: pointer !important; transition: background 0.2s !important; }
        .tm-btn-export:hover { background: #0f172a !important; }

        /* GRID REAL DE TARJETAS */
        .tm-cards-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
          gap: 20px !important;
          margin-bottom: 24px !important;
          width: 100% !important;
        }
        .tm-card {
          background: #ffffff !important;
          padding: 24px !important;
          border-radius: 16px !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.01) !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
        }
        
        .card-bruto { border-left: 4px solid #3b82f6 !important; }
        .card-comision { border-left: 4px solid #ef4444 !important; }
        .card-neta { border-left: 4px solid #10b981 !important; background: linear-gradient(to right, #ffffff, #f0fdf4) !important; }
        .card-ticket { border-left: 4px solid #6366f1 !important; }

        .tm-card-top { display: flex !important; justify-content: space-between !important; align-items: center !important; color: #64748b !important; font-size: 0.75rem !important; font-weight: 700 !important; letter-spacing: 0.05em !important; }
        .tm-card-value { font-size: 1.75rem !important; font-weight: 800 !important; color: #0f172a !important; margin: 12px 0 6px 0 !important; letter-spacing: -0.02em !important; }
        .tm-currency { font-size: 0.85rem !important; font-weight: 500 !important; color: #94a3b8 !important; margin-left: 2px !important; }
        .tm-card-bottom { font-size: 0.82rem !important; font-weight: 500 !important; }

        .text-red { color: #dc2626 !important; }
        .text-red-light { color: #fca5a5 !important; }
        .text-green { color: #16a34a !important; }
        .text-green-dark { color: #15803d !important; }
        .text-blue { color: #2563eb !important; }
        .text-purple { color: #4f46e5 !important; }
        .text-secondary { color: #475569 !important; }
        .text-muted { color: #64748b !important; }

        /* Contenedor de la Tabla */
        .tm-table-container {
          background: #ffffff !important;
          border-radius: 16px !important;
          border: 1px solid #e2e8f0 !important;
          padding: 24px !important;
          margin-bottom: 24px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.01) !important;
        }
        .tm-table-header { display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 20px !important; }
        .tm-table-header h3 { margin: 0 0 2px 0 !important; font-size: 1.1rem !important; font-weight: 700 !important; color: #0f172a !important; }
        .tm-table-header p { margin: 0 !important; color: #64748b !important; font-size: 0.85rem !important; }
        .tm-results-badge { background: #eff6ff !important; color: #1e40af !important; font-size: 0.75rem !important; font-weight: 700 !important; padding: 4px 10px; border-radius: 20px !important; }

        /* Estructura de filas de la Tabla */
        .tm-table-responsive { overflow-x: auto !important; }
        .tm-table-main { width: 100% !important; border-collapse: collapse !important; text-align: left !important; font-size: 0.88rem !important; }
        .tm-table-main th { background: #f8fafc !important; color: #475569 !important; font-weight: 700 !important; padding: 14px 16px !important; border-bottom: 1px solid #e2e8f0 !important; font-size: 0.78rem !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
        .tm-table-main td { padding: 14px 16px !important; border-bottom: 1px solid #f1f5f9 !important; vertical-align: middle !important; }
        
        .tm-code-id { background: #f1f5f9 !important; padding: 4px 8px !important; border-radius: 6px !important; font-family: monospace !important; font-size: 0.8rem !important; color: #475569 !important; font-weight: 600 !important; }
        .tm-td-bold { font-weight: 600 !important; color: #0f172a !important; }
        .tm-td-med { font-weight: 500 !important; }
        .tm-empty-table { padding: 40px !important; text-align: center !important; color: #94a3b8 !important; font-style: italic !important; }

        /* Fila de Totales */
        .tm-footer-row { background: #0f172a !important; color: #ffffff !important; font-weight: 700 !important; }
        .tm-footer-row td { padding: 16px !important; border: none !important; color: #ffffff !important; }
        .tm-text-right { text-align: right !important; font-size: 0.8rem !important; letter-spacing: 0.05em !important; color: #94a3b8 !important; }
        .tm-td-total { background: #10b981 !important; color: #fff !important; font-weight: 800 !important; font-size: 0.95rem !important; text-align: center !important; border-radius: 0 0 12px 0 !important; }

        /* Panel Transparencia */
        .tm-transparency-card { display: flex !important; gap: 20px !important; background: #f8fafc !important; padding: 24px !important; border-radius: 16px !important; border: 1px dashed #cbd5e1 !important; align-items: center !important; }
        .tm-transparency-icon { font-size: 2rem !important; background: #fff !important; padding: 10px !important; border-radius: 12px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important; line-height: 1 !important; }
        .tm-transparency-body h4 { margin: 0 0 4px 0 !important; color: #0f172a !important; font-size: 1rem !important; font-weight: 700 !important; }
        .tm-transparency-body p { margin: 0 !important; color: #64748b !important; font-size: 0.85rem !important; line-height: 1.5 !important; }

        /* Indicador Pulso */
        .tm-pulse-active { width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; display: inline-block; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); animation: tmPulse 2s infinite; }
        @keyframes tmPulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* Tooltips */
        .tm-tooltip-wrapper { position: relative; display: inline-block; margin-left: 4px; cursor: help; }
        .tm-tooltip-icon { color: #94a3b8; font-size: 0.85rem; }
        .tm-tooltip-box { visibility: hidden; width: 200px; background: #1e293b; color: #fff; text-align: center; padding: 8px 10px; border-radius: 6px; position: absolute; z-index: 99; bottom: 135%; left: 50%; transform: translateX(-50%); opacity: 0; transition: opacity 0.2s; font-size: 0.75rem; font-weight: 400; line-height: 1.4; box-shadow: 0 4px 6px rgba(0,0,0,0.1); pointer-events: none; }
        .tm-tooltip-wrapper:hover .tm-tooltip-box { visibility: visible; opacity: 1; }

        /* Loading */
        .tm-finance-loading { text-align: center; padding: 100px 20px; color: #94a3b8; font-size: 0.9rem; }
        .tm-spinner { width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #10b981; border-radius: 50%; animation: tmSpin 0.8s linear infinite; margin: 0 auto 16px; }
        @keyframes tmSpin { to { transform: rotate(360deg); } }

        .animate-tm-fade-in { animation: tmFade 0.3s ease-out; }
        @keyframes tmFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 768px) {
          .tm-finance-header { flex-direction: column !important; align-items: flex-start !important; }
          .tm-header-right { width: 100% !important; justify-content: space-between !important; }
          .tm-input-search { width: 100% !important; }
        }

        @media print {
          .tm-header-right, .tm-transparency-card, .tm-results-badge { display: none !important; }
          .tm-finance-header { border: none !important; padding: 0 !important; }
          .tm-td-total { color: #000 !important; background: none !important; font-weight: 900 !important; }
          .tm-footer-row { background: #f1f5f9 !important; color: #000 !important; border-top: 2px solid #000 !important; }
          .tm-footer-row td { color: #000 !important; }
        }
      `}</style>
    </div>
  );
};

export default Commissions;