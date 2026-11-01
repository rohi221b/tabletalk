import React from 'react';
import type { ParticipantSummary } from '../types';

interface DiscoverCardProps {
  participant: ParticipantSummary;
  isPending: boolean;
  onSendRequest: (participantId: string) => void;
}

const intentionLabels: Record<string, { label: string; icon: string }> = {
  make_friends: { label: 'Make Friends', icon: '🤝' },
  professional_networking: { label: 'Networking', icon: '💼' },
  discuss_topics: { label: 'Deep Discussion', icon: '💡' },
  activity_partner: { label: 'Activity Partner', icon: '🎯' },
};

export const DiscoverCard: React.FC<DiscoverCardProps> = ({
  participant,
  isPending,
  onSendRequest,
}) => {
  const intention = intentionLabels[participant.intention] || {
    label: participant.intention.replace('_', ' '),
    icon: '💬',
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
      {/* Header with anonymous identifier & match highlight */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.1rem' }}>👤</span>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Anonymous Guest
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.8rem' }}>{intention.icon}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Looking to {intention.label}
            </span>
          </div>
        </div>

        {/* Shared interests badge */}
        <span style={{
          background: 'rgba(52, 211, 153, 0.15)',
          color: 'var(--success)',
          border: '1px solid rgba(52, 211, 153, 0.3)',
          padding: '0.25rem 0.6rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          ★ {participant.sharedInterestCount} shared
        </span>
      </div>

      {/* Interests list */}
      <div style={{ margin: '0.85rem 0' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Interests
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {participant.interests.map((interest) => {
            const isShared = participant.sharedInterests.includes(interest);
            return (
              <span
                key={interest}
                className={`chip ${isShared ? 'shared' : ''}`}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              >
                {isShared ? '★ ' : ''}
                {interest}
              </span>
            );
          })}
        </div>
      </div>

      {/* Action button */}
      <div style={{ marginTop: '1rem' }}>
        {isPending ? (
          <button
            disabled
            className="btn-secondary"
            style={{ width: '100%', color: 'var(--accent-primary)', borderColor: 'var(--border-focus)' }}
          >
            <span className="live-dot" style={{ background: 'var(--accent-primary)' }} />
            Waiting for response...
          </button>
        ) : (
          <button
            onClick={() => onSendRequest(participant.participantId)}
            className="btn-primary"
          >
            <span>💬</span> I'd like to talk
          </button>
        )}
      </div>
    </div>
  );
};
