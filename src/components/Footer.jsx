import React from "react";
import { Link } from "react-router-dom";
import "../styles/Footer.css"; // Ajusta la ruta según tu estructura de carpetas

export default function Footer() {
  return (
    <footer className="footer-layout">
      <div className="footer-container">
        
        {/* COLUMNA 1: BRANDING & DESCRIPCIÓN */}
        <div className="footer-brand-col">
          <Link to="/" className="footer-logo">
            Tour<span>mate</span>
          </Link>
          <p className="footer-text">
            Expertos en experiencias locales. Descubre la verdadera esencia de 
            Medellín con guías apasionados y rutas auténticas.
          </p>
          <div className="footer-socials">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i className="fab fa-facebook-f"></i>
            </a>
          </div>
        </div>

        {/* COLUMNA 2: EMPRESA */}
        <div className="footer-links-col">
          <h3>Empresa</h3>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/packages">Tours Medellín</Link></li>
            <li><Link to="/contact">Contacto</Link></li>
            <li>
              <a href="https://wompi.com/es/co/desarrolladores/" target="_blank" rel="noopener noreferrer">
                Pasarela Wompi
              </a>
            </li>
          </ul>
        </div>

        {/* COLUMNA 3: COMUNIDAD */}
        <div className="footer-links-col">
          <h3>Comunidad</h3>
          <ul>
            <li><Link to="/register">Sé un guía local</Link></li>
            <li><Link to="/dashboard">Mi Panel de Control</Link></li>
            <li><Link to="/login">Iniciar Sesión</Link></li>
            <li>
              <a href="https://comercios.wompi.co/home" target="_blank" rel="noopener noreferrer">
                Wompi Comercios
              </a>
            </li>
          </ul>
        </div>

        {/* COLUMNA 4: CONTACTO */}
        <div className="footer-links-col">
          <h3>Contacto</h3>
          <ul className="footer-contact-info">
            <li>
              <span>📍</span> Medellín - Colombia
            </li>
            <li>
              <span>✉️</span> <a href="mailto:contacto@tourmate.co">contacto@tourmate.co</a>
            </li>
            <li>
              <span>📞</span> <a href="tel:+573001234567">+57 (300) 123-4567</a>
            </li>
          </ul>
        </div>

      </div>

      {/* BARRA INFERIOR DE CRÉDITOS */}
      <div className="footer-bottom-bar">
        <p>
          © {new Date().getFullYear()} Tourmate Medellín. Hecho con <span>❤️</span> en la ciudad de la eterna primavera.
        </p>
      </div>
    </footer>
  );
}