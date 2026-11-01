from __future__ import annotations
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

INTEREST_TAXONOMY = [
    "technology", "AI", "entrepreneurship", "startups", "travel",
    "books", "music", "film", "design", "science",
    "gaming", "sustainability", "finance", "fitness", "food",
    "art", "languages", "photography", "sports", "education"
]

class Intention(str, Enum):
    MAKE_FRIENDS = "make_friends"
    PROFESSIONAL_NETWORKING = "professional_networking"
    DISCUSS_TOPICS = "discuss_topics"
    ACTIVITY_PARTNER = "activity_partner"

class PreferredFormat(str, Enum):
    ONE_TO_ONE = "one_to_one"
    SMALL_GROUP = "small_group"
    EITHER = "either"

class ParticipantStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    LEFT = "left"

class RequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"

# ── API Models ─────────────────────────────────────────────────────────────

class CafeResponse(BaseModel):
    cafeId: str
    cafeName: str
    sessionId: str

class CreateCafeRequest(BaseModel):
    cafeId: str
    cafeName: str

class JoinSessionRequest(BaseModel):
    nickname: str
    interests: List[str]
    intention: Intention
    preferredFormat: PreferredFormat = PreferredFormat.EITHER
    availabilityMinutes: int = 30

class UpdateDiscoverabilityRequest(BaseModel):
    discoverability: bool
    availabilityMinutes: Optional[int] = None

class ParticipantModel(BaseModel):
    participantId: str
    userId: str
    nickname: str
    interests: List[str]
    intention: Intention
    preferredFormat: PreferredFormat
    availabilityMinutes: int
    availabilityExpiresAt: str
    discoverability: bool
    blockedParticipantIds: List[str] = Field(default_factory=list)
    status: ParticipantStatus = ParticipantStatus.ACTIVE
    joinedAt: str

class ParticipantSummary(BaseModel):
    participantId: str
    interests: List[str]
    intention: Intention
    preferredFormat: PreferredFormat
    sharedInterests: List[str]
    sharedInterestCount: int
    availabilityExpiresAt: str
    isOpenTable: bool = False

class CreateConversationRequest(BaseModel):
    toParticipantId: str

class ConversationRequestModel(BaseModel):
    requestId: str
    fromParticipantId: str
    toParticipantId: str
    status: RequestStatus
    geminiBlurb: str
    geminiBlurbFallback: bool = False
    createdAt: str
    senderSummary: Optional[ParticipantSummary] = None

class ConnectionModel(BaseModel):
    connectionId: str
    participantIds: List[str]
    icebreaker: str
    icebreakerFallback: bool = False
    isOpenTable: bool = False
    connectedAt: str
    otherParticipant: Optional[dict] = None
