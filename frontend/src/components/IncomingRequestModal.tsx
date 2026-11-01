import React from 'react';
import type { ConversationRequest } from '../types';

interface IncomingRequestModalProps {
  request: ConversationRequest;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}

export const IncomingRequestModal: React.FC<IncomingRequestModalProps> = ({
  request,
  onAccept,
  onDecline,
}) => {
  const summary = request.senderSummary;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      zIndex: 100,
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '1.5rem',
        border: '1px solid var(--border-focus)',
        boxShadow: 'var(--shadow-glow)',
      }}>
        {/* Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.4rem' }}>💌</span>
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-primary)' }}>
              Conversation Request
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Another guest at the café wants to chat
            </p>
          </div>
        </div>

        {/* Gemini Blurb Card */}
        <div style={{
          background: 'rgba(224, 141, 75, 0.08)',
          border: '1px solid rgba(224, 141, 75, 0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '1rem',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem' }}>✨</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Why you might click
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.45 }}>
            "{request.geminiBlurb}"
          </p>
        </div>

        {/* Sender Interests & Intention (Anonymous) */}
        {summary && (
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              Their Interests
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.6rem' }}>
              {summary.interests.map((int) => {
                const isShared = summary.sharedInterests?.includes(int);
                return (
                  <span
                    key={int}
                    className={`chip ${isShared ? 'shared' : ''}`}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                  >
                    {isShared ? '★ ' : ''}
                    {int}
                  </span>
                );
              })}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Intention: <strong style={{ color: 'var(--text-primary)' }}>{summary.intention.replace('_', ' ')}</strong>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onDecline(request.requestId)}
            className="btn-decline"
            style={{ flex: 1 }}
          >
            Pass quietly
          </button>
          <button
            onClick={() => onAccept(request.requestId)}
            className="btn-primary"
            style={{ flex: 2 }}
          >
            <span>☕</span> Accept & Connect
          </button>
        </div>
      </div>
    </div>
  );
};
