import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";

/**
 * ApproveGuides - Módulo administrativo para validar guías pendientes.
 */
const ApproveGuides = () => {
  const { user } = useAuth();
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState({ show: false, msg: "", type: "" });
  const [selectedGuide, setSelectedGuide] = useState(null);

  // Listener en tiempo real: solo guías con status "pending"
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "guide"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGuides(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Error en Snapshot:", error);
        showToast("Error al conectar con la base de datos", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (msg, type) => {
    setNotification({ show: true, msg, type });
    setTimeout(() => setNotification({ show: false, msg: "", type: "" }), 4000);
  };

  const filteredGuides = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return guides.filter(g =>
      g.name?.toLowerCase().includes(term) ||
      g.email?.toLowerCase().includes(term)
    );
  }, [guides, searchTerm]);

  const processGuide = async (id, name, action) => {
    const isApprove = action === "approved";
    if (!window.confirm(`¿Confirmas ${isApprove ? "APROBAR" : "RECHAZAR"} a ${name}?`)) return;

    try {
      await updateDoc(doc(db, "users", id), {
        status: action,
        validatedAt: new Date().toISOString(),
        validatedBy: user?.uid || "admin"
      });
      showToast(`Guía ${isApprove ? "aprobado ✅" : "rechazado ❌"} correctamente`, "success");
      if (selectedGuide?.id === id) setSelectedGuide(null);
    } catch (error) {
      console.error(error);
      showToast("No se pudo procesar la solicitud", "error");
    }
  };

  if (loading) {
    return (
      <div className="admin-loader-container">
        <div className="spinner"></div>
        <p>Consultando registros...</p>
      </div>
    );
  }

  return (
    <div className="admin-section animate-fade-in">
      {/* TOAST */}
      {notification.show && (
        <div className={`toast-alert ${notification.type}`}>
          {notification.type === "success" ? "✅" : "❌"} {notification.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="section-header-admin">
        <div>
          <h2>Validación de Credenciales</h2>
          <p>Revisa y autoriza nuevos guías en TourMate</p>
        </div>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="badge-count">Pendientes: {guides.length}</div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="admin-content-layout">
        <div className="guides-table-container">
          {filteredGuides.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              {guides.length === 0 ? "🎉 No hay guías pendientes de validación." : "No coincide la búsqueda."}
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Fecha de Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuides.map(guide => (
                  <tr key={guide.id} className={selectedGuide?.id === guide.id ? 'selected-row' : ''}>
                    <td
                      onClick={() => setSelectedGuide(guide)}
                      style={{ cursor: "pointer", fontWeight: 600, color: "#1e293b" }}
                    >
                      {guide.name || '—'}
                    </td>
                    <td>{guide.email}</td>
                    <td>
                      {guide.createdAt?.seconds
                        ? new Date(guide.createdAt.seconds * 1000).toLocaleDateString('es-CO')
                        : "Sin fecha"}
                    </td>
                    <td className="action-cell">
                      <button
                        className="btn-approve-guide"
                        onClick={() => processGuide(guide.id, guide.name, "approved")}
                        title="Aprobar guía"
                      >
                        ✓ Aprobar
                      </button>
                      <button
                        className="btn-reject-guide"
                        onClick={() => processGuide(guide.id, guide.name, "rejected")}
                        title="Rechazar guía"
                      >
                        ✕ Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PANEL LATERAL DE DETALLE */}
        {selectedGuide && (
          <aside className="guide-detail-panel">
            <div className="detail-avatar">{selectedGuide.name?.charAt(0)?.toUpperCase() || 'G'}</div>
            <h3>{selectedGuide.name}</h3>
            <p className="detail-email">{selectedGuide.email}</p>
            {selectedGuide.phone && <p>📞 {selectedGuide.phone}</p>}
            {selectedGuide.bio && <p className="detail-bio">{selectedGuide.bio}</p>}
            <div className="detail-actions">
              <button
                className="btn-approve-guide full"
                onClick={() => processGuide(selectedGuide.id, selectedGuide.name, "approved")}
              >
                ✓ Aprobar Acceso
              </button>
              <button
                className="btn-reject-guide full"
                onClick={() => processGuide(selectedGuide.id, selectedGuide.name, "rejected")}
              >
                ✕ Rechazar
              </button>
            </div>
          </aside>
        )}
      </div>

      <style>{`
        .section-header-admin { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
        .header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .header-actions input { padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.9rem; outline: none; }
        .header-actions input:focus { border-color: #ff5a3c; }
        .badge-count { background: #fff7ed; color: #c2410c; padding: 8px 14px; border-radius: 10px; font-weight: 800; font-size: 0.85rem; }
        .admin-content-layout { display: grid; grid-template-columns: 1fr auto; gap: 25px; }
        .guides-table-container { overflow-x: auto; }
        .admin-table { width: 100%; border-collapse: collapse; }
        .admin-table th { text-align: left; padding: 12px 15px; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9; font-weight: 800; }
        .admin-table td { padding: 14px 15px; border-bottom: 1px solid #f8fafc; font-size: 0.9rem; color: #475569; }
        .admin-table tr:hover { background: #fafafa; }
        .selected-row { background: #fff7f5 !important; }
        .action-cell { display: flex; gap: 8px; }
        .btn-approve-guide { background: #dcfce7; color: #166534; border: none; padding: 7px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
        .btn-approve-guide:hover { background: #bbf7d0; }
        .btn-approve-guide.full { width: 100%; padding: 12px; margin-bottom: 8px; }
        .btn-reject-guide { background: #fef2f2; color: #ef4444; border: none; padding: 7px 14px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
        .btn-reject-guide:hover { background: #fee2e2; }
        .btn-reject-guide.full { width: 100%; padding: 12px; }
        .guide-detail-panel { width: 260px; background: white; border-radius: 18px; padding: 25px; border: 1px solid #f1f5f9; box-shadow: 0 4px 15px rgba(0,0,0,0.04); text-align: center; height: fit-content; }
        .detail-avatar { width: 70px; height: 70px; background: linear-gradient(135deg, #ff5a3c, #ff8a75); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; margin: 0 auto 15px; }
        .guide-detail-panel h3 { margin: 0 0 5px; color: #1e293b; }
        .detail-email { color: #64748b; font-size: 0.85rem; margin-bottom: 15px; word-break: break-all; }
        .detail-bio { font-size: 0.82rem; color: #94a3b8; line-height: 1.4; margin-bottom: 20px; }
        .detail-actions { margin-top: 20px; }
        .toast-alert { position: fixed; top: 20px; right: 20px; padding: 14px 20px; border-radius: 12px; font-weight: 700; z-index: 9999; animation: fadeIn 0.3s ease; }
        .toast-alert.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .toast-alert.error { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
        .admin-loader-container { text-align: center; padding: 80px; color: #94a3b8; }
        .spinner { width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #ff5a3c; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 800px) { .admin-content-layout { grid-template-columns: 1fr; } .guide-detail-panel { width: 100%; } }
      `}</style>
    </div>
  );
};

export default ApproveGuides;