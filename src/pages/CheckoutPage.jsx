import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const CheckoutPage = () => {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Obtener el monto de la URL o usar uno por defecto si falla
  const amountParam = searchParams.get('amount');
  const totalPrice = amountParam ? Number(amountParam) : 0;

  // Estados de la pasarela
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'pse'
  const [isProcessing, setIsProcessing] = useState(false);

  // Formulario Tarjeta
  const [cardName, setCardName] = useState('JUAN PEREZ');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');

  // Formulario PSE
  const [selectedBank, setSelectedBank] = useState('');
  const [personType, setPersonType] = useState('natural'); // 'natural' | 'juridica'
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');

  // Lista simulada de bancos principales de Colombia
  const colombianBanks = [
    { code: '007', name: 'Bancolombia' },
    { code: '012', name: 'Banco de Bogotá' },
    { code: '051', name: 'Davivienda' },
    { code: '002', name: 'Banco de Occidente' },
    { code: '019', name: 'Banco BBVA' },
    { code: '032', name: 'Banco Caja Social' },
    { code: '052', name: 'AV Villas' },
    { code: '040', name: 'Banco Agrario' },
    { code: '100', name: 'Nequi' },
    { code: '101', name: 'Daviplata' },
  ];

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (paymentMethod === 'pse' && !selectedBank) {
      alert("Por favor, selecciona tu entidad bancaria.");
      return;
    }

    setIsProcessing(true);

    try {
      // Simular latencia de red de la pasarela Wompi
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const bookingRef = doc(db, "bookings", bookingId);
      
      // Datos compartidos del éxito de la transacción
      const paymentData = {
        status: 'paid',
        paymentDate: serverTimestamp(),
        paymentMethodType: paymentMethod.toUpperCase(),
        transactionId: 'WMP-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      };

      // Agregar metadatos específicos según el método elegido
      if (paymentMethod === 'card') {
        paymentData.paymentMethodDetail = `Tarjeta que termina en ${cardNumber.slice(-4)}`;
      } else {
        const bankName = colombianBanks.find(b => b.code === selectedBank)?.name || 'PSE';
        paymentData.paymentMethodDetail = `PSE - ${bankName}`;
      }

      // Actualizar base de datos
      await updateDoc(bookingRef, paymentData);

      alert("¡Transacción aprobada con éxito en Ambiente de Pruebas!");
      navigate('/guide/bookings'); // Redirección de regreso al panel general
    } catch (err) {
      console.error("Error procesando el pago en Firebase:", err);
      alert("Hubo un problema confirmando tu pago. Inténtalo de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="checkout-page-wrapper">
      <div className="wompi-container-card">
        
        {/* BRANDING WOMPI BANCOLOMBIA */}
        <header className="wompi-header">
          <h2>Wompi <span>Bancolombia</span></h2>
          <span className="sandbox-badge">Ambiente de Pruebas Seguro</span>
        </header>

        {/* DISPLAY DE PRECIO */}
        <div className="amount-display-box">
          <span className="amount-lbl">Valor a pagar:</span>
          <h1 className="amount-value">${totalPrice.toLocaleString('es-CO')} COP</h1>
        </div>

        {/* SELECTOR DE MÉTODO DE PAGO */}
        <div className="payment-method-tabs">
          <button 
            type="button"
            className={`method-tab ${paymentMethod === 'card' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('card')}
          >
            💳 Tarjeta de Crédito
          </button>
          <button 
            type="button"
            className={`method-tab ${paymentMethod === 'pse' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('pse')}
          >
            🏦 Débito Bancario (PSE)
          </button>
        </div>

        {/* FORMULARIO DINÁMICO */}
        <form onSubmit={handlePaymentSubmit} className="checkout-form-core">
          
          {paymentMethod === 'card' ? (
            /* PASARELA TARJETA */
            <div className="form-fade-in">
              <div className="input-group-stack">
                <label>Nombre en la tarjeta</label>
                <input 
                  type="text" 
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                />
              </div>

              <div className="input-group-stack">
                <label>Número de tarjeta de pruebas</label>
                <input 
                  type="text" 
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  required
                />
              </div>
            </div>
          ) : (
            /* PASARELA PSE */
            <div className="form-fade-in">
              <div className="input-group-stack">
                <label>Selecciona tu Banco</label>
                <select 
                  value={selectedBank} 
                  onChange={(e) => setSelectedBank(e.target.value)}
                  required
                  className="select-dropdown-pse"
                >
                  <option value="">-- Elige una entidad financiera --</option>
                  {colombianBanks.map(bank => (
                    <option key={bank.code} value={bank.code}>{bank.name}</option>
                  ))}
                </select>
              </div>

              <div className="input-row-flex">
                <div className="input-group-stack">
                  <label>Tipo de Persona</label>
                  <select value={personType} onChange={(e) => setPersonType(e.target.value)}>
                    <option value="natural">Persona Natural</option>
                    <option value="juridica">Persona Jurídica</option>
                  </select>
                </div>

                <div className="input-group-stack">
                  <label>Tipo de Doc.</label>
                  <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                    <option value="CC">Cédula de Ciudadanía</option>
                    <option value="CE">Cédula de Extranjería</option>
                    <option value="NIT">NIT</option>
                  </select>
                </div>
              </div>

              <div className="input-group-stack">
                <label>Número de Documento</label>
                <input 
                  type="text" 
                  placeholder="Ej: 10324567"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* BOTÓN DE ACCIÓN ACCIONADO POR ESTADO */}
          <button 
            type="submit" 
            className="wompi-submit-btn" 
            disabled={isProcessing}
          >
            {isProcessing ? (
              <span className="loader-span">Procesando pago seguro...</span>
            ) : (
              `Pagar de forma segura con ${paymentMethod === 'card' ? 'Tarjeta' : 'PSE'}`
            )}
          </button>
        </form>

      </div>

      <style>{`
        .checkout-page-wrapper { display: flex; justify-content: center; align-items: center; min-height: 70vh; padding: 40px 20px; background-color: #f8fafc; font-family: system-ui, sans-serif; }
        .wompi-container-card { background: #fff; width: 100%; max-width: 480px; padding: 35px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        
        .wompi-header { text-align: center; margin-bottom: 25px; }
        .wompi-header h2 { margin: 0; font-size: 1.6rem; color: #000; font-weight: 800; }
        .wompi-header h2 span { color: #facc15; }
        .sandbox-badge { display: inline-block; font-size: 0.75rem; background: #f1f5f9; color: #64748b; padding: 4px 12px; border-radius: 50px; font-weight: 600; margin-top: 5px; }

        .amount-display-box { background: #f1f5f9; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 25px; }
        .amount-lbl { font-size: 0.85rem; color: #64748b; font-weight: 500; }
        .amount-value { margin: 5px 0 0 0; font-size: 1.8rem; color: #0f172a; font-weight: 800; }

        .payment-method-tabs { display: flex; gap: 10px; margin-bottom: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
        .method-tab { flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: #fff; border-radius: 10px; font-weight: 700; font-size: 0.85rem; color: #475569; cursor: pointer; transition: all 0.2s; }
        .method-tab.active { background: #0f172a; color: #fff; border-color: #0f172a; }

        .checkout-form-core { display: flex; flex-direction: column; gap: 16px; }
        .input-group-stack { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .input-group-stack label { font-size: 0.8rem; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.02em; }
        .input-group-stack input, .input-group-stack select { padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; outline: none; background: #fff; }
        .input-group-stack input:focus, .input-group-stack select:focus { border-color: #000; }
        
        .input-row-flex { display: flex; gap: 12px; }

        .wompi-submit-btn { background: #000; color: #fff; border: none; padding: 14px; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; margin-top: 10px; transition: opacity 0.2s; }
        .wompi-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .form-fade-in { animation: fadeIn 0.3s ease-in-out; display: flex; flex-direction: column; gap: 16px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default CheckoutPage;