import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock, Zap } from 'lucide-react';

import { isSessionValid } from '../utils/auth';

export default function HomeStudent() {
  const navigate = useNavigate();
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Route guard: If teacher session is active, redirect to admin grades
  useEffect(() => {
    if (isSessionValid()) {
      navigate('/admin/grades');
    }
  }, [navigate]);

  const handleChange = (index, value) => {
    const val = value.toUpperCase().slice(-1);
    const newPin = [...pin];
    newPin[index] = val;
    setPin(newPin);
    setError('');

    // Auto-focus next input box
    if (val && index < 3) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = pin.join('');
    if (code.length < 4) {
      setError('Por favor ingresa los 4 caracteres del código de la clase.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      navigate(`/student/${code}`);
    }, 400);
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--color-brand-light)'
    }}>
      {/* Header */}
      <header style={{
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        borderBottom: '1px solid var(--color-brand-accent)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            backgroundColor: 'var(--color-brand-primary)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-brand-dark)', lineHeight: '1.2' }}>
              SlidesInejoma
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--color-brand-primary)', letterSpacing: '0.05em' }}>
              Portal de estudiantes
            </span>
          </div>
        </div>

        <Link to="/login" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <Lock size={16} />
          <span>Acceso docente</span>
        </Link>
      </header>

      {/* Main Centered Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div className="academic-card" style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            padding: '0.75rem',
            borderRadius: '50%',
            backgroundColor: 'rgba(107, 138, 97, 0.1)',
            color: 'var(--color-brand-primary)',
            marginBottom: '1rem'
          }}>
            <Zap size={32} />
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-brand-dark)', marginBottom: '0.5rem' }}>
            ¡Bienvenido a tu clase en vivo!
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
            Ingresa el código de 4 caracteres que te compartió tu profesor para conectarte en tiempo real.
          </p>

          <form onSubmit={handleSubmit}>
            {/* 4 Box PIN Input */}
            <div className="pin-container">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="pin-box"
                  placeholder="•"
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {error && (
              <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '500' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '1rem', fontSize: '1.05rem', marginTop: '0.5rem' }}
            >
              <span>{loading ? 'Conectando...' : 'Ingresar a la presentación'}</span>
              <ArrowRight size={20} />
            </button>
          </form>

          {/* Footer Info Badge */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--color-brand-accent)',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}>
            <span>⚡ Transmisión directa por WebSockets • Sin necesidad de cuenta</span>
          </div>
        </div>
      </main>
    </div>
  );
}
