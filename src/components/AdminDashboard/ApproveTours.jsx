import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import "../../styles/AdminDashboard.css";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";

const AdminApproveTours = () => {
  const { user } = useAuth();
  const { showNotification } = useUI();

  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [stats, setStats] = useState({ pending: 0, approved: 0 });
  const [selectedTour, setSelectedTour] = useState(null);

  useEffect(() => {
    setLoading(true);

    // "pending" = tours donde isApproved es false O donde el campo no existe
    // Firestore no soporta "campo no existe" directamente, así que consultamos ambos estados
    let q;
    if (filter === "pending") {
      q = query(
        collection(db, "tours"),
        where("isApproved", "==", false)
      );
    } else {
      q = query(
        collection(db, "tours"),
        where("isApproved", "==", true)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const toursData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        setTours(toursData);
        setStats((prev) =>
          filter === "pending"
            ? { ...prev, pending: toursData.length }
            : { ...prev, approved: toursData.length }
        );
        setLoading(false);
      },
      (error) => {
        console.error(error);
        showNotification?.("Error al cargar los tours", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [filter]);

  const handleApprove = async (id) => {
    try {
      const tourRef = doc(db, "tours", id);
      await updateDoc(tourRef, {
        isApproved: true,
        active: true,
        approvedAt: serverTimestamp(),
        approvedBy: user?.uid || "admin",
        status: "published"
      });
      showNotification?.("Tour aprobado y publicado ✅", "success");
      setSelectedTour(null);
    } catch (error) {
      console.error(error);
      showNotification?.("Error al aprobar el tour", "error");
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("¿Eliminar este tour definitivamente?")) return;
    try {
      await deleteDoc(doc(db, "tours", id));
      showNotification?.("Tour eliminado", "success");
      setSelectedTour(null);
    } catch (error) {
      console.error(error);
      showNotification?.("Error al eliminar el tour", "error");
    }
  };

  if (loading) {
    return (
      <div className="admin-loading-screen">
        <div className="spinner-admin"></div>
        <p>Cargando tours...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-wrapper">
      <div className="section-header-admin">
        <div>
          <h2>Curaduría de Tours</h2>
          <p>Revisa y aprueba las experiencias enviadas por los guías</p>
        </div>
        <div className="header-stats-pills">
          <span className="pill pending-pill">⏳ Pendientes: {stats.pending}</span>
          <span className="pill approved-pill">✅ Aprobados: {stats.approved}</span>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={filter === "pending" ? "active" : ""}
          onClick={() => setFilter("pending")}
        >
          Pendientes {stats.pending > 0 && <span className="badge-count-sm">{stats.pending}</span>}
        </button>
        <button
          className={filter === "approved" ? "active" : ""}
          onClick={() => setFilter("approved")}
        >
          Aprobados
        </button>
      </div>

      {tours.length === 0 ? (
        <div className="empty-admin-state">
          <p>{filter === "pending" ? "🎉 No hay tours pendientes por revisar." : "Aún no hay tours aprobados."}</p>
        </div>
      ) : (
        <div className="tours-admin-grid">
          {tours.map((tour) => (
            <div key={tour.id} className="tour-admin-card">
              {tour.image && (
                <div className="tour-admin-img">
                  <img src={tour.image} alt={tour.title || tour.name} />
                </div>
              )}
              <div className="tour-admin-body">
                <h3>{tour.title || tour.name || "Sin título"}</h3>
                <p className="guide-name-tag">👤 {tour.guideName || "Guía desconocido"}</p>
                {tour.category && <p className="cat-tag">🏷️ {tour.category}</p>}
                {tour.price && <p className="price-tag-admin">💰 ${Number(tour.price).toLocaleString()} COP</p>}
                {tour.description && (
                  <p className="desc-preview">{tour.description.substring(0, 100)}...</p>
                )}
                <div className="tour-admin-actions">
                  {filter === "pending" ? (
                    <>
                      <button className="btn-approve-tour" onClick={() => handleApprove(tour.id)}>
                        ✓ Aprobar y Publicar
                      </button>
                      <button className="btn-reject-tour" onClick={() => handleReject(tour.id)}>
                        ✕ Eliminar
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="published-label">✅ Publicado</span>
                      <button className="btn-reject-tour" onClick={() => handleReject(tour.id)}>
                        ✕ Dar de baja
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .section-header-admin { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; flex-wrap: wrap; gap: 15px; }
        .header-stats-pills { display: flex; gap: 10px; flex-wrap: wrap; }
        .pill { padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 0.8rem; }
        .pending-pill { background: #fff7ed; color: #c2410c; }
        .approved-pill { background: #f0fdf4; color: #166534; }
        .badge-count-sm { background: #ff5a3c; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; margin-left: 6px; }
        .admin-tabs { display: flex; gap: 8px; margin-bottom: 25px; }
        .admin-tabs button { padding: 10px 22px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; font-weight: 700; cursor: pointer; color: #64748b; transition: 0.2s; display: flex; align-items: center; }
        .admin-tabs button.active { background: #1e293b; color: white; border-color: #1e293b; }
        .empty-admin-state { text-align: center; padding: 60px 20px; color: #94a3b8; font-size: 1.1rem; }
        .tours-admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .tour-admin-card { background: white; border-radius: 18px; overflow: hidden; border: 1px solid #f1f5f9; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .tour-admin-img { height: 160px; overflow: hidden; }
        .tour-admin-img img { width: 100%; height: 100%; object-fit: cover; }
        .tour-admin-body { padding: 18px; }
        .tour-admin-body h3 { font-size: 1.1rem; color: #1e293b; margin: 0 0 8px 0; }
        .guide-name-tag, .cat-tag, .price-tag-admin { font-size: 0.85rem; color: #64748b; margin: 3px 0; }
        .desc-preview { font-size: 0.82rem; color: #94a3b8; margin: 8px 0 15px 0; line-height: 1.4; }
        .tour-admin-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .btn-approve-tour { background: #10b981; color: white; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; flex: 1; }
        .btn-approve-tour:hover { background: #059669; }
        .btn-reject-tour { background: #fef2f2; color: #ef4444; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; flex: 1; }
        .btn-reject-tour:hover { background: #fee2e2; }
        .published-label { color: #10b981; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; flex: 1; }
        .spinner-admin { width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #ff5a3c; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
        .admin-loading-screen { text-align: center; padding: 80px; color: #94a3b8; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default AdminApproveTours;