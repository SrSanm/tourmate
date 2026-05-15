import React, { createContext, useContext, useState, useCallback } from 'react';

// 1. CREACIÓN DEL CONTEXTO
const UIContext = createContext();

// 2. HOOK PERSONALIZADO
export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI debe usarse dentro de un UIProvider');
  }
  return context;
};

// 3. PROVEEDOR DE INTERFAZ
export const UIProvider = ({ children }) => {
  // --- ESTADO DE NOTIFICACIONES (TOASTS) ---
  const [notifications, setNotifications] = useState([]);

  // --- ESTADO DE MODALES ---
  const [modal, setModal] = useState({
    isOpen: false,
    type: null, // 'booking', 'login_required', 'delete_confirm', etc.
    data: null  // Información que necesite el modal (ej: datos del tour)
  });

  // --- ESTADO DE SIDEBAR / MENÚ MÓVIL ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- LÓGICA DE NOTIFICACIONES (SISTEMA TOAST) ---
  const showNotification = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now();
    const newNotification = { id, message, type };
    
    setNotifications(prev => [...prev, newNotification]);

    // Autocierre de la notificación
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- LÓGICA DE MODALES ---
  const openModal = (type, data = null) => {
    setModal({ isOpen: true, type, data });
    document.body.style.overflow = 'hidden'; // Bloquear scroll del fondo
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: null, data: null });
    document.body.style.overflow = 'unset'; // Restaurar scroll
  };

  // --- LÓGICA DE NAVEGACIÓN ---
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // 4. VALORES EXPUESTOS
  const value = {
    notifications,
    showNotification,
    removeNotification,
    modal,
    openModal,
    closeModal,
    isSidebarOpen,
    toggleSidebar
  };

  return (
    <UIContext.Provider value={value}>
      {children}
      
      {/* RENDERIZADO GLOBAL DE NOTIFICACIONES (TOASTS) */}
      <div className="toast-container">
        {notifications.map((n) => (
          <div key={n.id} className={`toast toast-${n.type} animate-slide-in`}>
            <div className="toast-icon">
              {n.type === 'success' && '✅'}
              {n.type === 'error' && '❌'}
              {n.type === 'warning' && '⚠️'}
              {n.type === 'info' && 'ℹ️'}
            </div>
            <div className="toast-message">{n.message}</div>
            <button className="toast-close" onClick={() => removeNotification(n.id)}>×</button>
          </div>
        ))}
      </div>

      {/* ESTILOS GLOBALES DE UI */}
      <style>{`
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
        }

        .toast {
          pointer-events: auto;
          min-width: 300px;
          padding: 15px 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          gap: 12px;
          border-left: 5px solid transparent;
          position: relative;
        }

        .toast-success { border-left-color: #10b981; }
        .toast-error { border-left-color: #ef4444; }
        .toast-warning { border-left-color: #f59e0b; }
        .toast-info { border-left-color: #3b82f6; }

        .toast-message {
          color: #1e293b;
          font-weight: 500;
          font-size: 0.9rem;
          flex-grow: 1;
        }

        .toast-close {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0 5px;
        }

        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </UIContext.Provider>
  );
};