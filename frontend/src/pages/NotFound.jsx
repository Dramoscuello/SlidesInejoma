import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Home, Lock } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-brand-light)',
      padding: '2rem 1rem'
    }}>
      <div className="academic-card" style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          padding: '1rem',
          borderRadius: '50%',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          color: 'var(--color-error)',
          marginBottom: '1.25rem'
        }}>
          <HelpCircle size={48} />
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--color-brand-dark)', lineHeight: '1' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-brand-dark)', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          Página o clase no encontrada
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
          El código de 4 caracteres o la ruta ingresada no corresponde a una presentación activa en el sistema.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
            style={{ width: '100%', padding: '0.9rem', justifyContent: 'center' }}
          >
            <Home size={18} />
            <span>Volver al inicio (portal estudiantes)</span>
          </button>

          <button
            onClick={() => navigate('/login')}
            className="btn-secondary"
            style={{ width: '100%', padding: '0.9rem', justifyContent: 'center' }}
          >
            <Lock size={18} />
            <span>Ir a login de profesores</span>
          </button>
        </div>
      </div>
    </div>
  );
}
