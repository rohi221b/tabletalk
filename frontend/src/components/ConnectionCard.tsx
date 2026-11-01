import React from 'react';
import type { Connection } from '../types';

interface ConnectionCardProps {
  connection: Connection;
  onOpenTable?: (connectionId: string) => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onOpenTable,
}) => {
  const otherName = connection.otherParticipant?.nickname || 'Your café match';

  return (
    <div className="glass-panel animate-fade-in" style={{
      padding: '1.5rem',
      marginBottom: '1.25rem',
      border: '1px solid rgba(52, 211, 153, 0.4)',
      boxShadow: '0 8px 32px rgba(52, 211, 153, 0.1)',
      background: 'linear-gradient(180deg, rgba(28, 25, 23, 0.95) 0%, rgba(20, 18, 16, 0.98) 100%)',
    }}>
      {/* Success Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <span style={{
          background: 'var(--success-bg)',
          color: 'var(--success)',
          padding: '0.25rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          ✓ Connected
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Say hello in person!
        </span>
      </div>

      {/* Connection Title */}
      <h2 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
        Meet <span style={{ color: 'var(--accent-primary)' }}>{otherName}</span>
      </h2>

      {/* Icebreaker Box */}
      <div style={{
        background: 'rgba(224, 141, 75, 0.08)',
        borderLeft: '3px solid var(--accent-primary)',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        padding: '0.85rem 1rem',
        margin: '1rem 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.85rem' }}>✨</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Gemini Icebreaker
          </span>
        </div>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontStyle: 'italic', margin: 0, lineHeight: 1.45 }}>
          "{connection.icebreaker}"
        </p>
      </div>

      {/* Other person details */}
      {connection.otherParticipant && (
        <div style={{ marginTop: '0.75rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
            {otherName}'s Interests
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {connection.otherParticipant.interests.map((int) => (
              <span key={int} className="chip selected" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                {int}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Open Table Stretch Feature */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Open Table</span>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            {connection.isOpenTable ? 'Open for 3rd person to join' : 'Private 1:1 table'}
          </p>
        </div>
        {!connection.isOpenTable && onOpenTable && (
          <button
            onClick={() => onOpenTable(connection.connectionId)}
            className="btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
          >
            Open Table ☕
          </button>
        )}
      </div>
    </div>
  );
};
