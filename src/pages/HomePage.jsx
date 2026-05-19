import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import "../styles/HomePage.css";

const HOW = [
  { step: "01", title: "Elige tu Ruta",          desc: "Explora desde el grafiti tour hasta caminatas por la cordillera." },
  { step: "02", title: "Conecta con tu Guía",   desc: "Expertos locales que conocen cada rincón de la ciudad." },
  { step: "03", title: "Vive Medellín",          desc: "Experiencias seguras, auténticas y llenas de cultura paisa." },
];

export default function HomePage() {
  const [realTours, setRealTours] = useState([]);
  const [loading, setLoading]     = useState(true);
  
  // Estados para métricas reales de la plataforma
  const [totalGuides, setTotalGuides] = useState(0);
  const [totalToursCount, setTotalToursCount] = useState(0);
  const [totalTourists, setTotalTourists] = useState(0);
  const [cityRating, setCityRating] = useState("5.0");

  useEffect(() => {
    // 1. Escuchar Guías Activos
    const qGuides = query(collection(db, "users"), where("role", "==", "guide"), where("status", "==", "approved"));
    const unsubGuides = onSnapshot(qGuides, (snap) => {
      setTotalGuides(snap.size);
    });

    // 2. Escuchar Todas las Rutas Activas y Calcular Rating Promedio
    const qAllTours = query(collection(db, "tours"), where("isApproved", "==", true), where("active", "==", true));
    const unsubAllTours = onSnapshot(qAllTours, (snap) => {
      setTotalToursCount(snap.size);
      
      // Cálculo dinámico del rating promedio de la ciudad
      if (snap.size > 0) {
        let sumRatings = 0;
        let countWithRating = 0;
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.rating) {
            sumRatings += Number(data.rating);
            countWithRating++;
          }
        });
        if (countWithRating > 0) {
          const avg = sumRatings / countWithRating;
          setCityRating(avg.toFixed(1) + "★");
        } else {
          setCityRating("5.0★");
        }
      } else {
        setCityRating("0 ★");
      }
    });

    // 3. Escuchar Reservas Efectivas (Turistas Atendidos)
    const qBookings = query(collection(db, "bookings"), where("status", "in", ["paid", "confirmed"]));
    const unsubBookings = onSnapshot(qBookings, (snap) => {
      let touristsSum = 0;
      snap.forEach((doc) => {
        const data = doc.data();
        // Sumar pasajeros reales de cada reserva hecha en Medellín
        touristsSum += Number(data.numPersons || data.guests || 1);
      });
      setTotalTourists(touristsSum);
    });

    // 4. Cargar tarjetas del Grid del Home
    const qHomeTours = query(collection(db, "tours"), where("isApproved", "==", true), where("active", "==", true), limit(9));
    const unsubHomeTours = onSnapshot(qHomeTours, (snapshot) => {
      const toursData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      toursData.sort((a, b) => {
        const ta = a.createdAt?.seconds || 0;
        const tb = b.createdAt?.seconds || 0;
        return tb - ta;
      });
      setRealTours(toursData.slice(0, 6));
      setLoading(false);
    }, (err) => {
      console.error("Error en Home Firestore:", err);
      setLoading(false);
    });

    return () => {
      unsubGuides();
      unsubAllTours();
      unsubBookings();
      unsubHomeTours();
    };
  }, []);

  
  // Estructura de datos unificada y formateada con fallbacks elegantes
  const dynamicStats = [
    { num: totalTourists > 0 ? `${totalTourists.toLocaleString()}+` : "0", label: "Turistas satisfechos" },
    { num: totalGuides > 0 ? `${totalGuides}` : "0", label: "Guías Paisas" },
    { num: totalToursCount > 0 ? `${totalToursCount}+` : "0", label: "Rutas Locales" },
    { num: cityRating, label: "Rating Ciudad" },
  ];

  return (
    <div className="home">
      {/* HERO */}
      <section className="hero">
        <div className="hero__bg" />
        <div className="hero__content">
          <span className="hero__badge">🚠 Vive la transformación de Medellín</span>
          <h1 className="hero__title">
            Medellín desde<br /><em>adentro.</em>
          </h1>
          <p className="hero__desc">
            No somos una agencia más; somos locales apasionados. Te llevamos a descubrir
            la verdadera esencia de la Ciudad de la Eterna Primavera.
          </p>
          <div className="hero__cta">
            <Link to="/packages" className="btn btn--primary btn--lg">Explorar Tours</Link>
            <Link to="/register" className="btn btn--ghost btn--lg">Soy Guía en Medellín →</Link>
          </div>
          <div className="hero__stats">
            {dynamicStats.map(s => (
              <div key={s.label} className="hero__stat">
                <strong>{s.num}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero__visual">
          <img src="https://tourcomuna13.com/wp-content/uploads/2024/06/tour-comuna-13-1.jpg" alt="Metro Cable Medellín" />
          <div className="hero__card hero__card--1">
            <span>🚠</span>
            <div><strong>Tour Comuna 13</strong><p>Desde $80.000 COP</p></div>
          </div>
          <div className="hero__card hero__card--2">
            <span>🔥</span>
            <div><strong>Popular hoy</strong><p>Graffiti & Café</p></div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section how">
        <div className="section__inner">
          <div className="section__label">Nuestra metodología</div>
          <h2 className="section__title">Tu experiencia en tres pasos</h2>
          <div className="how__grid">
            {HOW.map(h => (
              <div key={h.step} className="how__card">
                <div className="how__step">{h.step}</div>
                <h3>{h.title}</h3>
                <p>{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TOURS REALES DESDE FIREBASE */}
      <section className="section destinations">
        <div className="section__inner">
          <div className="section__label">Experiencias Imperdibles</div>
          <h2 className="section__title">Lo mejor de Medellín y sus alrededores</h2>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
              <div className="home-spinner"></div>
              <p>Cargando rutas locales...</p>
            </div>
          ) : realTours.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <p style={{ fontSize: "1.1rem" }}>Pronto habrá tours disponibles. ¡Vuelve en breve!</p>
              <Link to="/register" className="btn btn--primary" style={{ marginTop: 20, display: "inline-block" }}>
                Sé el primer guía
              </Link>
            </div>
          ) : (
            <div className="dest__grid">
              {realTours.map(tour => (
                <Link to={`/tour/${tour.id}`} key={tour.id} className="dest__card">
                  <img
                    src={tour.image || tour.imageUrl || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"}
                    alt={tour.title || tour.name}
                    loading="lazy"
                    onError={e => { e.target.src = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"; }}
                  />
                  <div className="dest__overlay">
                    <span className="dest__tag">{tour.category || "Tour"}</span>
                    <div className="dest__info">
                      <h3>{tour.title || tour.name}</h3>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="dest__rating">★ {tour.rating || "5.0"}</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                          ${Number(tour.price).toLocaleString("es-CO")} COP
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <Link to="/packages" className="btn btn--outline">Ver todas las rutas locales →</Link>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="cta-banner">
        <div className="cta-banner__inner">
          <h2>¿Conoces Medellín como nadie?</h2>
          <p>Únete a nuestra red de guías locales y genera ingresos compartiendo tu cultura.</p>
          <Link to="/register" className="btn btn--white btn--lg">Registrarme como guía paisa</Link>
        </div>
      </section>

      <style>{`
        .home-spinner {
          width: 36px; height: 36px; border: 4px solid #e2e8f0;
          border-top-color: #ff5a3c; border-radius: 50%;
          animation: spin 1s linear infinite; margin: 0 auto 15px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}