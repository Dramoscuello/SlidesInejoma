import React, { useRef, useEffect, useState } from 'react';

export default function DrawingCanvas({
  slideUrl,
  slideTitle,
  currentSlide = 1,
  totalSlides = 1,
  activeTool = 'pointer', // 'pointer' | 'pen' | 'eraser'
  penColor = '#ef4444',
  isReadOnly = false,
  remotePointer = null, // { x, y }
  strokes = [],
  onStroke,
  onStrokesChange,
  onPointerMove,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [imageError, setImageError] = useState(false);
  const [eraserPos, setEraserPos] = useState(null);

  // Reset image error state when slideUrl changes
  useEffect(() => {
    setImageError(false);
  }, [slideUrl, currentSlide]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle canvas resizing
    const resizeCanvas = () => {
      if (containerRef.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        redrawCanvas();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [strokes, currentPath, remotePointer, eraserPos, activeTool]);

  // Redraw all vector strokes, laser pointer & eraser cursor
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render strokes for this slide
    (strokes || []).forEach(stroke => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || '#ef4444';
      ctx.lineWidth = stroke.width || 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      stroke.points.forEach((pt, idx) => {
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Render current in-progress stroke (when using Pen)
    if (activeTool === 'pen' && currentPath.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      currentPath.forEach((pt, idx) => {
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Render Laser Pointer
    const pointer = remotePointer;
    if (pointer && pointer.x !== undefined && pointer.y !== undefined) {
      const px = pointer.x * canvas.width;
      const py = pointer.y * canvas.height;
      ctx.beginPath();
      ctx.arc(px, py, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Render Eraser Circle Cursor (when using Eraser)
    if (!isReadOnly && activeTool === 'eraser' && eraserPos) {
      const ex = eraserPos.x * canvas.width;
      const ey = eraserPos.y * canvas.height;
      ctx.beginPath();
      ctx.arc(ex, ey, 16, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fill();
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [strokes, currentPath, remotePointer, penColor, eraserPos, activeTool]);

  // Erase strokes hit by the eraser cursor at (ex, ey)
  const eraseStrokesAt = (ex, ey) => {
    if (!strokes || strokes.length === 0 || !onStrokesChange) return;
    const threshold = 0.035; // ~3.5% of screen size

    const filtered = strokes.filter(stroke => {
      if (!stroke.points) return false;
      // Check if any point in stroke is near (ex, ey)
      const isHit = stroke.points.some(pt => {
        const dx = pt.x - ex;
        const dy = pt.y - ey;
        return Math.hypot(dx, dy) < threshold;
      });
      return !isHit; // Keep only non-hit strokes
    });

    if (filtered.length !== strokes.length) {
      onStrokesChange(filtered);
    }
  };

  // Mouse / Touch Event Handlers
  const handlePointerDown = (e) => {
    if (isReadOnly) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else if (activeTool === 'eraser') {
      setIsDrawing(true);
      setEraserPos({ x, y });
      eraseStrokesAt(x, y);
    }
  };

  const handlePointerMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Broadcast Laser Pointer position
    if (!isReadOnly && activeTool === 'pointer' && onPointerMove) {
      onPointerMove({ x, y });
    }

    if (activeTool === 'eraser' && !isReadOnly) {
      setEraserPos({ x, y });
      if (isDrawing) {
        eraseStrokesAt(x, y);
      }
    }

    if (isDrawing && activeTool === 'pen' && !isReadOnly) {
      const newPath = [...currentPath, { x, y }];
      setCurrentPath(newPath);

      if (onPointerMove) {
        onPointerMove({ x, y });
      }
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && activeTool === 'pen' && currentPath.length > 1 && !isReadOnly) {
      const newStroke = {
        id: Date.now().toString() + Math.random().toString().slice(2, 6),
        points: currentPath,
        color: penColor,
        width: 4
      };
      if (onStroke) onStroke(newStroke);
    }
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handlePointerLeave = () => {
    setIsDrawing(false);
    setCurrentPath([]);
    setEraserPos(null);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Slide Image Asset or Fallback Slide Canvas */}
      {slideUrl && !imageError ? (
        <img
          src={slideUrl}
          alt={slideTitle || `Diapositiva ${currentSlide}`}
          onError={() => setImageError(true)}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none',
            display: 'block'
          }}
        />
      ) : (
        /* Fallback Slide View for Slide N */
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: currentSlide === 1 ? '#1e3323' : '#ffffff',
          color: currentSlide === 1 ? '#ffffff' : '#181d1a',
          padding: '3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{
                backgroundColor: currentSlide === 1 ? 'rgba(255,255,255,0.2)' : '#6b8a61',
                color: 'white',
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                fontWeight: '800',
                fontSize: '0.9rem'
              }}>
                DIAPOSITIVA {currentSlide} / {totalSlides}
              </span>
            </div>

            <h2 style={{
              fontSize: '2.25rem',
              fontWeight: '800',
              color: currentSlide === 1 ? '#ffffff' : '#1e3323',
              marginBottom: '1rem',
              lineHeight: '1.2'
            }}>
              {slideTitle || `Presentación de la Clase`}
            </h2>

            <div style={{
              backgroundColor: currentSlide === 1 ? 'rgba(255,255,255,0.1)' : '#e9ede9',
              padding: '2rem',
              borderRadius: '16px',
              borderLeft: currentSlide === 1 ? '6px solid #6b8a61' : '6px solid #1e3323',
              marginTop: '1rem'
            }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: currentSlide === 1 ? '#ffffff' : '#1e3323',
                marginBottom: '0.75rem'
              }}>
                Sección temática de la presentación ({currentSlide})
              </h3>
              <p style={{ color: currentSlide === 1 ? '#d8e1d5' : '#4b5563', fontSize: '1rem', lineHeight: '1.6' }}>
                Diapositiva sincronizada en tiempo real mediante WebSockets. Los trazos del docente y la posición del puntero láser se transmiten en vivo a todos los estudiantes conectados.
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: currentSlide === 1 ? '#d8e1d5' : '#6b7280',
            fontSize: '0.85rem',
            borderTop: currentSlide === 1 ? '1px solid rgba(255,255,255,0.2)' : '1px solid #d8e1d5',
            paddingTop: '1rem'
          }}>
            <span>SlidesInejoma • Presentación en vivo</span>
            <span>Año Lectivo 2026</span>
          </div>
        </div>
      )}

      {/* Canvas Overlay for Vector Drawings & Pointer */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: isReadOnly
            ? 'default'
            : activeTool === 'pen'
            ? 'crosshair'
            : activeTool === 'eraser'
            ? 'none' // Hide default cursor, custom eraser circle drawn on canvas
            : 'default',
          touchAction: 'none'
        }}
      />
    </div>
  );
}
