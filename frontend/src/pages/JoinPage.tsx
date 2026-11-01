import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCafe, joinSession } from '../api';
import { InterestSelector } from '../components/InterestSelector';
import type { Cafe, Interest, Intention, PreferredFormat } from '../types';

export const JoinPage: React.FC = () => {
  const { cafeId = 'cafe-alpha' } = useParams<{ cafeId?: string }>();
  const navigate = useNavigate();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [nickname, setNickname] = useState('');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [intention, setIntention] = useState<Intention>('make_friends');
  const [preferredFormat, setPreferredFormat] = useState<PreferredFormat>('either');
  const [availabilityMinutes, setAvailabilityMinutes] = useState<15 | 30 | 60>(30);

  useEffect(() => {
    getCafe(cafeId)
      .then((c) => {
        setCafe(c);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load cafe:', err);
        setError('Could not connect to café session.');
        setLoading(false);
      });
  }, [cafeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafe) return;
    if (!nickname.trim()) {
      setError('Please choose a nickname.');
      return;
    }
    if (interests.length < 1 || interests.length > 5) {
      setError('Please select between 1 and 5 interests.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await joinSession(cafe.sessionId, {
        nickname: nickname.trim(),
        interests,
        intention,
        preferredFormat,
        availabilityMinutes,
      });
      // Store session and navigate
      sessionStorage.setItem('tabletalk_nickname', nickname.trim());
      navigate(`/session/${cafe.sessionId}`);
    } catch (err: any) {
      console.error('Join session error:', err);
      setError(err.message || 'Failed to join session.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <span style={{ fontSize: '2.5rem' }}>☕</span>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Connecting to café...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem 1.25rem 3rem' }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', margin: '1rem 0 2rem' }}>
        <span style={{ fontSize: '2.8rem', display: 'block', marginBottom: '0.5rem' }}>☕</span>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>{cafe?.cafeName ?? 'Café Alpha'}</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Welcome to TableTalk. Connect with guests at this café right now.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          marginBottom: '1.25rem',
          border: '1px solid rgba(248, 113, 113, 0.3)',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
        {/* Nickname */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            Your Nickname (First name or alias)
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Alex, Sam, CoffeeLover"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={25}
            required
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            🔒 Hidden from other guests until you mutually connect.
          </p>
        </div>

        {/* Interests */}
        <InterestSelector
          selected={interests}
          onChange={setInterests}
          min={3}
          max={5}
        />

        {/* Intention */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            What are you open to today?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { id: 'make_friends', icon: '🤝', label: 'Make Friends' },
              { id: 'professional_networking', icon: '💼', label: 'Networking' },
              { id: 'discuss_topics', icon: '💡', label: 'Discussion' },
              { id: 'activity_partner', icon: '🎯', label: 'Activity Partner' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip ${intention === opt.id ? 'selected' : ''}`}
                style={{ padding: '0.65rem 0.75rem', textAlign: 'left', borderRadius: 'var(--radius-md)' }}
                onClick={() => setIntention(opt.id as Intention)}
              >
                <span style={{ fontSize: '1rem', marginRight: '0.3rem' }}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Format */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Conversation Format
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { id: 'one_to_one', label: '1-on-1' },
              { id: 'small_group', label: 'Small Group' },
              { id: 'either', label: 'Either is great' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`chip ${preferredFormat === f.id ? 'selected' : ''}`}
                style={{ flex: 1, padding: '0.55rem 0.5rem', textAlign: 'center' }}
                onClick={() => setPreferredFormat(f.id as PreferredFormat)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Availability Window */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Availability Window
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[15, 30, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                className={`chip ${availabilityMinutes === mins ? 'selected' : ''}`}
                style={{ flex: 1, padding: '0.6rem 0.5rem', textAlign: 'center' }}
                onClick={() => setAvailabilityMinutes(mins as 15 | 30 | 60)}
              >
                {mins} mins
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            When your time expires, discoverability pauses silently without disconnecting active chats.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || !nickname.trim() || interests.length < 1}
          style={{ marginTop: '0.5rem' }}
        >
          {submitting ? 'Entering Café...' : 'Enter Café Session ☕'}
        </button>
      </form>
    </div>
  );
};
