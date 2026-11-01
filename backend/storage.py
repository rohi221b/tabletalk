from __future__ import annotations
import os
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone
import config
from models import (
    ParticipantModel,
    ConversationRequestModel,
    ConnectionModel,
    ParticipantStatus,
    RequestStatus,
)

logger = logging.getLogger("storage")

# Try to initialize Firebase Admin if credentials available
_firestore_db = None
if config.FIREBASE_CREDENTIALS_PATH and os.path.exists(config.FIREBASE_CREDENTIALS_PATH):
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        cred = credentials.Certificate(config.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        _firestore_db = firestore.client()
        logger.info("Initialized Firestore with service account credentials.")
    except Exception as e:
        logger.warning(f"Could not initialize Firestore with credentials: {e}")

# In-memory store (used in dev mode, testing, or when Firestore credentials not set)
class MemoryStore:
    def __init__(self):
        self.cafes: Dict[str, dict] = {
            "cafe-alpha": {
                "cafeId": "cafe-alpha",
                "cafeName": "Café Alpha",
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
        }
        # session_id -> { participant_id -> ParticipantModel }
        self.participants: Dict[str, Dict[str, ParticipantModel]] = {}
        # session_id -> { request_id -> ConversationRequestModel }
        self.requests: Dict[str, Dict[str, ConversationRequestModel]] = {}
        # session_id -> { connection_id -> ConnectionModel }
        self.connections: Dict[str, Dict[str, ConnectionModel]] = {}

memory_store = MemoryStore()

# ── Cafés ───────────────────────────────────────────────────────────────────

def get_cafe(cafe_id: str) -> Optional[dict]:
    if _firestore_db:
        try:
            doc = _firestore_db.collection("cafes").document(cafe_id).get()
            if doc.exists:
                return doc.to_dict()
        except Exception as e:
            logger.error(f"Firestore get_cafe error: {e}")
    return memory_store.cafes.get(cafe_id)

def set_cafe(cafe_id: str, data: dict):
    if _firestore_db:
        try:
            _firestore_db.collection("cafes").document(cafe_id).set(data)
        except Exception as e:
            logger.error(f"Firestore set_cafe error: {e}")
    memory_store.cafes[cafe_id] = data

# ── Participants ────────────────────────────────────────────────────────────

def get_participant(session_id: str, participant_id: str) -> Optional[ParticipantModel]:
    if _firestore_db:
        try:
            doc = (
                _firestore_db.collection("sessions")
                .document(session_id)
                .collection("participants")
                .document(participant_id)
                .get()
            )
            if doc.exists:
                return ParticipantModel(**doc.to_dict())
        except Exception as e:
            logger.error(f"Firestore get_participant error: {e}")
    session_parts = memory_store.participants.get(session_id, {})
    return session_parts.get(participant_id)

def save_participant(session_id: str, participant: ParticipantModel):
    if _firestore_db:
        try:
            (
                _firestore_db.collection("sessions")
                .document(session_id)
                .collection("participants")
                .document(participant.participantId)
                .set(participant.model_dump())
            )
        except Exception as e:
            logger.error(f"Firestore save_participant error: {e}")
    if session_id not in memory_store.participants:
        memory_store.participants[session_id] = {}
    memory_store.participants[session_id][participant.participantId] = participant

def list_participants(session_id: str) -> List[ParticipantModel]:
    if _firestore_db:
        try:
            docs = (
                _firestore_db.collection("sessions")
                .document(session_id)
                .collection("participants")
                .stream()
            )
            return [ParticipantModel(**doc.to_dict()) for doc in docs]
        except Exception as e:
            logger.error(f"Firestore list_participants error: {e}")
    return list(memory_store.participants.get(session_id, {}).values())

# ── Conversation Requests ───────────────────────────────────────────────────

def save_request(session_id: str, req: ConversationRequestModel):
    if _firestore_db:
        try:
            (
                _firestore_db.collection("sessions")
                .document(session_id)
                .collection("conversation_requests")
                .document(req.requestId)
                .set(req.model_dump())
            )
        except Exception as e:
            logger.error(f"Firestore save_request error: {e}")
    if session_id not in memory_store.requests:
        memory_store.requests[session_id] = {}
    memory_store.requests[session_id][req.requestId] = req

def get_request(session_id: str, request_id: str) -> Optional[ConversationRequestModel]:
    if _firestore_db:
        try:
            doc = (
                _firestore_db.collection("sessions")
                .document(session_id)
                .collection("conversation_requests")
                .document(request_id)
                .get()
            )
            if doc.exists:
                return ConversationRequestModel(**doc.to_dict())
        except Exception as e:
            logger.error(f"Firestore get_request error: {e}")
    return memory_store.requests.get(session_id, {}).get(request_id)

def list_incoming_requests(session_id: str, to_participant_id: str) -> List[ConversationRequestModel]:
    if _firestore_db:
        try:
            docs = (
                _firestore_db.collection("sessions")
                .document(session_id)
                .collection("conversation_requests")
                .where("toParticipantId", "==", to_participant_id)
                .where("status", "==", RequestStatus.PENDING.value)
                .stream()
            )
            return [ConversationRequestModel(**doc.to_dict()) for doc in docs]
        except Exception as e:
            logger.error(f"Firestore list_incoming_requests error: {e}")
    all_reqs = memory_store.requests.get(session_id, {}).values()
    return [r for r in all_reqs if r.toParticipantId == to_participant_id and r.status == RequestStatus.PENDING]

def find_request_between(session_id: str, from_id: str, to_id: str) -> Optional[ConversationRequestModel]:
    all_reqs = memory_store.requests.get(session_id, {}).values()
    for r in all_reqs:
        if r.fromParticipantId == from_id and r.toParticipantId == to_id:
            return r
    return None

# ── Connections ─────────────────────────────────────────────────────────────

def save_connection(session_id: str, connection: ConnectionModel):
    if _firestore_db:
        try:
            (
                _firestore_db.collection("sessions")
                .document(session_id)
                .collection("connections")
                .document(connection.connectionId)
                .set(connection.model_dump())
            )
        except Exception as e:
            logger.error(f"Firestore save_connection error: {e}")
    if session_id not in memory_store.connections:
        memory_store.connections[session_id] = {}
    memory_store.connections[session_id][connection.connectionId] = connection

def get_connection(session_id: str, connection_id: str) -> Optional[ConnectionModel]:
    if _firestore_db:
        try:
            doc = (
                _firestore_db.collection("sessions")
                .document(session_id)
                .collection("connections")
                .document(connection_id)
                .get()
            )
            if doc.exists:
                return ConnectionModel(**doc.to_dict())
        except Exception as e:
            logger.error(f"Firestore get_connection error: {e}")
    return memory_store.connections.get(session_id, {}).get(connection_id)

def list_connections_for_participant(session_id: str, participant_id: str) -> List[ConnectionModel]:
    if _firestore_db:
        try:
            docs = (
                _firestore_db.collection("sessions")
                .document(session_id)
                .collection("connections")
                .where("participantIds", "array_contains", participant_id)
                .stream()
            )
            return [ConnectionModel(**doc.to_dict()) for doc in docs]
        except Exception as e:
            logger.error(f"Firestore list_connections error: {e}")
    all_conns = memory_store.connections.get(session_id, {}).values()
    return [c for c in all_conns if participant_id in c.participantIds]
