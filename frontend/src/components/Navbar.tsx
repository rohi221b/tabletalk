import React from 'react';

interface NavbarProps {
  cafeName: string;
  discoverability: boolean;
  onToggleDiscoverability: (enabled: boolean) => void;
  minutesLeft: number | null;
  onLeave: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cafeName,
  discoverability,
  onToggleDiscoverability,
  minutesLeft,
  onLeave,
}) => {
  return (
    <header style={{
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(18, 15, 14, 0.95)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(12px)',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>☕</span>
          <h1 style={{ fontSize: '1.1rem', margin: 0 }}>{cafeName}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
          <span className="live-dot" style={{
            background: discoverability ? 'var(--success)' : 'var(--text-muted)',
            boxShadow: discoverability ? undefined : 'none'
          }} />
          <span style={{ fontSize: '0.75rem', color: discoverability ? 'var(--success)' : 'var(--text-muted)' }}>
            {discoverability ? 'Discoverable' : 'Hidden'}
          </span>
          {minutesLeft !== null && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              • {minutesLeft > 0 ? `${minutesLeft}m left` : 'Expired'}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Discoverability Toggle Switch */}
        <label className="switch" title="Toggle discoverability">
          <input
            type="checkbox"
            checked={discoverability}
            onChange={(e) => onToggleDiscoverability(e.target.checked)}
          />
          <span className="slider" />
        </label>

        <button
          onClick={onLeave}
          title="Leave Café Session"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            padding: '0.3rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          Leave
        </button>
      </div>
    </header>
  );
};
