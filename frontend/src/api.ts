import { getIdToken } from './firebase';
import type {
  Cafe,
  Participant,
  ParticipantSummary,
  ConversationRequest,
  Connection,
  JoinSessionPayload,
} from './types';

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Cafés ────────────────────────────────────────────────────────────────────

export const getCafe = (cafeId: string) =>
  req<Cafe>('GET', `/cafes/${cafeId}`);

// ── Session / Profile ─────────────────────────────────────────────────────────

export const joinSession = (sessionId: string, payload: JoinSessionPayload) =>
  req<Participant>('POST', `/sessions/${sessionId}/join`, payload);

export const getMyProfile = (sessionId: string) =>
  req<Participant>('GET', `/sessions/${sessionId}/participants/me`);

export const updateDiscoverability = (sessionId: string, discoverability: boolean, availabilityMinutes?: number) =>
  req<Participant>('PUT', `/sessions/${sessionId}/participants/me/discoverability`, {
    discoverability,
    ...(availabilityMinutes ? { availabilityMinutes } : {}),
  });

export const leaveSession = (sessionId: string) =>
  req<void>('DELETE', `/sessions/${sessionId}/participants/me`);

// ── Discover ─────────────────────────────────────────────────────────────────

export const getDiscoverList = (sessionId: string) =>
  req<ParticipantSummary[]>('GET', `/sessions/${sessionId}/discover`);

// ── Conversation Requests ─────────────────────────────────────────────────────

export const sendRequest = (sessionId: string, toParticipantId: string) =>
  req<ConversationRequest>('POST', `/sessions/${sessionId}/requests`, { toParticipantId });

export const getIncomingRequests = (sessionId: string) =>
  req<ConversationRequest[]>('GET', `/sessions/${sessionId}/requests/incoming`);

export const acceptRequest = (sessionId: string, requestId: string) =>
  req<{ connectionFormed: boolean; connectionId?: string }>(
    'PUT', `/sessions/${sessionId}/requests/${requestId}/accept`
  );

export const declineRequest = (sessionId: string, requestId: string) =>
  req<void>('PUT', `/sessions/${sessionId}/requests/${requestId}/decline`);

// ── Connections ───────────────────────────────────────────────────────────────

export const getMyConnections = (sessionId: string) =>
  req<Connection[]>('GET', `/sessions/${sessionId}/connections`);

export const openTable = (sessionId: string, connectionId: string) =>
  req<Connection>('PUT', `/sessions/${sessionId}/connections/${connectionId}/open-table`);
