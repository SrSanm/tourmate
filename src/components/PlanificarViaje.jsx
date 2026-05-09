import React, { useState } from 'react';
import './PlanificarViaje.css';
import { db } from '../firebase/firebaseConfig'; // Importamos la DB [cite: 3]
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const PlanificarViaje = () => {
  const { user } = useAuth(); // Obtenemos al usuario logueado
  const [selectedTour, setSelectedTour] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const recorridos = [
  {
    id: 1,
    nombre: "Tour Gastronómico",
    precio: "$55.000",
    icon: "🍲",
    duracion: "3h",
    descripcion:
      "Descubre la mejor comida típica paisa.",
    incluye: [
      "Guía local",
      "Degustaciones",
      "Transporte"
    ]
  },

  {
    id: 2,
    nombre: "Ruta del Café",
    precio: "$70.000",
    icon: "☕",
    duracion: "5h",
    descripcion:
      "Conoce el proceso tradicional del café.",
    incluye: [
      "Tour cafetero",
      "Bebidas",
      "Souvenir"
    ]
  },

  {
    id: 3,
    nombre: "Medellín Nocturna",
    precio: "$40.000",
    icon: "🌃",
    duracion: "4h",
    descripcion:
      "Explora la vida nocturna de Medellín.",
    incluye: [
      "Guía turístico",
      "Transporte",
      "Entrada VIP"
    ]
  }
];

  const handleSeleccionar = (ruta) => {
  setSelectedTour(ruta);
};

const confirmarReserva = async () => {

  if (!selectedDate || !selectedTime) {
    return alert("Selecciona fecha y hora");
  }

  try {

    await addDoc(collection(db, "viajes"), {

      userId: user.uid,

      nombre: selectedTour.nombre,

      precio: selectedTour.precio,

      icon: selectedTour.icon,

      duracion: selectedTour.duracion,

      descripcion: selectedTour.descripcion,

      fecha: selectedDate,

      hora: selectedTime,

      estado: "Pendiente",

      createdAt: serverTimestamp()
    });

    alert("¡Reserva confirmada!");

    setSelectedTour(null);

    setSelectedDate("");

    setSelectedTime("");

  } catch (error) {

    console.error(error);

    alert("Error al guardar reserva");
  }
};

  return (
    <section className="planning-container">
      <div className="planning-header">
        <h2>Planificar Viaje ✈️</h2>
        <p>Selecciona un recorrido personalizado por Medellín.</p>
      </div>
      
      <div className="planning-grid">
        {recorridos.map((ruta) => (
          <div key={ruta.id} className="planning-card">
            <div className="planning-badge">{ruta.duracion}</div>
            <div className="planning-icon">{ruta.icon}</div>
            <h3>{ruta.nombre}</h3>
            <p className="planning-price">{ruta.precio}</p>
            {/* Botón conectado a la función de guardado */}
            <button className="btn-select" onClick={() => handleSeleccionar(ruta)}>
              Seleccionar
            </button>
          </div>
        ))}
      </div>
      {selectedTour && (

  <div className="modal-overlay">

    <div className="modal-content">

      <h2>{selectedTour.icon} {selectedTour.nombre}</h2>

      <p>{selectedTour.descripcion}</p>

      <p>
        ⏱️ Duración:
        {selectedTour.duracion}
      </p>

      <p>
        💰 Precio:
        {selectedTour.precio}
      </p>

      <div>

        <h4>Incluye:</h4>

        <ul>
          {selectedTour.incluye.map((item, index) => (
            <li key={index}>
              ✓ {item}
            </li>
          ))}
        </ul>

      </div>

      <label>Selecciona una fecha</label>

      <input
        type="date"
        value={selectedDate}
        onChange={(e) =>
          setSelectedDate(e.target.value)
        }
      />

      <label>Selecciona una hora</label>

      <select
        value={selectedTime}
        onChange={(e) =>
          setSelectedTime(e.target.value)
        }
      >

        <option value="">
          Selecciona una hora
        </option>

        <option value="09:00 AM">
          09:00 AM
        </option>

        <option value="11:00 AM">
          11:00 AM
        </option>

        <option value="02:00 PM">
          02:00 PM
        </option>

        <option value="04:00 PM">
          04:00 PM
        </option>

      </select>

      <button
        className="btn-confirm"
        onClick={confirmarReserva}
      >
        Confirmar Reserva
      </button>

      <button
        className="btn-close"
        onClick={() => setSelectedTour(null)}
      >
        Cerrar
      </button>

    </div>

  </div>

)}
    </section>
  );
};

export default PlanificarViaje;