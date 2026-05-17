import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import "../styles/PackagesPage.css";

const CATS = [
  { key: "todos",           label: "Todos" },
  { key: "Cultura y Patrimonio", label: "🏛 Cultura" },
  { key: "Naturaleza",      label: "🌿 Naturaleza" },
  { key: "Gastronomía",     label: "🍲 Gastronomía" },
  { key: "Vida Nocturna",   label: "💃 Nocturno" },
];

export default function PackagesPage() {
  const [tours, setTours]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat]       = useState("todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Solo tours aprobados y activos (sin orderBy → sin índice compuesto)
    const q = query(
      collection(db, "tours"),
      where("isApproved", "==", true),
      where("active", "==", true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const toursData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar en cliente por fecha
      toursData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTours(toursData);
      setLoading(false);
    }, (err) => {
      console.error("Error cargando tours:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filtered = tours.filter(p => {
    const matchCat    = cat === "todos" || p.category === cat;
    const searchLower = search.toLowerCase();
    const matchSearch = !search ||
      (p.title || p.name || "").toLowerCase().includes(searchLower) ||
      (p.location || "").toLowerCase().includes(searchLower) ||
      (p.guideName || "").toLowerCase().includes(searchLower);
    return matchCat && matchSearch;
  });

  return (
    <div className="packages-page">
      <div className="pkg-hero">
        <div className="pkg-hero__content">
          <span className="pkg-hero__label">Explora Medellín</span>
          <h1 className="pkg-hero__title">Tours y Experiencias</h1>
          <div className="pkg-hero__search">
            <span className="pkg-hero__search-icon">🔍</span>
            <input
              type="text"
              placeholder="¿Qué quieres descubrir hoy?"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#94a3b8" }}>✕</button>
            )}
          </div>
        </div>
      </div>

      <div className="pkg-filters">
        <div className="pkg-filters__inner">
          {CATS.map(c => (
            <button
              key={c.key}
              className={`pkg-filter-btn ${cat === c.key ? "active" : ""}`}
              onClick={() => setCat(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pkg-content">
        {loading ? (
          <div className="pkg-loading">
            <div className="gd-spinner"></div>
            <p>Buscando las mejores rutas...</p>
          </div>
        ) : (
          <>
            <p className="results-count" style={{ color: "#94a3b8", marginBottom: 20, fontSize: "0.9rem" }}>
              {filtered.length} {filtered.length === 1 ? "experiencia encontrada" : "experiencias encontradas"}
            </p>
            <div className="pkg-grid">
              {filtered.length === 0 ? (
                <div className="pkg-empty">
                  <p>No encontramos rutas que coincidan.</p>
                  <button className="btn btn--outline" onClick={() => { setCat("todos"); setSearch(""); }}>
                    Ver todos los tours
                  </button>
                </div>
              ) : (
                filtered.map(p => (
                  <div key={p.id} className="pkg-card">
                    <div className="pkg-card__img-wrap">
                      <img
                        src={p.image || p.imageUrl || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"}
                        alt={p.title || p.name}
                        loading="lazy"
                        onError={e => { e.target.src = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"; }}
                      />
                      {p.badge && <span className="pkg-card__badge">{p.badge}</span>}
                      {p.duration && <span className="pkg-card__duration">⏱ {p.duration}</span>}
                    </div>
                    <div className="pkg-card__body">
                      <p className="pkg-card__location">📍 {p.location || "Medellín, Antioquia"}</p>
                      <h3 className="pkg-card__name">{p.title || p.name}</h3>
                      <p className="pkg-card__guide">Con guía: <strong>{p.guideName || "Experto Local"}</strong></p>
                      <div className="pkg-card__footer">
                        <div className="pkg-card__rating">★ {p.rating || "5.0"}</div>
                        <div className="pkg-card__price">
                          ${Number(p.price).toLocaleString("es-CO")}<small> COP</small>
                        </div>
                      </div>
                      <Link to={`/tour/${p.id}`} className="pkg-card__cta">Ver detalles →</Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}