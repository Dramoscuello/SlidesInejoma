import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, Copy, Power, ChevronLeft, ChevronRight, MousePointer, Edit2, Eraser, RotateCcw, Trash2, Check } from 'lucide-react';
import SpectatorBadge from '../components/SpectatorBadge';
import DrawingCanvas from '../components/DrawingCanvas';

import ConfirmModal from '../components/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function PresenterMode() {
  const { presentationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code') || 'X7K9';

  const [spectatorCount, setSpectatorCount] = useState(0);
  const [activeTool, setActiveTool] = useState('pointer'); // 'pointer' | 'pen' | 'eraser'
  const [penColor, setPenColor] = useState('#ef4444');
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(1);

  const [copied, setCopied] = useState(false);
  const [remotePointer, setRemotePointer] = useState(null);
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false);

  // Store strokes per slide: { [slideNumber]: ArrayOfStrokes }
  const [slideStrokes, setSlideStrokes] = useState({});

  // Try to get totalSlides from searchParams (passed from GradeManagement)
  useEffect(() => {
    const slideCount = searchParams.get('slides');
    if (slideCount) setTotalSlides(parseInt(slideCount, 10));
  }, [searchParams]);

  // Construct real slide image URL from backend uploads folder (PNG)
  const slideUrl = presentationId
    ? `${API_URL}/uploads/${presentationId}/slide_${currentSlide}.png`
    : null;

  // Keyboard navigation (Left/Right Arrow, PageUp/PageDown, Space)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        setCurrentSlide(prev => Math.min(totalSlides, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentSlide(prev => Math.max(1, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlides]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndSession = () => {
    setIsConfirmEndOpen(true);
  };

  const handlePointerMove = (pt) => {
    setRemotePointer(pt);
  };

  // Add a new stroke to the current slide
  const handleStroke = (newStroke) => {
    setSlideStrokes(prev => ({
      ...prev,
      [currentSlide]: [...(prev[currentSlide] || []), newStroke]
    }));
  };

  // Replace strokes for the current slide (used by Eraser)
  const handleStrokesChange = (newStrokes) => {
    setSlideStrokes(prev => ({
      ...prev,
      [currentSlide]: newStrokes
    }));
  };

  // Undo last stroke on current slide
  const handleUndo = () => {
    setSlideStrokes(prev => {
      const currentList = prev[currentSlide] || [];
      if (currentList.length === 0) return prev;
      return {
        ...prev,
        [currentSlide]: currentList.slice(0, -1)
      };
    });
  };

  // Clear all strokes on current slide
  const handleClearCanvas = () => {
    setSlideStrokes(prev => ({
      ...prev,
      [currentSlide]: []
    }));
  };

  const currentStrokes = slideStrokes[currentSlide] || [];

  return (
    <div style={{
      height: '100dvh',
      width: '100vw',
      backgroundColor: '#142017',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      {/* Top Header Bar */}
      <header style={{
        backgroundColor: 'var(--color-brand-dark)',
        color: '#ffffff',
        padding: '0.6rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ backgroundColor: 'var(--color-brand-primary)', padding: '0.35rem', borderRadius: '8px' }}>
              <Sparkles size={16} />
            </div>
            <span style={{ fontWeight: '800', fontSize: '1.05rem', letterSpacing: '-0.02em' }}>SlidesInejoma</span>
          </div>

          <div style={{ height: '18px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

          <span style={{ fontSize: '0.85rem', color: '#d8e1d5', fontWeight: '500' }}>
            Modo presentación docente
          </span>
        </div>

        {/* Center: Code & Spectator Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            border: '1px dashed rgba(255, 255, 255, 0.3)'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#d8e1d5', fontWeight: '600' }}>CÓDIGO:</span>
            <span style={{ fontSize: '1rem', fontWeight: '800', letterSpacing: '0.1em' }}>{code}</span>
            <button
              onClick={handleCopyCode}
              style={{ background: 'none', color: '#ffffff', marginLeft: '0.2rem', display: 'flex', alignItems: 'center' }}
              title="Copiar código para estudiantes"
            >
              {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
            </button>
          </div>

          <SpectatorBadge count={spectatorCount} />
        </div>

        {/* End Session Button */}
        <div>
          <button
            onClick={handleEndSession}
            className="btn-danger"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Power size={14} />
            <span>Finalizar sesión</span>
          </button>
        </div>
      </header>

      {/* Main Slide Presentation Stage */}
      <main style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        position: 'relative',
        padding: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f1811',
        overflow: 'hidden'
      }}>
        <DrawingCanvas
          slideUrl={slideUrl}
          currentSlide={currentSlide}
          totalSlides={totalSlides}
          slideTitle={`Diapositiva ${currentSlide}`}
          activeTool={activeTool}
          penColor={penColor}
          isReadOnly={false}
          remotePointer={remotePointer}
          strokes={currentStrokes}
          onPointerMove={handlePointerMove}
          onStroke={handleStroke}
          onStrokesChange={handleStrokesChange}
        />
      </main>

      {/* Bottom Presenter Control Toolbar */}
      <footer style={{
        flexShrink: 0,
        backgroundColor: 'var(--color-brand-dark)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '0.5rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20
      }}>
        {/* Left: Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Laser Pointer Tool */}
          <button
            onClick={() => setActiveTool('pointer')}
            style={{
              backgroundColor: activeTool === 'pointer' ? 'var(--color-brand-primary)' : 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
            title="Puntero láser"
          >
            <MousePointer size={16} />
            <span>Láser</span>
          </button>

          {/* Pen / Marker Tool */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => setActiveTool('pen')}
              style={{
                backgroundColor: activeTool === 'pen' ? 'var(--color-brand-primary)' : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}
              title="Lápiz / Dibujar"
            >
              <Edit2 size={16} />
              <span>Anotar</span>
            </button>

            {activeTool === 'pen' && (
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginLeft: '0.2rem' }}>
                {['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#ffffff'].map(color => (
                  <button
                    key={color}
                    onClick={() => setPenColor(color)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: penColor === color ? '2px solid white' : '1px solid rgba(0,0,0,0.3)',
                      boxShadow: penColor === color ? '0 0 4px rgba(255,255,255,0.8)' : 'none',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Eraser Tool */}
          <button
            onClick={() => setActiveTool('eraser')}
            style={{
              backgroundColor: activeTool === 'eraser' ? 'var(--color-brand-primary)' : 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
            title="Goma de borrar (arrastra sobre los trazos para eliminarlos)"
          >
            <Eraser size={16} />
            <span>Goma</span>
          </button>

          <div style={{ height: '16px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={currentStrokes.length === 0}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#d8e1d5',
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              opacity: currentStrokes.length === 0 ? 0.4 : 1,
              cursor: currentStrokes.length === 0 ? 'not-allowed' : 'pointer'
            }}
            title="Deshacer último trazo de esta diapositiva"
          >
            <RotateCcw size={15} />
            <span>Deshacer</span>
          </button>

          {/* Clear Slide Button */}
          <button
            onClick={handleClearCanvas}
            disabled={currentStrokes.length === 0}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#f87171',
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              opacity: currentStrokes.length === 0 ? 0.4 : 1,
              cursor: currentStrokes.length === 0 ? 'not-allowed' : 'pointer'
            }}
            title="Borrar todos los trazos de esta diapositiva"
          >
            <Trash2 size={15} />
            <span>Borrar todo</span>
          </button>
        </div>

        {/* Center: Slide Navigation Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            disabled={currentSlide <= 1}
            onClick={() => setCurrentSlide(prev => Math.max(1, prev - 1))}
            style={{
              backgroundColor: currentSlide <= 1 ? 'rgba(255,255,255,0.05)' : 'var(--color-brand-primary)',
              color: '#ffffff',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              cursor: currentSlide <= 1 ? 'not-allowed' : 'pointer',
              opacity: currentSlide <= 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
            title="Diapositiva anterior (Flecha Izquierda)"
          >
            <ChevronLeft size={18} />
            <span>Anterior</span>
          </button>

          <span style={{
            fontSize: '0.85rem',
            fontWeight: '700',
            color: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '0.3rem 0.85rem',
            borderRadius: '9999px',
            whiteSpace: 'nowrap'
          }}>
            {currentSlide} / {totalSlides}
          </span>

          <button
            disabled={currentSlide >= totalSlides}
            onClick={() => setCurrentSlide(prev => Math.min(totalSlides, prev + 1))}
            style={{
              backgroundColor: currentSlide >= totalSlides ? 'rgba(255,255,255,0.05)' : 'var(--color-brand-primary)',
              color: '#ffffff',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              cursor: currentSlide >= totalSlides ? 'not-allowed' : 'pointer',
              opacity: currentSlide >= totalSlides ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}
            title="Siguiente diapositiva (Flecha Derecha)"
          >
            <span>Siguiente</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Right: Hint */}
        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
          Usa ⬅️ ➡️ para navegar
        </div>
      </footer>

      {/* Custom End Session Confirm Modal */}
      <ConfirmModal
        isOpen={isConfirmEndOpen}
        title="¿Finalizar clase en vivo?"
        message="Se desconectará a todos los estudiantes conectados a esta transmisión."
        confirmText="Finalizar clase"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={() => {
          setIsConfirmEndOpen(false);
          navigate('/admin/grades');
        }}
        onCancel={() => setIsConfirmEndOpen(false)}
      />
    </div>
  );
}
