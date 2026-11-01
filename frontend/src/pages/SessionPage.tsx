import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getMyProfile,
  updateDiscoverability,
  leaveSession,
  getDiscoverList,
  sendRequest,
  getIncomingRequests,
  acceptRequest,
  declineRequest,
  getMyConnections,
  openTable,
  getCafe,
} from '../api';
import { Navbar } from '../components/Navbar';
import { DiscoverCard } from '../components/DiscoverCard';
import { IncomingRequestModal } from '../components/IncomingRequestModal';
import { ConnectionCard } from '../components/ConnectionCard';
import type {
  Participant,
  ParticipantSummary,
  ConversationRequest,
  Connection,
  Cafe,
} from '../types';

export const SessionPage: React.FC = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [profile, setProfile] = useState<Participant | null>(null);
  const [discoverList, setDiscoverList] = useState<ParticipantSummary[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConversationRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingSentIds, setPendingSentIds] = useState<string[]>([]);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'discover' | 'connections'>('discover');

  const cafeId = sessionId.split('_')[0] || 'cafe-alpha';

  // Load initial data
  useEffect(() => {
    getCafe(cafeId).then(setCafe).catch(console.error);

    getMyProfile(sessionId)
      .then((p) => {
        setProfile(p);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        // Not in session, redirect to join
        navigate(`/join/${cafeId}`);
      });
  }, [sessionId, cafeId, navigate]);

  // Compute countdown timer
  useEffect(() => {
    if (!profile?.availabilityExpiresAt) return;

    const checkTimer = () => {
      const expiresAt = new Date(profile.availabilityExpiresAt).getTime();
      const now = Date.now();
      const diffMs = expiresAt - now;
      const mins = Math.max(0, Math.ceil(diffMs / (1000 * 60)));
      setMinutesLeft(mins);

      // Auto soft-pause if timer reaches zero
      if (mins === 0 && profile.discoverability) {
        updateDiscoverability(sessionId, false).then(setProfile).catch(console.error);
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 10000);
    return () => clearInterval(interval);
  }, [profile?.availabilityExpiresAt, profile?.discoverability, sessionId]);

  // Poll for live updates (discover list, incoming requests, connections)
  const pollData = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [disc, inc, conns] = await Promise.all([
        getDiscoverList(sessionId).catch(() => []),
        getIncomingRequests(sessionId).catch(() => []),
        getMyConnections(sessionId).catch(() => []),
      ]);
      setDiscoverList(disc);
      setIncomingRequests(inc);
      setConnections(conns);
      if (conns.length > 0 && activeTab === 'discover' && connections.length === 0) {
        // Automatically switch to connections if first connection is formed
        setActiveTab('connections');
      }
    } catch (e) {
      console.warn('Poll error:', e);
    }
  }, [sessionId, activeTab, connections.length]);

  useEffect(() => {
    pollData();
    const interval = setInterval(pollData, 3000);
    return () => clearInterval(interval);
  }, [pollData]);

  // Discoverability toggle
  const handleToggleDiscoverability = async (enabled: boolean) => {
    try {
      const updated = await updateDiscoverability(sessionId, enabled);
      setProfile(updated);
      pollData();
    } catch (err) {
      console.error('Failed to toggle discoverability:', err);
    }
  };

  // Re-enable / extend timer
  const handleExtendTimer = async () => {
    try {
      const updated = await updateDiscoverability(sessionId, true, 30);
      setProfile(updated);
      pollData();
    } catch (err) {
      console.error('Failed to extend timer:', err);
    }
  };

  // Send request
  const handleSendRequest = async (targetParticipantId: string) => {
    try {
      setPendingSentIds((prev) => [...prev, targetParticipantId]);
      await sendRequest(sessionId, targetParticipantId);
      pollData();
    } catch (err: any) {
      console.error('Failed to send request:', err);
      alert(err.message || 'Could not send request');
      setPendingSentIds((prev) => prev.filter((id) => id !== targetParticipantId));
    }
  };

  // Accept request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptRequest(sessionId, requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      await pollData();
      setActiveTab('connections');
    } catch (err) {
      console.error('Failed to accept request:', err);
    }
  };

  // Decline request (quiet silent block)
  const handleDeclineRequest = async (requestId: string) => {
    try {
      await declineRequest(sessionId, requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      pollData();
    } catch (err) {
      console.error('Failed to decline request:', err);
    }
  };

  // Open table (stretch)
  const handleOpenTable = async (connectionId: string) => {
    try {
      await openTable(sessionId, connectionId);
      pollData();
    } catch (err) {
      console.error('Failed to open table:', err);
    }
  };

  // Leave session
  const handleLeave = async () => {
    if (confirm('Leave this café session? Your profile will be removed.')) {
      try {
        await leaveSession(sessionId);
        navigate(`/join/${cafeId}`);
      } catch (err) {
        console.error('Leave session error:', err);
        navigate(`/join/${cafeId}`);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
        <span style={{ fontSize: '2.5rem' }}>☕</span>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Entering session...</p>
      </div>
    );
  }

  const isExpired = minutesLeft !== null && minutesLeft <= 0;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      <Navbar
        cafeName={cafe?.cafeName || 'Café Alpha'}
        discoverability={profile?.discoverability ?? false}
        onToggleDiscoverability={handleToggleDiscoverability}
        minutesLeft={minutesLeft}
        onLeave={handleLeave}
      />

      {/* Incoming Request Modal Popup */}
      {incomingRequests.length > 0 && (
        <IncomingRequestModal
          request={incomingRequests[0]}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
        />
      )}

      {/* Main Content Area */}
      <div style={{ padding: '1rem 1.25rem' }}>
        {/* Soft pause alert when timer expired */}
        {isExpired && (
          <div className="glass-panel animate-fade-in" style={{
            padding: '1rem',
            marginBottom: '1.25rem',
            border: '1px solid rgba(251, 191, 36, 0.4)',
            background: 'rgba(251, 191, 36, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', margin: 0 }}>
                Timer Paused
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                You are hidden from new guests.
              </p>
            </div>
            <button
              onClick={handleExtendTimer}
              className="btn-primary"
              style={{ width: 'auto', padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
            >
              +30m & Resume
            </button>
          </div>
        )}

        {/* Opt-in banner if discoverability is off */}
        {!profile?.discoverability && !isExpired && (
          <div className="glass-panel" style={{
            padding: '1rem',
            marginBottom: '1.25rem',
            border: '1px solid rgba(224, 141, 75, 0.3)',
            background: 'rgba(224, 141, 75, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)', margin: 0 }}>
                Discoverability is Off
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Toggle ON in top right to browse and connect.
              </p>
            </div>
            <button
              onClick={() => handleToggleDiscoverability(true)}
              className="btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              Turn ON
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => setActiveTab('discover')}
            className={`chip ${activeTab === 'discover' ? 'selected' : ''}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            🔍 Discover Guests ({discoverList.length})
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`chip ${activeTab === 'connections' ? 'selected' : ''}`}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            ☕ Connections ({connections.length})
          </button>
        </div>

        {/* Tab 1: Discover List */}
        {activeTab === 'discover' && (
          <div>
            {discoverList.length === 0 ? (
              <div className="glass-panel" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>☕</span>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  Looking for fellow guests...
                </h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto', lineHeight: 1.45 }}>
                  You appear to other customers who share your interests. As guests opt in, they'll appear here automatically.
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Ranked by shared interests • Names hidden for privacy
                </p>
                {discoverList.map((cand) => (
                  <DiscoverCard
                    key={cand.participantId}
                    participant={cand}
                    isPending={pendingSentIds.includes(cand.participantId)}
                    onSendRequest={handleSendRequest}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Connections */}
        {activeTab === 'connections' && (
          <div>
            {connections.length === 0 ? (
              <div className="glass-panel" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.75rem' }}>✨</span>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                  No active connections yet
                </h3>
                <p style={{ fontSize: '0.85rem', maxWidth: '320px', margin: '0 auto' }}>
                  Send a conversation request to an interesting guest in the Discover tab. Once accepted, your Icebreaker will appear here!
                </p>
              </div>
            ) : (
              connections.map((conn) => (
                <ConnectionCard
                  key={conn.connectionId}
                  connection={conn}
                  onOpenTable={handleOpenTable}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
