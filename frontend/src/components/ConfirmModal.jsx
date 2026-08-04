import React from 'react';
import { AlertTriangle, HelpCircle, Check, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'primary'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 26, 18, 0.65)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="academic-card" style={{
        width: '100%',
        maxWidth: '420px',
        textAlign: 'center',
        padding: '2rem 1.75rem',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--color-brand-accent)',
        borderRadius: '20px'
      }}>
        {/* Icon Header */}
        <div style={{
          display: 'inline-flex',
          padding: '0.85rem',
          borderRadius: '50%',
          backgroundColor: variant === 'danger' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(107, 138, 97, 0.12)',
          color: variant === 'danger' ? '#ef4444' : 'var(--color-brand-primary)',
          marginBottom: '1rem'
        }}>
          {variant === 'danger' ? <AlertTriangle size={36} /> : <HelpCircle size={36} />}
        </div>

        {/* Modal Title & Message */}
        <h3 style={{
          fontSize: '1.35rem',
          fontWeight: '800',
          color: 'var(--color-brand-dark)',
          marginBottom: '0.5rem',
          lineHeight: '1.3'
        }}>
          {title}
        </h3>

        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '0.9rem',
          lineHeight: '1.5',
          marginBottom: '1.75rem'
        }}>
          {message}
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{
              flex: 1,
              padding: '0.75rem',
              fontSize: '0.9rem',
              borderRadius: '10px'
            }}
          >
            <X size={16} />
            <span>{cancelText}</span>
          </button>

          <button
            onClick={onConfirm}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
            style={{
              flex: 1,
              padding: '0.75rem',
              fontSize: '0.9rem',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Check size={16} />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
