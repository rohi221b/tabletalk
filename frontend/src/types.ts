// Domain types — mirroring the Firestore schema and API responses

export type Intention =
  | 'make_friends'
  | 'professional_networking'
  | 'discuss_topics'
  | 'activity_partner';

export type PreferredFormat = 'one_to_one' | 'small_group' | 'either';

export type ParticipantStatus = 'active' | 'paused' | 'left';

export type RequestStatus = 'pending' | 'accepted' | 'declined';

export const INTEREST_TAXONOMY = [
  'technology', 'AI', 'entrepreneurship', 'startups', 'travel',
  'books', 'music', 'film', 'design', 'science',
  'gaming', 'sustainability', 'finance', 'fitness', 'food',
  'art', 'languages', 'photography', 'sports', 'education',
] as const;

export type Interest = typeof INTEREST_TAXONOMY[number];

export interface Cafe {
  cafeId: string;
  cafeName: string;
  sessionId: string;
}

export interface Participant {
  participantId: string;
  nickname: string;
  interests: Interest[];
  intention: Intention;
  preferredFormat: PreferredFormat;
  availabilityMinutes: 15 | 30 | 60;
  availabilityExpiresAt: string; // ISO string
  discoverability: boolean;
  status: ParticipantStatus;
  joinedAt: string;
}

export interface ParticipantSummary {
  participantId: string;
  interests: Interest[];
  intention: Intention;
  preferredFormat: PreferredFormat;
  sharedInterests: Interest[];
  sharedInterestCount: number;
  availabilityExpiresAt: string;
  isOpenTable?: boolean;
}

export interface ConversationRequest {
  requestId: string;
  fromParticipantId: string;
  toParticipantId: string;
  status: RequestStatus;
  geminiBlurb: string;
  createdAt: string;
  senderSummary?: ParticipantSummary;
}

export interface Connection {
  connectionId: string;
  participantIds: string[];
  icebreaker: string;
  isOpenTable: boolean;
  connectedAt: string;
  otherParticipant?: {
    nickname: string;
    interests: Interest[];
    intention: Intention;
  };
}

export interface JoinSessionPayload {
  nickname: string;
  interests: Interest[];
  intention: Intention;
  preferredFormat: PreferredFormat;
  availabilityMinutes: 15 | 30 | 60;
}
