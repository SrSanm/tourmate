import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  TrendingUp,
  Users,
  Map,
  Ticket,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import '../../styles/AdminDashboard.css';

/**
 * SiteAnalytics - Panel de Business Intelligence para admins.
 * Queries simplificadas para evitar necesidad de índices compuestos.
 */
const SiteAnalytics = () => {
  const [stats, setStats] = useState({
    totalTours: 0,
    activeGuides: 0,
    pendingApprovals: 0,
    totalUsers: 0,
    totalBookings: 0,
    estimatedRevenue: 0,
    avgTicket: 0,
    growthRate: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        // Queries sin orderBy para evitar índices compuestos en Firestore
        const [toursSnap, usersSnap, pendingToursSnap, guidesSnap, bookingsSnap] = await Promise.all([
          getDocs(collection(db, "tours")),
          getDocs(collection(db, "users")),
          getDocs(query(collection(db, "tours"), where("isApproved", "==", false))),
          getDocs(query(collection(db, "users"), where("role", "==", "guide"))),
          getDocs(collection(db, "bookings"))
        ]);

        let revenue = 0;
        let paidCount = 0;
        const allBookings = [];

        bookingsSnap.forEach(docSnap => {
          const data = docSnap.data();
          const amount = Number(data.totalPrice) || 0;
          if (data.status === 'paid' || data.status === 'completed') {
            revenue += amount;
            paidCount++;
          }
          allBookings.push({
            id: docSnap.id,
            ...data,
            // Convertimos Timestamp a Date de forma segura
            date: data.createdAt?.toDate?.() || data.paymentDate?.toDate?.() || null
          });
        });

        // Ordenamos en cliente (evita índice compuesto en Firestore)
        allBookings.sort((a, b) => {
          const ta = a.date?.getTime() || 0;
          const tb = b.date?.getTime() || 0;
          return tb - ta;
        });

        setStats({
          totalTours: toursSnap.size,
          totalUsers: usersSnap.size,
          pendingApprovals: pendingToursSnap.size,
          activeGuides: guidesSnap.size,
          totalBookings: bookingsSnap.size,
          estimatedRevenue: revenue,
          avgTicket: paidCount > 0 ? revenue / paidCount : 0,
          growthRate: 15.4
        });

        setRecentActivity(allBookings.slice(0, 6));
      } catch (error) {
        console.error("Error en analíticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [refreshKey]);

  const StatCard = ({ title, value, icon: Icon, color, trend, suffix = "", isFloat = false }) => (
    <div className="tm-stat-card">
      <div className="tm-stat-inner">
        <div className="tm-stat-icon-box" style={{ backgroundColor: `${color}15`, color }}>
          <Icon size={24} />
        </div>
        <div className="tm-stat-info">
          <span className="tm-stat-label">{title}</span>
          <div className="tm-stat-row">
            <h2 className="tm-stat-number">
              {suffix}{isFloat ? value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : value.toLocaleString('es-CO')}
            </h2>
            {trend && (
              <span className={`tm-stat-trend ${trend > 0 ? 'up' : 'down'}`}>
                {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="admin-loader-container">
      <div className="spinner-pro"></div>
      <p>Sincronizando con Firestore...</p>
    </div>
  );

  return (
    <div className="admin-analytics-v2">
      <div className="analytics-header-pro">
        <div>
          <h1>Panel de Business Intelligence</h1>
          <p>Análisis de rendimiento · {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</p>
        </div>
        <button className="tm-refresh-btn" onClick={() => setRefreshKey(k => k + 1)}>
          <Activity size={18} /> Actualizar
        </button>
      </div>

      {/* KPI GRID */}
      <div className="tm-kpi-grid">
        <StatCard title="Ingresos Brutos" value={stats.estimatedRevenue} icon={DollarSign} color="#10b981" trend={12.5} suffix="$" isFloat />
        <StatCard title="Ticket Promedio" value={stats.avgTicket} icon={TrendingUp} color="#3b82f6" suffix="$" isFloat />
        <StatCard title="Total Reservas" value={stats.totalBookings} icon={Ticket} color="#8b5cf6" trend={8.2} />
        <StatCard title="Guías Activos" value={stats.activeGuides} icon={Users} color="#ff5a3c" />
      </div>

      <div className="tm-main-grid">
        {/* TABLA DE TRANSACCIONES */}
        <div className="tm-card tm-table-card">
          <div className="card-header-pro">
            <h3>Flujo de Caja Reciente</h3>
            <span className="card-sub">Últimas {recentActivity.length} transacciones</span>
          </div>
          {recentActivity.length === 0 ? (
            <p style={{ color: '#94a3b8', padding: '20px 0' }}>No hay reservas registradas aún.</p>
          ) : (
            <div className="tm-table-wrapper">
              <table className="tm-real-table">
                <thead>
                  <tr>
                    <th>Tour / Actividad</th>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="tour-cell">
                          <Map size={14} />
                          <span>{item.tourTitle || "Tour Express"}</span>
                        </div>
                      </td>
                      <td>{item.date ? item.date.toLocaleDateString('es-CO') : '—'}</td>
                      <td className="amount-cell">${(Number(item.totalPrice) || 0).toLocaleString('es-CO')}</td>
                      <td>
                        <span className={`status-pill ${item.status === 'paid' || item.status === 'completed' ? 'paid' : 'pending'}`}>
                          {item.status === 'paid' || item.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* SALUD DE LA PLATAFORMA */}
        <div className="tm-card tm-health-card">
          <h3>Salud de la Plataforma</h3>
          <div className="health-metrics">
            <div className="health-item">
              <div className="h-info">
                <span>Tours por Aprobar</span>
                <strong>{stats.pendingApprovals} pendientes</strong>
              </div>
              <div className="h-bar">
                <div
                  className="h-fill warning"
                  style={{ width: stats.totalTours > 0 ? `${Math.min((stats.pendingApprovals / stats.totalTours) * 100, 100)}%` : '0%' }}
                ></div>
              </div>
            </div>
            <div className="health-item">
              <div className="h-info">
                <span>Guías sobre Usuarios</span>
                <strong>{stats.totalUsers > 0 ? Math.round((stats.activeGuides / stats.totalUsers) * 100) : 0}%</strong>
              </div>
              <div className="h-bar">
                <div
                  className="h-fill success"
                  style={{ width: stats.totalUsers > 0 ? `${(stats.activeGuides / stats.totalUsers) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
            <div className="health-item">
              <div className="h-info">
                <span>Tours publicados</span>
                <strong>{stats.totalTours - stats.pendingApprovals} activos</strong>
              </div>
              <div className="h-bar">
                <div
                  className="h-fill info"
                  style={{ width: stats.totalTours > 0 ? `${((stats.totalTours - stats.pendingApprovals) / stats.totalTours) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
          </div>

          <div className="tm-insight-box">
            <h4>💡 Acción Recomendada</h4>
            <p>
              {stats.pendingApprovals > 0
                ? `Tienes ${stats.pendingApprovals} tour(s) esperando aprobación. Revisarlos mejora la experiencia del guía.`
                : "¡Todo al día! No hay tours pendientes de aprobación."}
            </p>
          </div>

          {/* RESUMEN NUMÉRICO */}
          <div className="quick-stats-list">
            <div className="qs-item"><span>Total Usuarios</span><strong>{stats.totalUsers}</strong></div>
            <div className="qs-item"><span>Total Tours</span><strong>{stats.totalTours}</strong></div>
            <div className="qs-item"><span>Total Reservas</span><strong>{stats.totalBookings}</strong></div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-analytics-v2 { padding: 20px; background: #f8fafc; min-height: 100vh; }
        .analytics-header-pro { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 15px; }
        .analytics-header-pro h1 { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0; }
        .analytics-header-pro p { color: #64748b; margin: 4px 0 0; }
        .tm-refresh-btn { display: flex; gap: 8px; align-items: center; background: white; border: 1px solid #e2e8f0; padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.3s; }
        .tm-refresh-btn:hover { background: #f1f5f9; }
        .tm-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .tm-stat-card { background: white; padding: 24px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .tm-stat-inner { display: flex; align-items: center; gap: 20px; }
        .tm-stat-icon-box { padding: 15px; border-radius: 14px; display: flex; }
        .tm-stat-info { flex: 1; }
        .tm-stat-label { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .tm-stat-row { display: flex; align-items: center; gap: 10px; }
        .tm-stat-number { font-size: 1.6rem; font-weight: 800; color: #1e293b; margin: 5px 0 0 0; }
        .tm-stat-trend { font-size: 0.75rem; padding: 4px 8px; border-radius: 6px; font-weight: 700; display: flex; align-items: center; gap: 2px; }
        .tm-stat-trend.up { background: #ecfdf5; color: #10b981; }
        .tm-stat-trend.down { background: #fef2f2; color: #ef4444; }
        .tm-main-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 25px; }
        .tm-card { background: white; border-radius: 24px; padding: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); }
        .card-header-pro { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .card-header-pro h3 { margin: 0; color: #1e293b; font-size: 1.1rem; }
        .card-sub { font-size: 0.8rem; color: #94a3b8; }
        .tm-real-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .tm-real-table th { text-align: left; padding: 12px; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; }
        .tm-real-table td { padding: 16px 12px; font-size: 0.9rem; border-bottom: 1px solid #f1f5f9; }
        .tour-cell { display: flex; align-items: center; gap: 10px; font-weight: 600; color: #1e293b; }
        .amount-cell { font-weight: 700; color: #0f172a; }
        .status-pill { padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; }
        .status-pill.paid { background: #dcfce7; color: #15803d; }
        .status-pill.pending { background: #fef3c7; color: #b45309; }
        .health-metrics { margin: 20px 0; }
        .health-item { margin-bottom: 20px; }
        .h-info { display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 8px; color: #475569; }
        .h-info strong { color: #1e293b; }
        .h-bar { height: 8px; background: #f1f5f9; border-radius: 10px; overflow: hidden; }
        .h-fill { height: 100%; border-radius: 10px; transition: width 1s ease; }
        .h-fill.success { background: #10b981; }
        .h-fill.warning { background: #f59e0b; }
        .h-fill.info { background: #3b82f6; }
        .tm-insight-box { background: #eff6ff; padding: 18px; border-radius: 14px; border: 1px dashed #3b82f6; margin-bottom: 20px; }
        .tm-insight-box h4 { margin: 0 0 8px 0; color: #1d4ed8; font-size: 0.95rem; }
        .tm-insight-box p { font-size: 0.85rem; color: #1e40af; margin: 0; line-height: 1.5; }
        .quick-stats-list { border-top: 1px solid #f1f5f9; padding-top: 15px; display: flex; flex-direction: column; gap: 10px; }
        .qs-item { display: flex; justify-content: space-between; font-size: 0.9rem; color: #64748b; }
        .qs-item strong { color: #1e293b; font-weight: 700; }
        .admin-loader-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px; color: #94a3b8; }
        .spinner-pro { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #ff5a3c; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) { .tm-main-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default SiteAnalytics;