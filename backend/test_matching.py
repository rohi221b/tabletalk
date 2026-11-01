import pytest
from datetime import datetime, timezone, timedelta
from models import (
    ParticipantModel,
    ParticipantStatus,
    Intention,
    PreferredFormat,
)
from matching import get_discover_list, calculate_shared_interests

def make_participant(
    pid: str,
    interests: list[str],
    intention: Intention = Intention.MAKE_FRIENDS,
    discoverability: bool = True,
    status: ParticipantStatus = ParticipantStatus.ACTIVE,
    blocked: list[str] = None,
    expired: bool = False,
) -> ParticipantModel:
    now = datetime.now(timezone.utc)
    expires_at = (now - timedelta(minutes=5)) if expired else (now + timedelta(minutes=30))
    return ParticipantModel(
        participantId=pid,
        userId=pid,
        nickname=f"User-{pid}",
        interests=interests,
        intention=intention,
        preferredFormat=PreferredFormat.ONE_TO_ONE,
        availabilityMinutes=30,
        availabilityExpiresAt=expires_at.isoformat(),
        discoverability=discoverability,
        blockedParticipantIds=blocked or [],
        status=status,
        joinedAt=now.isoformat(),
    )

def test_shared_interests():
    res = calculate_shared_interests(["AI", "music", "books"], ["art", "music", "AI"])
    assert set(res) == {"AI", "music"}

def test_zero_shared_interests_excluded():
    me = make_participant("me", ["AI", "technology"])
    other = make_participant("p1", ["cooking", "sports"])
    res = get_discover_list([other], me)
    assert len(res) == 0

def test_self_excluded():
    me = make_participant("me", ["AI", "technology"])
    res = get_discover_list([me], me)
    assert len(res) == 0

def test_bidirectional_blocking():
    me = make_participant("me", ["AI", "technology"], blocked=["p1"])
    p1 = make_participant("p1", ["AI", "technology"])
    p2 = make_participant("p2", ["AI", "technology"], blocked=["me"])

    res1 = get_discover_list([p1], me)
    assert len(res1) == 0

    res2 = get_discover_list([p2], me)
    assert len(res2) == 0

def test_ranking_by_shared_interests_and_intention():
    me = make_participant("me", ["AI", "startups", "travel"], intention=Intention.DISCUSS_TOPICS)

    # 1 shared interest
    p1 = make_participant("p1", ["travel", "food"], intention=Intention.DISCUSS_TOPICS)
    # 2 shared interests, different intention
    p2 = make_participant("p2", ["AI", "startups", "food"], intention=Intention.MAKE_FRIENDS)
    # 2 shared interests, SAME intention (should rank highest!)
    p3 = make_participant("p3", ["AI", "travel", "art"], intention=Intention.DISCUSS_TOPICS)

    res = get_discover_list([p1, p2, p3], me)
    assert [r.participantId for r in res] == ["p3", "p2", "p1"]
    assert res[0].sharedInterestCount == 2
    assert res[1].sharedInterestCount == 2
    assert res[2].sharedInterestCount == 1

def test_privacy_no_nickname_in_summary():
    me = make_participant("me", ["AI"])
    p1 = make_participant("p1", ["AI"])
    res = get_discover_list([p1], me)
    assert len(res) == 1
    # ParticipantSummary has no nickname field
    assert not hasattr(res[0], "nickname")

def test_discoverability_off_or_expired_excluded():
    me = make_participant("me", ["AI"])
    p_off = make_participant("p_off", ["AI"], discoverability=False)
    p_paused = make_participant("p_paused", ["AI"], status=ParticipantStatus.PAUSED)
    p_left = make_participant("p_left", ["AI"], status=ParticipantStatus.LEFT)
    p_exp = make_participant("p_exp", ["AI"], expired=True)

    res = get_discover_list([p_off, p_paused, p_left, p_exp], me)
    assert len(res) == 0
