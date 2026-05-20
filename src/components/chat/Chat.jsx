import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../../firebase/firebaseConfig';
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, limit
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

/**
 * Chat — Mensajería en tiempo real entre turista y guía.
 *
 * Los mensajes se guardan como subcolección de la reserva:
 *   bookings/{bookingId}/messages/{messageId}
 *
 * Esto mantiene todos los mensajes asociados a la reserva y las
 * reglas de Firestore pueden validar que solo los participantes lean/escriban.
 *
 * CSS embebido: no necesita Chat.css externo.
 */
const Chat = ({ bookingId }) => {
  const { user, profile } = useAuth();

  const [messages, setMessages]   = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ── Listener de mensajes en tiempo real ──────────────────────
  useEffect(() => {
    if (!bookingId) return;

    const messagesRef = collection(db, "bookings", bookingId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);
      setTimeout(scrollToBottom, 50); // pequeño delay para que el DOM se actualice
    }, (err) => {
      console.error("Error chat:", err);
      setError("No se pudieron cargar los mensajes.");
      setLoading(false);
    });

    return () => unsub();
  }, [bookingId]);

  // ── Enviar mensaje ────────────────────────────────────────────
  const handleSend = useCallback(async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || isSending || !user) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, "bookings", bookingId, "messages"), {
        text,
        senderId:   user.uid,
        senderName: profile?.name || user.displayName || "Viajero",
        senderRole: profile?.role || "tourist",
        createdAt:  serverTimestamp()
      });
      setNewMessage('');
      inputRef.current?.focus();
    } catch (err) {
      console.error("Error enviando mensaje:", err);
      alert("No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      setIsSending(false);
    }
  }, [newMessage, bookingId, user, profile, isSending]);

  // Enviar con Enter (Shift+Enter = salto de línea)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // ── Formato de hora ───────────────────────────────────────────
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return timestamp.toDate().toLocaleTimeString('es-CO', {
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const isOwnMessage = (msg) => msg.senderId === user?.uid;

  if (loading) return (
    <div className="ch-loading">
      <div className="ch-spin" />
      <p>Cargando conversación...</p>
    </div>
  );

  if (error) return (
    <div className="ch-error">
      <span>⚠️</span>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="ch-wrapper">

      {/* ── MENSAJES ─────────────────────────────── */}
      <div className="ch-messages">
        {messages.length === 0 ? (
          <div className="ch-empty">
            <div className="ch-empty-icon">💬</div>
            <p>Aún no hay mensajes.</p>
            <small>Escribe algo para iniciar la conversación.</small>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`ch-msg ${isOwnMessage(msg) ? 'own' : 'other'}`}
            >
              {/* Nombre del remitente — solo en mensajes del otro */}
              {!isOwnMessage(msg) && (
                <span className="ch-sender-name">{msg.senderName}</span>
              )}
              <div className={`ch-bubble ${isOwnMessage(msg) ? 'own' : 'other'}`}>
                <p>{msg.text}</p>
                <span className="ch-time">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT ────────────────────────────────── */}
      <form className="ch-footer" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          className="ch-input"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje... (Enter para enviar)"
          maxLength={500}
          disabled={isSending}
          autoComplete="off"
        />
        <button
          type="submit"
          className="ch-send-btn"
          disabled={isSending || !newMessage.trim()}
        >
          {isSending ? (
            <div className="ch-spin-sm" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </form>

      <style>{`
        .ch-wrapper {
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
          min-height: 0;
          background: #f8fafc;
        }

        /* Mensajes */
        .ch-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          scroll-behavior: smooth;
        }
        .ch-messages::-webkit-scrollbar { width: 4px; }
        .ch-messages::-webkit-scrollbar-track { background: transparent; }
        .ch-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }

        /* Estado vacío */
        .ch-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #94a3b8;
          text-align: center;
          padding: 40px;
        }
        .ch-empty-icon { font-size: 2.5rem; }
        .ch-empty p { font-size: 1rem; font-weight: 600; color: #64748b; margin: 0; }
        .ch-empty small { font-size: 0.82rem; }

        /* Burbuja */
        .ch-msg { display: flex; flex-direction: column; max-width: 75%; }
        .ch-msg.own { align-self: flex-end; align-items: flex-end; }
        .ch-msg.other { align-self: flex-start; align-items: flex-start; }

        .ch-sender-name {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 4px;
          padding-left: 4px;
        }

        .ch-bubble {
          padding: 10px 14px;
          border-radius: 18px;
          max-width: 100%;
          word-break: break-word;
          position: relative;
        }
        .ch-bubble.own {
          background: #ff5a3c;
          color: white;
          border-bottom-right-radius: 4px;
        }
        .ch-bubble.other {
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .ch-bubble p {
          margin: 0 0 4px;
          font-size: 0.92rem;
          line-height: 1.45;
        }
        .ch-time {
          font-size: 0.68rem;
          opacity: 0.7;
          display: block;
          text-align: right;
        }
        .ch-bubble.own .ch-time { color: rgba(255,255,255,0.8); }
        .ch-bubble.other .ch-time { color: #94a3b8; }

        /* Input */
        .ch-footer {
          display: flex;
          gap: 10px;
          padding: 14px 16px;
          background: white;
          border-top: 1px solid #e2e8f0;
          align-items: center;
        }
        .ch-input {
          flex: 1;
          padding: 11px 16px;
          border: 1.5px solid #e2e8f0;
          border-radius: 24px;
          font-size: 0.92rem;
          outline: none;
          transition: 0.2s;
          background: #f8fafc;
          font-family: inherit;
        }
        .ch-input:focus {
          border-color: #ff5a3c;
          background: white;
          box-shadow: 0 0 0 3px rgba(255,90,60,0.1);
        }
        .ch-input:disabled { opacity: 0.6; }

        .ch-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #ff5a3c;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: 0.2s;
          flex-shrink: 0;
        }
        .ch-send-btn:hover:not(:disabled) { background: #e0482b; transform: scale(1.05); }
        .ch-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Loaders */
        .ch-loading, .ch-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 12px;
          color: #94a3b8;
          padding: 40px;
          text-align: center;
        }
        .ch-error span { font-size: 2rem; }
        .ch-spin {
          width: 30px;
          height: 30px;
          border: 3px solid #e2e8f0;
          border-top-color: #ff5a3c;
          border-radius: 50%;
          animation: chSpin 1s linear infinite;
        }
        .ch-spin-sm {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: chSpin 0.8s linear infinite;
        }
        @keyframes chSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Chat;