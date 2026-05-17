import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db } from "../firebase/firebaseConfig";
import { useAuth } from "../context/AuthContext";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment
} from "firebase/firestore";

const TourDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();   // ← useAuth en lugar de auth.currentUser directamente

  const [tour, setTour]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [error, setError]         = useState(null);
  const [bookingOk, setBookingOk] = useState(false);

  const [numPeople, setNumPeople]     = useState(1);
  const [bookingDate, setBookingDate] = useState("");
  const [activeTab, setActiveTab]     = useState("descripcion");
  const [openFaq, setOpenFaq]         = useState(null);

  // ── Fecha mínima: mañana ──
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  // ── Carga del tour ──
  useEffect(() => {
    if (!id) return;
    const fetchTour = async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "tours", id));
        if (!snap.exists()) { setError("Este tour no existe o fue eliminado."); return; }
        setTour({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error(err);
        setError("No pudimos cargar el tour. Verifica tu conexión.");
      } finally {
        setLoading(false);
      }
    };
    fetchTour();
  }, [id]);

  // ── Reserva ──
  const handleBooking = async () => {
    if (!user) { navigate("/login"); return; }
    if (profile?.role === "guide" || profile?.role === "admin") {
      alert("Solo los turistas pueden realizar reservas."); return;
    }
    if (!bookingDate) { alert("Selecciona una fecha para el tour."); return; }
    if (!tour) return;

    setIsReserving(true);
    try {
      const safeTitle = tour.title || tour.name || "Tour Medellín";
      const safePrice = Number(tour.price || 0);

      // ⚠️ CLAVE: usamos "userId" (no touristId) para que MyBookings y las reglas de Firestore lo lean correctamente
      await addDoc(collection(db, "bookings"), {
        tourId:       tour.id,
        guideId:      tour.guideId || "",
        userId:       user.uid,                          // campo estándar del proyecto
        touristName:  user.displayName || profile?.name || "Turista",
        touristEmail: user.email || "",
        tourTitle:    safeTitle,
        tourImage:    tour.image || tour.imageUrl || "",
        pricePerPerson: safePrice,
        numPersons:   Number(numPeople),                 // campo estándar (MyBookings usa numPersons)
        totalPrice:   safePrice * Number(numPeople),
        date:         bookingDate,
        status:       "pending",
        meetingPoint: tour.meetingPoint || "Medellín Centro",
        createdAt:    serverTimestamp()
      });

      // Incrementar contador de reservas en el tour
      await updateDoc(doc(db, "tours", id), {
        totalReservations: increment(1)
      });

      setBookingOk(true);
    } catch (err) {
      console.error("Booking Error:", err);
      alert("No pudimos completar la reserva. Intenta de nuevo.");
    } finally {
      setIsReserving(false);
    }
  };

  // ── FAQ ──
  const faqData = [
    { q: "¿Qué debo llevar?", a: tour?.whatToBring || "Ropa cómoda, protector solar, documento de identidad y ganas de explorar." },
    { q: "¿Hay límite de edad?", a: "El tour es apto para todas las edades. Consulta al guía si tienes necesidades especiales." },
    { q: "¿Qué pasa si llueve?", a: "El tour se realiza en casi cualquier clima. En caso de fuerza mayor el guía te contactará para reprogramar." },
    { q: "¿Cómo pago?", a: "Después de que el guía confirme tu reserva, podrás pagar desde tu panel de reservas." },
  ];

  if (loading) return (
    <div className="tm-loading-screen">
      <div className="tm-loader-ring" />
      <p>Cargando experiencia...</p>
    </div>
  );

  if (error) return (
    <div className="tm-error-container">
      <div style={{ fontSize: "3rem" }}>📍</div>
      <h2>{error}</h2>
      <button onClick={() => navigate("/packages")}>Ver todos los tours</button>
    </div>
  );

  const image    = tour.image || tour.imageUrl || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200";
  const title    = tour.title || tour.name || "Tour Medellín";
  const price    = Number(tour.price || 0);
  const capacity = Number(tour.capacity || 10);
  const taken    = Number(tour.totalReservations || 0);
  const spotsLeft = Math.max(capacity - taken, 0);

  return (
    <div className="tm-detail-wrapper">

      {/* HERO */}
      <section className="tm-gallery-hero">
        <div className="hero-main-img" style={{ backgroundImage: `url(${image})` }}>
          <div className="hero-overlay">
            <div className="hero-tags">
              <span className="tag-cat">{tour.category || "Cultura"}</span>
              <span className="tag-rating">⭐ {tour.rating || "5.0"}</span>
              {spotsLeft <= 3 && spotsLeft > 0 && (
                <span className="tag-urgency">🔥 ¡Solo {spotsLeft} cupos!</span>
              )}
            </div>
            <h1>{title}</h1>
            <p className="hero-location">📍 {tour.location || "Medellín, Antioquia"}</p>
          </div>
        </div>
      </section>

      {/* LAYOUT */}
      <div className="tm-content-layout">

        {/* ── MAIN INFO ── */}
        <main className="tm-main-info">

          <nav className="tm-tabs-nav">
            {["descripcion", "itinerario", "incluye", "faq"].map(tab => (
              <button
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                {{ descripcion: "Descripción", itinerario: "Itinerario", incluye: "Incluye", faq: "FAQ" }[tab]}
              </button>
            ))}
          </nav>

          {activeTab === "descripcion" && (
            <div>
              <p className="description-text">{tour.description || "Una experiencia única diseñada por locales para vivir la verdadera esencia de Medellín."}</p>
              <div className="key-features">
                <div className="feature"><span className="feat-icon">⏱</span><div><strong>Duración</strong><p>{tour.duration || "4 horas"}</p></div></div>
                <div className="feature"><span className="feat-icon">👥</span><div><strong>Grupo máx.</strong><p>{capacity} personas</p></div></div>
                <div className="feature"><span className="feat-icon">🗣</span><div><strong>Idioma</strong><p>{tour.language || "Español"}</p></div></div>
              </div>
            </div>
          )}

          {activeTab === "itinerario" && (
            <div className="itinerary-list">
              {tour.itinerary?.length > 0
                ? tour.itinerary.map((item, i) => (
                    <div key={i} className="itinerary-step">
                      <span className="step-num">{String(i + 1).padStart(2, "0")}</span>
                      <p>{item}</p>
                    </div>
                  ))
                : (
                  <>
                    <div className="itinerary-step"><span className="step-num">01</span><p>Punto de encuentro y bienvenida por el guía local.</p></div>
                    <div className="itinerary-step"><span className="step-num">02</span><p>Recorrido por los puntos principales de la experiencia.</p></div>
                    <div className="itinerary-step"><span className="step-num">03</span><p>Parada para fotos y tiempo libre en zonas destacadas.</p></div>
                    <div className="itinerary-step"><span className="step-num">04</span><p>Cierre del tour y despedida en el punto de partida.</p></div>
                  </>
                )
              }
            </div>
          )}

          {activeTab === "incluye" && (
            <div className="included-grid">
              {(tour.includes?.length > 0
                ? tour.includes
                : ["Guía certificado", "Seguro básico", "Hidratación", "Fotos del recorrido"]
              ).map((item, i) => (
                <div key={i} className="included-item">✅ {item}</div>
              ))}
              {(tour.notIncludes?.length > 0) && (
                <>
                  <div style={{ gridColumn: "1/-1", fontWeight: 700, marginTop: 15, color: "#ef4444" }}>No incluye:</div>
                  {tour.notIncludes.map((item, i) => (
                    <div key={i} className="included-item not">❌ {item}</div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === "faq" && (
            <div>
              {faqData.map((f, i) => (
                <div key={i} className={`tm-faq-item ${openFaq === i ? "active" : ""}`}>
                  <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    {f.q}<span>{openFaq === i ? "−" : "+"}</span>
                  </button>
                  {openFaq === i && <div className="faq-answer"><p>{f.a}</p></div>}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ── SIDEBAR RESERVA ── */}
        <aside className="tm-sidebar">
          <div className="tm-booking-card">
            {bookingOk ? (
              <div className="booking-success">
                <div style={{ fontSize: "3rem", marginBottom: 10 }}>🎉</div>
                <h3>¡Reserva enviada!</h3>
                <p>El guía revisará tu solicitud. Te notificaremos cuando la confirme.</p>
                <button className="btn-primary-reserva" style={{ marginTop: 20 }} onClick={() => navigate("/tourist/my-bookings")}>
                  Ver mis reservas
                </button>
              </div>
            ) : (
              <>
                <p className="price-label">PRECIO POR PERSONA</p>
                <div className="price-amount">
                  <span className="currency">$</span>
                  <span className="value">{price.toLocaleString("es-CO")}</span>
                  <span className="per">COP</span>
                </div>

                <div className="form-input">
                  <label>📅 Fecha del tour</label>
                  <input
                    type="date"
                    min={minDateStr}
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                  />
                </div>

                <div className="form-input">
                  <label>👥 Número de personas</label>
                  <div className="people-stepper">
                    <button onClick={() => setNumPeople(p => Math.max(1, p - 1))}>−</button>
                    <input type="number" readOnly value={numPeople} style={{ width: 60 }} />
                    <button onClick={() => setNumPeople(p => Math.min(spotsLeft || capacity, p + 1))}>+</button>
                  </div>
                </div>

                <div className="booking-summary">
                  <div className="summary-row">
                    <span>${price.toLocaleString("es-CO")} × {numPeople}</span>
                    <span>${(price * numPeople).toLocaleString("es-CO")}</span>
                  </div>
                  <div className="summary-row total">
                    <strong>Total</strong>
                    <strong>${(price * numPeople).toLocaleString("es-CO")} COP</strong>
                  </div>
                </div>

                {!user ? (
                  <Link to="/login" className="btn-primary-reserva" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                    Inicia sesión para reservar
                  </Link>
                ) : (
                  <button className="btn-primary-reserva" onClick={handleBooking} disabled={isReserving || spotsLeft === 0}>
                    {isReserving ? "Enviando reserva..." : spotsLeft === 0 ? "Sin cupos disponibles" : "Reservar ahora"}
                  </button>
                )}

                <p className="card-footer-text">No se cobra hasta que el guía confirme</p>
              </>
            )}
          </div>

          {/* Info del guía */}
          {tour.guideName && (
            <div className="guide-small-card">
              <div className="guide-avatar-sm">{tour.guideName.charAt(0).toUpperCase()}</div>
              <div>
                <p className="guide-name">{tour.guideName}</p>
                <span className="guide-badge">✓ Guía Verificado TourMate</span>
              </div>
            </div>
          )}
        </aside>
      </div>

      <style>{`
        .tm-detail-wrapper { font-family: 'Inter', system-ui, sans-serif; background: #f8fafc; padding-bottom: 60px; }
        .tm-gallery-hero { height: 60vh; overflow: hidden; position: relative; }
        .hero-main-img { width: 100%; height: 100%; background-size: cover; background-position: center; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.8), transparent); display: flex; flex-direction: column; justify-content: flex-end; padding: 60px; color: white; }
        .hero-overlay h1 { font-size: 3rem; font-weight: 900; margin: 10px 0; }
        .hero-location { color: rgba(255,255,255,0.85); margin: 0; font-size: 1.1rem; }
        .hero-tags { display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
        .tag-cat { background: #ff5a3c; padding: 6px 14px; border-radius: 30px; font-size: .8rem; font-weight: 700; }
        .tag-rating { background: rgba(255,255,255,.2); backdrop-filter: blur(4px); padding: 6px 14px; border-radius: 30px; font-size: .8rem; font-weight: 700; }
        .tag-urgency { background: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 30px; font-size: .8rem; font-weight: 700; }
        .tm-content-layout { max-width: 1200px; margin: -60px auto 0; padding: 0 20px; display: grid; grid-template-columns: 1fr 380px; gap: 30px; position: relative; z-index: 10; }
        .tm-main-info { background: white; border-radius: 24px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,.06); }
        .tm-tabs-nav { display: flex; gap: 25px; border-bottom: 1px solid #eee; margin-bottom: 30px; }
        .tm-tabs-nav button { background: none; border: none; padding: 14px 0; cursor: pointer; font-weight: 700; color: #94a3b8; font-size: 0.95rem; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: 0.2s; }
        .tm-tabs-nav button.active { color: #ff5a3c; border-bottom-color: #ff5a3c; }
        .description-text { line-height: 1.8; color: #475569; font-size: 1.05rem; }
        .key-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 30px; }
        .feature { background: #f8fafc; padding: 18px; border-radius: 14px; display: flex; gap: 12px; align-items: flex-start; }
        .feat-icon { font-size: 1.5rem; }
        .feature strong { display: block; color: #1e293b; font-size: 0.85rem; margin-bottom: 3px; }
        .feature p { color: #64748b; margin: 0; font-size: 0.9rem; }
        .itinerary-list { display: flex; flex-direction: column; gap: 14px; }
        .itinerary-step { display: flex; align-items: flex-start; gap: 15px; background: #f8fafc; padding: 16px; border-radius: 12px; }
        .step-num { background: #ff5a3c; color: white; font-weight: 800; font-size: 0.8rem; padding: 4px 8px; border-radius: 8px; flex-shrink: 0; }
        .itinerary-step p { margin: 0; color: #475569; line-height: 1.5; }
        .included-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .included-item { background: #f0fdf4; padding: 14px; border-radius: 12px; font-weight: 600; color: #166534; font-size: 0.9rem; }
        .included-item.not { background: #fef2f2; color: #ef4444; }
        .tm-faq-item { border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
        .faq-question { width: 100%; background: none; border: none; padding: 20px; display: flex; justify-content: space-between; font-weight: 700; cursor: pointer; color: #1e293b; font-size: 0.95rem; }
        .faq-answer { padding: 0 20px 20px; color: #64748b; line-height: 1.6; }
        .tm-sidebar { position: sticky; top: 20px; height: fit-content; }
        .tm-booking-card { background: white; border-radius: 24px; padding: 30px; box-shadow: 0 15px 50px rgba(0,0,0,.08); }
        .price-label { color: #94a3b8; font-size: .75rem; font-weight: 800; text-transform: uppercase; margin: 0; }
        .price-amount { display: flex; align-items: baseline; gap: 5px; margin: 8px 0 20px; }
        .currency { font-size: 1.3rem; color: #ff5a3c; font-weight: 900; }
        .value { font-size: 2.2rem; font-weight: 900; color: #1e293b; }
        .per { color: #64748b; font-size: 0.9rem; }
        .form-input { margin-bottom: 18px; }
        .form-input label { display: block; margin-bottom: 8px; font-size: .82rem; font-weight: 700; color: #64748b; }
        .form-input input { width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; transition: 0.2s; box-sizing: border-box; }
        .form-input input:focus { border-color: #ff5a3c; outline: none; }
        .people-stepper { display: flex; align-items: center; gap: 10px; }
        .people-stepper button { width: 40px; height: 40px; border: 1.5px solid #e2e8f0; border-radius: 10px; background: white; cursor: pointer; font-weight: 900; font-size: 1.2rem; transition: 0.2s; }
        .people-stepper button:hover { background: #f1f5f9; }
        .people-stepper input { text-align: center; font-weight: 700; }
        .booking-summary { background: #f8fafc; border-radius: 14px; padding: 18px; margin: 18px 0; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: #64748b; font-size: 0.9rem; }
        .summary-row.total { border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-bottom: 0; color: #1e293b; font-size: 1rem; }
        .btn-primary-reserva { width: 100%; border: none; background: #ff5a3c; color: white; padding: 18px; border-radius: 16px; font-size: 1rem; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .btn-primary-reserva:hover:not(:disabled) { background: #e0482b; transform: translateY(-2px); box-shadow: 0 10px 25px rgba(255,90,60,0.3); }
        .btn-primary-reserva:disabled { opacity: .7; cursor: not-allowed; }
        .card-footer-text { text-align: center; margin-top: 12px; color: #94a3b8; font-size: .8rem; }
        .booking-success { text-align: center; padding: 10px 0; }
        .booking-success h3 { color: #1e293b; font-size: 1.4rem; margin: 0 0 8px; }
        .booking-success p { color: #64748b; line-height: 1.5; }
        .guide-small-card { margin-top: 18px; background: white; border-radius: 18px; padding: 18px; display: flex; gap: 14px; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,.05); border: 1px solid #f1f5f9; }
        .guide-avatar-sm { width: 50px; height: 50px; background: linear-gradient(135deg, #ff5a3c, #ff8a75); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 800; flex-shrink: 0; }
        .guide-name { font-weight: 700; margin: 0 0 4px; color: #1e293b; }
        .guide-badge { font-size: .78rem; color: #10b981; font-weight: 600; }
        .tm-loading-screen, .tm-error-container { min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; color: #64748b; }
        .tm-loader-ring { width: 50px; height: 50px; border: 5px solid #eee; border-top: 5px solid #ff5a3c; border-radius: 50%; animation: spin 1s linear infinite; }
        .tm-error-container button { background: #ff5a3c; color: white; border: none; padding: 12px 28px; border-radius: 12px; font-weight: 700; cursor: pointer; margin-top: 10px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .tm-content-layout { grid-template-columns: 1fr; }
          .hero-overlay { padding: 30px; }
          .hero-overlay h1 { font-size: 2rem; }
          .key-features { grid-template-columns: 1fr; }
          .included-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default TourDetailPage;