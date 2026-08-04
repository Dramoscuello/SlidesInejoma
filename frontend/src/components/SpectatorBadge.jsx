import React from 'react';
import { Users } from 'lucide-react';

export default function SpectatorBadge({ count = 0 }) {
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      color: '#ffffff',
      padding: '0.4rem 0.9rem',
      borderRadius: '9999px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.85rem',
      fontWeight: '600',
      border: '1px solid rgba(255, 255, 255, 0.25)'
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: '#22c55e',
        boxShadow: '0 0 8px #22c55e'
      }}></span>
      <Users size={16} />
      <span>{count} {count === 1 ? 'Estudiante' : 'Estudiantes'}</span>
    </div>
  );
}
