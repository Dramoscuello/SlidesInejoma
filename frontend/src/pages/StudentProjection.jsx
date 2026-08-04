import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Radio, AlertCircle, LogOut } from 'lucide-react';
import DrawingCanvas from '../components/DrawingCanvas';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function StudentProjection() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);
  const [presentationId, setPresentationId] = useState(null);
  const [title, setTitle] = useState('');
  const [sessionEnded, setSessionEnded] = useState(false);
  const [remotePointer, setRemotePointer] = useState(null);
  const [remoteStrokes, setRemoteStrokes] = useState([]);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);

  const wsRef = useRef(null);

  // Validate code and retrieve presentation details
  useEffect(() => {
    if (!code || code.length < 4) {
      navigate('/');
      return;
    }

    const validateCode = async () => {
      try {
        const res = await fetch(`${API_URL}/api/presentations/validate/${code}`);
        if (res.ok) {
          const data = await res.json();
          if (!data.valid) {
            navigate('/');
            return;
          }
          if (data.presentation_id) setPresentationId(data.presentation_id);
          if (data.title) setTitle(data.title);
          if (data.slide_count) setTotalSlides(data.slide_count);
        }
      } catch (err) {
        console.error('Error al validar código:', err);
      }
    };

    validateCode();
  }, [code, navigate]);

  // Connect to WebSocket Server & Receive Realtime Updates
  useEffect(() => {
    if (!code) return;

    const wsHost = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000/ws`;
    const socket = new WebSocket(wsHost);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'JOIN_SESSION',
        payload: { code: code.toUpperCase(), role: 'student' }
      }));
    };

    socket.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if (event.type === 'CHANGE_SLIDE') {
          setCurrentSlide(event.payload.slide_index);
          setRemoteStrokes([]);
          setRemotePointer(null);
        } else if (event.type === 'POINTER_MOVE') {
          setRemotePointer({ x: event.payload.x, y: event.payload.y });
        } else if (event.type === 'DRAW_STROKE') {
          setRemoteStrokes(prev => [...prev, event.payload]);
        } else if (event.type === 'CLEAR_CANVAS') {
          setRemoteStrokes([]);
        } else if (event.type === 'END_SESSION') {
          setSessionEnded(true);
        }
      } catch (err) {
        console.error('Error al procesar WS en estudiante:', err);
      }
    };

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [code]);

  const slideUrl = presentationId
    ? `${API_URL}/uploads/${presentationId}/slide_${currentSlide}.png`
    : null;

  const handleExit = () => {
    setIsConfirmExitOpen(true);
  };

  return (
    <div style={{
      height: '100dvh',
      width: '100vw',
      backgroundColor: '#0f1a12',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* Compact Top Bar — responsive for mobile */}
      <header style={{
        backgroundColor: 'var(--color-brand-dark)',
        color: '#ffffff',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        minHeight: '44px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        {/* Left: Brand + Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <div style={{
            backgroundColor: 'var(--color-brand-primary)',
            padding: '0.3rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Sparkles size={14} />
          </div>

          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            padding: '0.2rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            whiteSpace: 'nowrap'
          }}>
            <Radio size={12} className="animate-pulse" />
            <span>EN VIVO</span>
          </div>

          <span style={{
            fontSize: '0.7rem',
            color: 'rgba(255,255,255,0.5)',
            fontWeight: '600',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {code?.toUpperCase()}
          </span>
        </div>

        {/* Right: Exit button */}
        <button
          onClick={handleExit}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '0.3rem 0.6rem',
            borderRadius: '8px',
            fontSize: '0.7rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            flexShrink: 0
          }}
        >
          <LogOut size={14} />
          <span>Salir</span>
        </button>
      </header>

      {/* Full-screen Slide Stage — fills all remaining space */}
      <main style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '0.25rem',
        position: 'relative'
      }}>
        <DrawingCanvas
          slideUrl={slideUrl}
          currentSlide={currentSlide}
          totalSlides={totalSlides}
          slideTitle={title || `Diapositiva ${currentSlide}`}
          isReadOnly={true}
          remotePointer={remotePointer}
          strokes={remoteStrokes}
        />
      </main>

      {/* Session Ended Notification Modal */}
      {sessionEnded && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="academic-card" style={{
            width: '100%',
            maxWidth: '360px',
            textAlign: 'center',
            padding: '2rem 1.5rem'
          }}>
            <AlertCircle size={42} color="var(--color-brand-primary)" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-brand-dark)', marginBottom: '0.5rem' }}>
              Sesión finalizada
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              El docente ha finalizado la clase en vivo. Gracias por participar.
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem' }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )}

      {/* Custom Exit Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmExitOpen}
        title="¿Salir de la clase en vivo?"
        message="Saldrás de la transmisión en tiempo real de esta clase."
        confirmText="Salir de la clase"
        cancelText="Permanecer"
        variant="primary"
        onConfirm={() => {
          setIsConfirmExitOpen(false);
          navigate('/');
        }}
        onCancel={() => setIsConfirmExitOpen(false)}
      />
    </div>
  );
}
