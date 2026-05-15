import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebaseConfig';
import ModalNotificacion from "../../components/ModalNotificacion";
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
import '../../styles/AdminDashboard.css';

/**
 * COMPONENTE: AdminApproveTours
 * Propósito: Gestión profesional de curaduría para TourMate Medellín.
 * Corrige errores de anidación de tablas y variables no definidas.
 */
const AdminApproveTours = () => {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending' o 'approved'
  const [stats, setStats] = useState({ pending: 0, approved: 0 });

  // --- MONITOREO DE DATOS EN TIEMPO REAL ---
  useEffect(() => {
    setLoading(true);
    
    // Consulta filtrada según pestaña
    const q = query(
      collection(db, "tours"),
      where("isApproved", "==", filter === 'approved')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const toursData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTours(toursData);
      
      // Actualización de contadores dinámicos
      if (filter === 'pending') {
        setStats(prev => ({ ...prev, pending: toursData.length }));
      } else {
        setStats(prev => ({ ...prev, approved: toursData.length }));
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error crítico en el motor de tours:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  // --- ACCIONES DE ADMINISTRACIÓN ---
  const handleApprove = async (id) => {
    try {
      const tourRef = doc(db, "tours", id);
      await updateDoc(tourRef, {
        isApproved: true,
        active: true,
        approvedAt: serverTimestamp(),
        status: 'published'
      });
      alert("✅ Tour publicado exitosamente en el Home.");
    } catch (error) {
      console.error("Error al aprobar:", error);
      alert("No se pudo aprobar el tour. Revisa los permisos.");
    }
  };

  const handleReject = async (id) => {
    const confirmDelete = window.confirm("¿Estás seguro de eliminar esta propuesta? Esta acción es irreversible.");
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, "tours", id));
      } catch (error) {
        alert("Error al eliminar el documento.");
      }
    }
  };

  return (
    <div className="admin-dashboard-wrapper">
      {/* 1. HEADER DE CONTROL */}
      <header className="admin-main-header">
        <div className="header-title">
          <h1>Curaduría de Experiencias</h1>
          <p>Validación de rutas y calidad de guías para Medellín.</p>
        </div>
        
        <div className="admin-stats-bar">
          <div className="stat-item highlight">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Por Validar</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.approved}</span>
            <span className="stat-label">Publicados</span>
          </div>
        </div>
      </header>

      {/* 2. SISTEMA DE TABS */}
      <nav className="admin-tabs">
        <button 
          className={filter === 'pending' ? 'active' : ''} 
          onClick={() => setFilter('pending')}
        >
          ⏱️ Esperando Aprobación
        </button>
        <button 
          className={filter === 'approved' ? 'active' : ''} 
          onClick={() => setFilter('approved')}
        >
          🌟 Tours Activos
        </button>
      </nav>

      {/* 3. CONTENEDOR DE DATOS (TABLA LIMPIA) */}
      <div className="admin-table-container">
        {loading ? (
          <div className="admin-loading-screen">
            <div className="spinner-admin"></div>
            <p>Conectando con la base de datos de TourMate...</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="admin-empty-state">
            <div className="empty-icon">📂</div>
            <h3>No hay registros</h3>
            <p>No se encontraron tours con el estado "{filter}".</p>
          </div>
        ) : (
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Experiencia / Tour</th>
                <th>Guía Responsable</th>
                <th>Ubicación</th>
                <th>Precio</th>
                <th>Estado / Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tours.map((tour) => (
                <tr key={tour.id} className="admin-table-row">
                  <td>
                    <div className="admin-cell-image">
                      <img src={tour.image || 'https://via.placeholder.com/150'} alt="Tour" />
                      <div className="admin-cell-text">
                        <strong>{tour.name || tour.title}</strong>
                        <span className="category-badge">{tour.category}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-guide-info">
                      <p>{tour.guideName || "Guía Independiente"}</p>
                      <small>{tour.guideEmail || "Sin email"}</small>
                    </div>
                  </td>
                  <td>
                    <span className="location-text">📍 {tour.location || 'Medellín'}</span>
                  </td>
                  <td>
                    <div className="admin-price-info">
                      <strong>${Number(tour.price).toLocaleString()}</strong>
                      <small>COP</small>
                    </div>
                  </td>
                  <td className="admin-actions-cell">
                    {filter === 'pending' ? (
                      <div className="btn-group">
                        <button 
                          onClick={() => handleApprove(tour.id)} 
                          className="btn-action-approve"
                        >
                          Aprobar
                        </button>
                        <button 
                          onClick={() => handleReject(tour.id)} 
                          className="btn-action-reject"
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <span className="status-published-tag">✅ En línea</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. ESTILOS REFORZADOS */}
      <style>{`
        .admin-dashboard-wrapper {
          padding: 40px;
          background: #f1f5f9;
          min-height: 100vh;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        .admin-main-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 40px;
        }

        .header-title h1 { 
          font-size: 2.2rem; 
          font-weight: 800; 
          color: #1e293b; 
          margin: 0; 
        }

        .admin-stats-bar { display: flex; gap: 20px; }
        .stat-item {
          background: white;
          padding: 15px 25px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .stat-item.highlight { border-top: 4px solid #ff5a3c; }
        .stat-value { font-size: 1.5rem; font-weight: 800; color: #0f172a; }
        .stat-label { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; }

        .admin-tabs { display: flex; gap: 15px; margin-bottom: 25px; }
        .admin-tabs button {
          padding: 12px 24px;
          background: #e2e8f0;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          color: #475569;
          transition: all 0.3s;
        }
        .admin-tabs button.active {
          background: #ff5a3c;
          color: white;
          box-shadow: 0 10px 15px -3px rgba(255, 90, 60, 0.3);
        }

        .admin-table-container {
          background: white;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05);
        }

        .admin-data-table { width: 100%; border-collapse: collapse; }
        .admin-data-table th {
          background: #f8fafc;
          padding: 20px;
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          color: #94a3b8;
          letter-spacing: 0.05em;
        }

        .admin-table-row:hover { background: #f8fafc; }
        .admin-data-table td { padding: 20px; border-bottom: 1px solid #f1f5f9; }

        .admin-cell-image { display: flex; align-items: center; gap: 15px; }
        .admin-cell-image img { 
          width: 50px; height: 50px; border-radius: 12px; object-fit: cover; 
        }
        .category-badge {
          background: #eff6ff;
          color: #3b82f6;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          display: inline-block;
          margin-top: 4px;
        }

        .admin-price-info strong { font-size: 1.1rem; color: #0f172a; }
        .admin-price-info small { margin-left: 4px; color: #94a3b8; }

        .btn-group { display: flex; gap: 10px; }
        .btn-action-approve {
          background: #10b981; color: white; border: none;
          padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer;
        }
        .btn-action-reject {
          background: #fee2e2; color: #ef4444; border: none;
          padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer;
        }
        .status-published-tag {
          color: #10b981; font-weight: 800; font-size: 0.85rem;
        }

        .admin-loading-screen { padding: 80px; text-align: center; }
        .spinner-admin {
          width: 40px; height: 40px; border: 4px solid #f3f3f3;
          border-top: 4px solid #ff5a3c; border-radius: 50%;
          animation: spin 1s linear infinite; margin: 0 auto 20px;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .admin-empty-state { padding: 80px; text-align: center; color: #94a3b8; }
        .empty-icon { font-size: 3rem; margin-bottom: 15px; }
      `}</style>
    </div>
  );
};

export default AdminApproveTours;