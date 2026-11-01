from __future__ import annotations
from datetime import datetime, timezone
from typing import List, Set
from models import ParticipantModel, ParticipantSummary, ParticipantStatus

def calculate_shared_interests(a_interests: List[str], b_interests: List[str]) -> List[str]:
    set_b = set(b_interests)
    return [item for item in a_interests if item in set_b]

def is_expired(availability_expires_at: str) -> bool:
    try:
        expires_at = datetime.fromisoformat(availability_expires_at.replace("Z", "+00:00"))
        return datetime.now(timezone.utc) > expires_at
    except Exception:
        return False

def get_discover_list(
    candidates: List[ParticipantModel],
    requesting_participant: ParticipantModel
) -> List[ParticipantSummary]:
    """
    Ranks discoverable participants for the requesting participant.
    Rules:
    - Candidate must not be the requester.
    - Candidate must not be blocked by requester, AND requester must not be blocked by candidate.
    - Candidate must have status == ACTIVE.
    - Candidate must have discoverability == True.
    - Candidate availability window must not have expired.
    - Must share >= 1 interest with requester.
    - Ranked by: (count of shared interests DESC, intention match DESC).
    - Output hides nickname (privacy).
    """
    req_id = requesting_participant.participantId
    req_blocked: Set[str] = set(requesting_participant.blockedParticipantIds or [])
    req_interests = requesting_participant.interests
    req_intention = requesting_participant.intention

    eligible: List[tuple[ParticipantModel, List[str], int, int]] = []

    for p in candidates:
        if p.participantId == req_id:
            continue
        if p.participantId in req_blocked:
            continue
        if req_id in (p.blockedParticipantIds or []):
            continue
        if p.status != ParticipantStatus.ACTIVE:
            continue
        if not p.discoverability:
            continue
        if is_expired(p.availabilityExpiresAt):
            continue

        shared = calculate_shared_interests(p.interests, req_interests)
        if not shared:
            continue

        intention_match = 1 if p.intention == req_intention else 0
        shared_count = len(shared)
        eligible.append((p, shared, shared_count, intention_match))

    # Sort descending by shared_count, then intention_match
    eligible.sort(key=lambda item: (item[2], item[3]), reverse=True)

    summaries: List[ParticipantSummary] = []
    for p, shared, shared_count, _ in eligible:
        summaries.append(
            ParticipantSummary(
                participantId=p.participantId,
                interests=p.interests,
                intention=p.intention,
                preferredFormat=p.preferredFormat,
                sharedInterests=shared,
                sharedInterestCount=shared_count,
                availabilityExpiresAt=p.availabilityExpiresAt,
                isOpenTable=False
            )
        )

    return summaries
