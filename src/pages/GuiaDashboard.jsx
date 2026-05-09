import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import "./GuiaDashboard.css";

const GuiaDashboard = () => {

  const [activeTab, setActiveTab] = useState("dashboard");

  const [tourNombre, setTourNombre] = useState("");
  const [tourDescripcion, setTourDescripcion] = useState("");
  const [tourPrecio, setTourPrecio] = useState("");
  const [tourDuracion, setTourDuracion] = useState("");

  const [tours, setTours] = useState([
    {
      id: 1,
      nombre: "Tour Gastronómico",
      descripcion: "Explora los mejores sabores locales.",
      precio: "$55.000",
      duracion: "3 Horas"
    }
  ]);

  const [reservas] = useState([
    {
      id: 1,
      tour: "Tour Gastronómico",
      cliente: "Carlos Gómez",
      fecha: "10 Mayo",
      hora: "09:00 AM",
      personas: 3,
      estado: "Confirmada"
    },
    {
      id: 2,
      tour: "Ruta del Café",
      cliente: "Laura Pérez",
      fecha: "12 Mayo",
      hora: "11:00 AM",
      personas: 2,
      estado: "Pendiente"
    }
  ]);

  const handleCrearTour = (e) => {

    e.preventDefault();

    if (!tourNombre || !tourDescripcion || !tourPrecio || !tourDuracion) {
      alert("Completa todos los campos");
      return;
    }

    const nuevoTour = {
      id: Date.now(),
      nombre: tourNombre,
      descripcion: tourDescripcion,
      precio: tourPrecio,
      duracion: tourDuracion
    };

    setTours([...tours, nuevoTour]);

    setTourNombre("");
    setTourDescripcion("");
    setTourPrecio("");
    setTourDuracion("");

    alert("Tour creado correctamente 🚀");
  };

  return (

    <div className="layout-container">

      <aside className="sidebar-nav">

        <div className="sidebar-brand">
          TourMate ✈️
        </div>

        <nav className="nav-menu">

          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <span className="nav-icon">📊</span>
            Panel Principal
          </button>

          <button
            className={`nav-item ${activeTab === "tours" ? "active" : ""}`}
            onClick={() => setActiveTab("tours")}
          >
            <span className="nav-icon">🎒</span>
            Mis Tours
          </button>

          <button
            className={`nav-item ${activeTab === "reservas" ? "active" : ""}`}
            onClick={() => setActiveTab("reservas")}
          >
            <span className="nav-icon">📅</span>
            Reservas
          </button>

          <button
            className={`nav-item ${activeTab === "perfil" ? "active" : ""}`}
            onClick={() => setActiveTab("perfil")}
          >
            <span className="nav-icon">👤</span>
            Mi Perfil
          </button>

        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={() => signOut(auth)}>
            🚪 Cerrar Sesión
          </button>
        </div>

      </aside>

      <main className="main-viewport">

        <header className="glass-header">

          <div className="header-info">

            <h1>Panel del Guía</h1>

            <div className="experience-widget">

              <div className="level-box">

                <span className="level-txt">GUÍA VERIFICADO</span>

                <div className="xp-bar-container">
                  <div className="xp-bar-fill" style={{ width: "85%" }} />
                </div>

              </div>

              <span className="xp-label">Nivel Profesional</span>

            </div>

          </div>

          <div className="header-profile">

            <div className="profile-meta">
              <span className="profile-email">Guia TourMate</span>
              <span className="profile-status">● Activo</span>
            </div>

            <div className="profile-avatar-circle">G</div>

          </div>

        </header>

        <section className="content-render">

          {activeTab === "dashboard" && (
            <div className="view-animate">

              <div className="hero-banner">
                <div className="hero-txt">
                  <h2>Administra tus experiencias</h2>
                  <p>Crea tours profesionales y administra tus reservas.</p>
                  <button className="btn-hero-action">Crear Nuevo Tour</button>
                </div>
                <div className="hero-img">🧭</div>
              </div>

              <div className="stats-grid">

                <div className="card-stat">
                  <div className="icon-wrap">🎒</div>
                  <div className="data-wrap">
                    <span className="data-num">{tours.length}</span>
                    <span className="data-lab">Tours Creados</span>
                  </div>
                </div>

                <div className="card-stat highlight">
                  <div className="icon-wrap">📅</div>
                  <div className="data-wrap">
                    <span className="data-num">{reservas.length}</span>
                    <span className="data-lab">Reservas</span>
                  </div>
                </div>

                <div className="card-stat">
                  <div className="icon-wrap">👥</div>
                  <div className="data-wrap">
                    <span className="data-num">12</span>
                    <span className="data-lab">Clientes</span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {activeTab === "tours" && (
            <div className="view-animate">

              <div className="guide-create-tour-card">

                <h2>Crear Nuevo Tour</h2>

                <form className="guide-tour-form" onSubmit={handleCrearTour}>

                  <input
                    type="text"
                    placeholder="Nombre del Tour"
                    value={tourNombre}
                    onChange={(e) => setTourNombre(e.target.value)}
                  />

                  <textarea
                    placeholder="Descripción del Tour"
                    value={tourDescripcion}
                    onChange={(e) => setTourDescripcion(e.target.value)}
                  />

                  <div className="guide-form-grid">
                    <input
                      type="text"
                      placeholder="Precio"
                      value={tourPrecio}
                      onChange={(e) => setTourPrecio(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Duración"
                      value={tourDuracion}
                      onChange={(e) => setTourDuracion(e.target.value)}
                    />
                  </div>

                  <button type="submit">Publicar Tour</button>

                </form>

              </div>

              <div className="guide-my-tours">

                <h2>Mis Tours</h2>

                {tours.length === 0 ? (
                  <p>Aún no has creado tours.</p>
                ) : (
                  <div className="tour-list">
                    {tours.map((tour) => (
                      <div className="tour-card" key={tour.id}>
                        <div className="tour-card-top">
                          <div className="tour-image">🗺️</div>
                          <div>
                            <h3>{tour.nombre}</h3>
                            <p>{tour.descripcion}</p>
                          </div>
                        </div>
                        <div className="tour-card-bottom">
                          <span>💰 {tour.precio}</span>
                          <span>⏰ {tour.duracion}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>
          )}

          {activeTab === "reservas" && (
            <div className="view-animate">

              <div className="guide-my-tours">

                <h2>Reservas</h2>

                <div className="reservation-list">
                  {reservas.map((reserva) => (
                    <div className="reservation-card" key={reserva.id}>

                      <div className="reservation-tour">
                        <h3>{reserva.tour}</h3>
                        <p>Cliente: {reserva.cliente}</p>
                      </div>

                      <div className="reservation-info">
                        <span>📅 {reserva.fecha}</span>
                        <span>⏰ {reserva.hora}</span>
                        <span>👥 {reserva.personas}</span>
                      </div>

                      <div className={`reservation-status ${reserva.estado}`}>
                        {reserva.estado}
                      </div>

                    </div>
                  ))}
                </div>

              </div>

            </div>
          )}

        </section>

      </main>

    </div>

  );
};

export default GuiaDashboard;