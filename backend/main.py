from __future__ import annotations
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

import config
from auth import get_current_user_id
from models import (
    CafeResponse,
    CreateCafeRequest,
    JoinSessionRequest,
    UpdateDiscoverabilityRequest,
    ParticipantModel,
    ParticipantSummary,
    CreateConversationRequest,
    ConversationRequestModel,
    ConnectionModel,
    ParticipantStatus,
    RequestStatus,
    PreferredFormat,
)
import storage
import matching
import gemini_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(
    title="TableTalk API",
    description="Backend API for TableTalk café companion",
    version="1.0.0",
)

# Enable CORS for Vite frontend (typically localhost:5173) and any origin in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_today_session_id(cafe_id: str) -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return f"{cafe_id}_{today_str}"

@app.get("/")
def read_root():
    return {
        "app": "TableTalk API",
        "status": "online",
        "version": "1.0.0",
    }

# ── Cafés ───────────────────────────────────────────────────────────────────

@app.get("/cafes/{cafe_id}", response_model=CafeResponse)
def get_cafe_endpoint(cafe_id: str):
    cafe = storage.get_cafe(cafe_id)
    if not cafe:
        if cafe_id == "cafe-alpha":
            cafe = {
                "cafeId": "cafe-alpha",
                "cafeName": "Café Alpha",
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            storage.set_cafe(cafe_id, cafe)
        else:
            raise HTTPException(status_code=404, detail="Café not found")
    
    session_id = get_today_session_id(cafe_id)
    return CafeResponse(
        cafeId=cafe["cafeId"],
        cafeName=cafe["cafeName"],
        sessionId=session_id,
    )

@app.post("/cafes", response_model=CafeResponse)
def create_cafe_endpoint(payload: CreateCafeRequest):
    data = {
        "cafeId": payload.cafeId,
        "cafeName": payload.cafeName,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    storage.set_cafe(payload.cafeId, data)
    session_id = get_today_session_id(payload.cafeId)
    return CafeResponse(
        cafeId=payload.cafeId,
        cafeName=payload.cafeName,
        sessionId=session_id,
    )

# ── Session & Temporary Profile ─────────────────────────────────────────────

@app.post("/sessions/{session_id}/join", response_model=ParticipantModel)
def join_session_endpoint(
    session_id: str,
    payload: JoinSessionRequest,
    user_id: str = Depends(get_current_user_id),
):
    if len(payload.interests) < 1 or len(payload.interests) > 5:
        raise HTTPException(
            status_code=400,
            detail="Must select between 1 and 5 interests",
        )

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=payload.availabilityMinutes)

    # Check if participant already exists in this session
    existing = storage.get_participant(session_id, user_id)
    blocked = existing.blockedParticipantIds if existing else []

    participant = ParticipantModel(
        participantId=user_id,
        userId=user_id,
        nickname=payload.nickname.strip(),
        interests=payload.interests,
        intention=payload.intention,
        preferredFormat=payload.preferredFormat,
        availabilityMinutes=payload.availabilityMinutes,
        availabilityExpiresAt=expires_at.isoformat(),
        discoverability=False,  # Explicit opt-in toggle required by spec
        blockedParticipantIds=blocked,
        status=ParticipantStatus.ACTIVE,
        joinedAt=now.isoformat(),
    )
    storage.save_participant(session_id, participant)
    return participant

@app.get("/sessions/{session_id}/participants/me", response_model=ParticipantModel)
def get_my_profile_endpoint(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    participant = storage.get_participant(session_id, user_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Profile not found in this session")
    return participant

@app.put(
    "/sessions/{session_id}/participants/me/discoverability",
    response_model=ParticipantModel,
)
def update_discoverability_endpoint(
    session_id: str,
    payload: UpdateDiscoverabilityRequest,
    user_id: str = Depends(get_current_user_id),
):
    participant = storage.get_participant(session_id, user_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Profile not found in this session")

    participant.discoverability = payload.discoverability
    if payload.discoverability:
        # If enabling and optionally updating availability minutes, extend timer
        minutes = payload.availabilityMinutes or participant.availabilityMinutes
        participant.availabilityMinutes = minutes
        now = datetime.now(timezone.utc)
        participant.availabilityExpiresAt = (now + timedelta(minutes=minutes)).isoformat()
        participant.status = ParticipantStatus.ACTIVE

    storage.save_participant(session_id, participant)
    return participant

@app.delete("/sessions/{session_id}/participants/me")
def leave_session_endpoint(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    participant = storage.get_participant(session_id, user_id)
    if participant:
        participant.status = ParticipantStatus.LEFT
        participant.discoverability = False
        storage.save_participant(session_id, participant)
    return {"status": "left"}

# ── Discover (Ranked Browse List) ────────────────────────────────────────────

@app.get("/sessions/{session_id}/discover", response_model=List[ParticipantSummary])
def discover_endpoint(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    requesting = storage.get_participant(session_id, user_id)
    if not requesting:
        raise HTTPException(status_code=404, detail="Must join session before discovering")

    all_participants = storage.list_participants(session_id)
    return matching.get_discover_list(all_participants, requesting)

# ── Conversation Requests ───────────────────────────────────────────────────

@app.post("/sessions/{session_id}/requests", response_model=ConversationRequestModel)
def send_request_endpoint(
    session_id: str,
    payload: CreateConversationRequest,
    user_id: str = Depends(get_current_user_id),
):
    sender = storage.get_participant(session_id, user_id)
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not in session")

    recipient = storage.get_participant(session_id, payload.toParticipantId)
    if not recipient or recipient.status != ParticipantStatus.ACTIVE:
        raise HTTPException(status_code=404, detail="Recipient is not currently available")

    if payload.toParticipantId in (sender.blockedParticipantIds or []):
        raise HTTPException(status_code=400, detail="Cannot send request to this participant")

    # Check for existing pending request
    existing_req = storage.find_request_between(session_id, user_id, payload.toParticipantId)
    if existing_req and existing_req.status == RequestStatus.PENDING:
        return existing_req

    shared = matching.calculate_shared_interests(sender.interests, recipient.interests)

    # Generate Gemini Prompt 1 blurb
    blurb, is_fallback = gemini_service.generate_request_blurb(
        sender_interests=sender.interests,
        recipient_interests=recipient.interests,
        shared_interests=shared,
        sender_intention=sender.intention.value,
        recipient_intention=recipient.intention.value,
    )

    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    req = ConversationRequestModel(
        requestId=request_id,
        fromParticipantId=user_id,
        toParticipantId=payload.toParticipantId,
        status=RequestStatus.PENDING,
        geminiBlurb=blurb,
        geminiBlurbFallback=is_fallback,
        createdAt=now,
    )
    storage.save_request(session_id, req)
    return req

@app.get(
    "/sessions/{session_id}/requests/incoming",
    response_model=List[ConversationRequestModel],
)
def get_incoming_requests_endpoint(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    recipient = storage.get_participant(session_id, user_id)
    if not recipient:
        return []

    incoming = storage.list_incoming_requests(session_id, user_id)
    results = []
    for req in incoming:
        sender = storage.get_participant(session_id, req.fromParticipantId)
        if sender and sender.status == ParticipantStatus.ACTIVE:
            shared = matching.calculate_shared_interests(sender.interests, recipient.interests)
            summary = ParticipantSummary(
                participantId=sender.participantId,
                interests=sender.interests,
                intention=sender.intention,
                preferredFormat=sender.preferredFormat,
                sharedInterests=shared,
                sharedInterestCount=len(shared),
                availabilityExpiresAt=sender.availabilityExpiresAt,
                isOpenTable=False,
            )
            req_copy = req.model_copy()
            req_copy.senderSummary = summary
            results.append(req_copy)
    return results

@app.put("/sessions/{session_id}/requests/{request_id}/accept")
def accept_request_endpoint(
    session_id: str,
    request_id: str,
    user_id: str = Depends(get_current_user_id),
):
    req = storage.get_request(session_id, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.toParticipantId != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")

    req.status = RequestStatus.ACCEPTED
    storage.save_request(session_id, req)

    # Form Connection
    sender = storage.get_participant(session_id, req.fromParticipantId)
    recipient = storage.get_participant(session_id, req.toParticipantId)

    if not sender or not recipient:
        raise HTTPException(status_code=500, detail="Participant record missing")

    shared = matching.calculate_shared_interests(sender.interests, recipient.interests)

    # Generate Gemini Prompt 2 Icebreaker
    icebreaker, is_fallback = gemini_service.generate_icebreaker(
        a_name=sender.nickname,
        a_interests=sender.interests,
        a_intention=sender.intention.value,
        b_name=recipient.nickname,
        b_interests=recipient.interests,
        b_intention=recipient.intention.value,
        shared_interests=shared,
    )

    connection_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    conn = ConnectionModel(
        connectionId=connection_id,
        participantIds=[sender.participantId, recipient.participantId],
        icebreaker=icebreaker,
        icebreakerFallback=is_fallback,
        isOpenTable=False,
        connectedAt=now,
    )
    storage.save_connection(session_id, conn)

    return {
        "connectionFormed": True,
        "connectionId": connection_id,
    }

@app.put("/sessions/{session_id}/requests/{request_id}/decline")
def decline_request_endpoint(
    session_id: str,
    request_id: str,
    user_id: str = Depends(get_current_user_id),
):
    req = storage.get_request(session_id, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.toParticipantId != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to decline this request")

    req.status = RequestStatus.DECLINED
    storage.save_request(session_id, req)

    # Bidirectional block for this session (spec Q4 & Q10)
    sender = storage.get_participant(session_id, req.fromParticipantId)
    recipient = storage.get_participant(session_id, req.toParticipantId)

    if recipient:
        if req.fromParticipantId not in recipient.blockedParticipantIds:
            recipient.blockedParticipantIds.append(req.fromParticipantId)
            storage.save_participant(session_id, recipient)

    if sender:
        if req.toParticipantId not in sender.blockedParticipantIds:
            sender.blockedParticipantIds.append(req.toParticipantId)
            storage.save_participant(session_id, sender)

    return {"declined": True}

# ── Connections ─────────────────────────────────────────────────────────────

@app.get("/sessions/{session_id}/connections", response_model=List[ConnectionModel])
def get_connections_endpoint(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    connections = storage.list_connections_for_participant(session_id, user_id)
    results = []
    for conn in connections:
        # Find other participant(s) to reveal identity
        other_ids = [pid for pid in conn.participantIds if pid != user_id]
        conn_copy = conn.model_copy()
        if other_ids:
            other_p = storage.get_participant(session_id, other_ids[0])
            if other_p:
                conn_copy.otherParticipant = {
                    "nickname": other_p.nickname,
                    "interests": other_p.interests,
                    "intention": other_p.intention,
                }
        results.append(conn_copy)
    return results

@app.put(
    "/sessions/{session_id}/connections/{connection_id}/open-table",
    response_model=ConnectionModel,
)
def open_table_endpoint(
    session_id: str,
    connection_id: str,
    user_id: str = Depends(get_current_user_id),
):
    conn = storage.get_connection(session_id, connection_id)
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    if user_id not in conn.participantIds:
        raise HTTPException(status_code=403, detail="Not authorized")

    conn.isOpenTable = True
    storage.save_connection(session_id, conn)
    return conn
