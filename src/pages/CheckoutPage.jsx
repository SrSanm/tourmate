import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const CheckoutPage = () => {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  const totalPrice = Number(searchParams.get('amount')) || 0;
  const WOMPI_PUBLIC_KEY = 'pub_test_1fSGccU1LA2blJFDa7EJxRCgSqwQI8yb';

  // ── Carga Asíncrona y Segura del Widget de Wompi ───────────────────────
  useEffect(() => {
    if (window.WidgetCheckout) {
      setIsScriptLoaded(true);
      return;
    }

    let script = document.querySelector('script[src="https://checkout.wompi.co/widget.js"]');
    
    if (!script) {
      script = document.createElement('script');
      script.src = "https://checkout.wompi.co/widget.js";
      // Forzamos a que el script de Wompi reconozca la llave pública desde el atributo del DOM (Evita el bug del undefined)
      script.setAttribute('data-public-key', WOMPI_PUBLIC_KEY);
      script.async = true;
      document.body.appendChild(script);
    }

    const handleScriptLoad = () => {
      // Le damos un mini timeout para que el objeto global termine de inicializarse bien
      setTimeout(() => {
        setIsScriptLoaded(true);
      }, 300);
    };

    const handleScriptError = () => {
      console.error("No se pudo cargar el script de la pasarela Wompi.");
      setLoadingError("Error al cargar la pasarela de pagos. Por favor, revisa tu conexión.");
    };

    script.addEventListener('load', handleScriptLoad);
    script.addEventListener('error', handleScriptError);

    return () => {
      if (script) {
        script.removeEventListener('load', handleScriptLoad);
        script.removeEventListener('error', handleScriptError);
      }
    };
  }, []);

  // ── Disparador del Checkout ──────────────────────────────────
  const handleWompiPayment = () => {
    if (!window.WidgetCheckout) {
      alert("El sistema de pagos se está inicializando o tuvo un problema de configuración. Por favor, refresca la página.");
      return;
    }

    if (totalPrice <= 0) {
      alert("El monto de facturación no es válido para procesar el pago.");
      return;
    }

    setIsProcessing(true);

    // Referencia dinámica única para la sandbox
    const uniqueReference = `TM-${bookingId.replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`;

    try {
      const checkout = new window.WidgetCheckout({
        currency: 'COP',
        amountInCents: Math.round(totalPrice * 100), 
        reference: uniqueReference,
        publicKey: WOMPI_PUBLIC_KEY
      });

      checkout.open(async (result) => {
        const status = result.transaction?.status;

        if (status === 'APPROVED') {
          try {
            await updateDoc(doc(db, "bookings", bookingId), {
              status: 'paid',
              transactionId: result.transaction.id,
              paidAt: serverTimestamp()
            });
            
            alert("¡Pago aprobado con éxito! Tu tour ha sido confirmado.");
            navigate('/tourist/my-bookings');
          } catch (err) {
            console.error("Error crítico en Firestore:", err);
            alert("El pago fue aprobado, pero ocurrió un problema al registrarlo. Conserva tu comprobante.");
            setIsProcessing(false); 
          }
        } else {
          // Si el estado es DECLINED, ERROR o el usuario cierra la ventana, liberamos el botón
          alert(`Transacción terminada. Estado: ${status || 'Ventana cerrada por el usuario'}`);
          setIsProcessing(false); 
        }
      });
    } catch (error) {
      console.error("Error al abrir el widget de Wompi:", error);
      alert("Ocurrió un error inesperado al abrir la pasarela. Revisa la consola.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="co-page-container">
      <div className="co-card">
        
        {/* Encabezado Visual */}
        <div className="co-header">
          <div className="co-badge-security">🔒 Pago 100% Seguro</div>
          <h2>Resumen de tu Pago</h2>
          <p>Estás a un paso de comenzar tu aventura con TourMate.</p>
        </div>
        
        <div className="co-divider"></div>
        
        {/* Desglose de Información */}
        <div className="co-details-box">
          <div className="co-info-row">
            <span className="co-label">ID de Reserva</span>
            <span className="co-value-id">#{bookingId?.substring(0, 8).toUpperCase()}</span>
          </div>

          <div className="co-info-row total-row">
            <span className="co-label-total">Total a depositar</span>
            <span className="co-price-value">${totalPrice.toLocaleString('es-CO')} COP</span>
          </div>
        </div>

        {loadingError && (
          <div className="co-error-box">⚠️ {loadingError}</div>
        )}

        {/* Acciones principales */}
        <div className="co-actions">
          <button 
            onClick={handleWompiPayment}
            disabled={isProcessing || !isScriptLoaded}
            className="co-btn-pay"
          >
            {!isScriptLoaded ? (
              <span className="co-loader-text"><span className="co-spinner"></span> Cargando pasarela...</span>
            ) : isProcessing ? (
              'Procesando pago...'
            ) : (
              '💳 Pagar con Wompi'
            )}
          </button>

          <button 
            onClick={() => navigate('/tourist/my-bookings')}
            disabled={isProcessing}
            className="co-btn-cancel"
          >
            Cancelar y regresar
          </button>
        </div>
      </div>

      {/* ── ARQUITECTURA CSS RESPONSIVA ── */}
      <style>{`
        .co-page-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f8fafc;
          padding: 16px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .co-card {
          background: #ffffff;
          padding: 32px 24px;
          border-radius: 24px;
          box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.03), 0 20px 25px -5px rgba(15, 23, 42, 0.08);
          max-width: 440px;
          width: 100%;
          border: 1px solid #e2e8f0;
          box-sizing: border-box;
        }

        .co-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .co-badge-security {
          display: inline-flex;
          background: #f0fdf4;
          color: #16a34a;
          padding: 6px 14px;
          border-radius: 30px;
          font-size: 0.78rem;
          font-weight: 700;
          margin-bottom: 14px;
          letter-spacing: 0.02em;
          border: 1px solid #bbf7d0;
        }

        .co-header h2 {
          font-size: 1.6rem;
          color: #0f172a;
          margin: 0 0 8px 0;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .co-header p {
          font-size: 0.92rem;
          color: #64748b;
          margin: 0;
          line-height: 1.4;
        }

        .co-divider {
          height: 1px;
          background-color: #f1f5f9;
          margin: 20px 0;
        }

        .co-details-box {
          background: #f8fafc;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          margin-bottom: 24px;
        }

        .co-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .co-info-row.total-row {
          margin-top: 10px;
          padding-top: 14px;
          border-top: 1px dashed #e2e8f0;
        }

        .co-label {
          font-size: 0.88rem;
          color: #64748b;
          font-weight: 500;
        }

        .co-value-id {
          font-size: 0.88rem;
          color: #1e293b;
          font-weight: 700;
          font-family: monospace;
          background: #e2e8f0;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .co-label-total {
          font-size: 0.95rem;
          color: #0f172a;
          font-weight: 700;
        }

        .co-price-value {
          font-size: 1.4rem;
          color: #ff5a3c;
          font-weight: 800;
        }

        .co-error-box {
          background: #fef2f2;
          color: #dc2626;
          font-size: 0.85rem;
          font-weight: 600;
          padding: 12px;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid #fee2e2;
          text-align: center;
        }

        .co-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .co-btn-pay {
          width: 100%;
          padding: 14px;
          background-color: #10b981;
          color: #ffffff;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s ease, transform 0.1s ease;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .co-btn-pay:hover:not(:disabled) {
          background-color: #059669;
         }

        .co-btn-pay:active:not(:disabled) {
          transform: scale(0.98);
        }

        .co-btn-pay:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          background-color: #cbd5e1;
          color: #64748b;
        }

        .co-btn-cancel {
          width: 100%;
          padding: 12px;
          background-color: transparent;
          color: #64748b;
          border: none;
          border-radius: 14px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s, color 0.2s;
        }

        .co-btn-cancel:hover:not(:disabled) {
          background-color: #f1f5f9;
          color: #0f172a;
        }

        .co-btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .co-loader-text {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .co-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #94a3b8;
          border-top-color: transparent;
          border-radius: 50%;
          animation: co-spin 0.8s linear infinite;
        }

        @keyframes co-spin {
          to { transform: rotate(360deg); }
        }

        /* ── RESPONSIVIDAD PARA DISPOSITIVOS MÓVILES ── */
        @media (max-width: 480px) {
          .co-page-container {
            padding: 0;
            align-items: flex-end; 
            background-color: #ffffff;
          }

          .co-card {
            border: none;
            box-shadow: none;
            border-radius: 24px 24px 0 0;
            padding: 24px 16px;
            background: #ffffff;
            border-top: 1px solid #e2e8f0;
          }
          
          .co-header h2 {
            font-size: 1.45rem;
          }
          
          .co-price-value {
            font-size: 1.25rem;
          }

          .co-btn-pay, .co-btn-cancel {
            padding: 16px; 
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default CheckoutPage;