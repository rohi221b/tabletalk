import pytest
from fastapi.testclient import TestClient
from main import app
import storage

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_storage():
    # Reset in-memory store for clean test isolation
    storage.memory_store = storage.MemoryStore()

def test_full_tabletalk_journey():
    # 1. Resolve café and session
    cafe_res = client.get("/cafes/cafe-alpha")
    assert cafe_res.status_code == 200
    cafe_data = cafe_res.json()
    assert cafe_data["cafeId"] == "cafe-alpha"
    session_id = cafe_data["sessionId"]
    assert "cafe-alpha_" in session_id

    # 2. Alice joins session
    alice_token = "user-alice-123"
    alice_join = client.post(
        f"/sessions/{session_id}/join",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={
            "nickname": "Alice",
            "interests": ["AI", "technology", "startups"],
            "intention": "discuss_topics",
            "preferredFormat": "one_to_one",
            "availabilityMinutes": 30,
        },
    )
    assert alice_join.status_code == 200
    assert alice_join.json()["nickname"] == "Alice"
    assert alice_join.json()["discoverability"] is False

    # 3. Bob joins session
    bob_token = "user-bob-456"
    bob_join = client.post(
        f"/sessions/{session_id}/join",
        headers={"Authorization": f"Bearer {bob_token}"},
        json={
            "nickname": "Bob",
            "interests": ["technology", "startups", "travel"],
            "intention": "discuss_topics",
            "preferredFormat": "either",
            "availabilityMinutes": 30,
        },
    )
    assert bob_join.status_code == 200

    # 4. Discover is empty when discoverability is False
    disc_before = client.get(
        f"/sessions/{session_id}/discover",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert len(disc_before.json()) == 0

    # 5. Both toggle discoverability ON
    client.put(
        f"/sessions/{session_id}/participants/me/discoverability",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"discoverability": True},
    )
    client.put(
        f"/sessions/{session_id}/participants/me/discoverability",
        headers={"Authorization": f"Bearer {bob_token}"},
        json={"discoverability": True},
    )

    # 6. Alice browses discover list
    disc_alice = client.get(
        f"/sessions/{session_id}/discover",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert disc_alice.status_code == 200
    candidates = disc_alice.json()
    assert len(candidates) == 1
    bob_summary = candidates[0]
    assert bob_summary["participantId"] == bob_token
    # Privacy check: name MUST be hidden
    assert "nickname" not in bob_summary
    assert set(bob_summary["sharedInterests"]) == {"technology", "startups"}
    assert bob_summary["sharedInterestCount"] == 2

    # 7. Alice sends Conversation Request to Bob
    req_res = client.post(
        f"/sessions/{session_id}/requests",
        headers={"Authorization": f"Bearer {alice_token}"},
        json={"toParticipantId": bob_token},
    )
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert req_data["fromParticipantId"] == alice_token
    assert req_data["toParticipantId"] == bob_token
    assert req_data["status"] == "pending"
    assert "geminiBlurb" in req_data
    assert len(req_data["geminiBlurb"]) > 5
    request_id = req_data["requestId"]

    # 8. Bob checks incoming requests
    incoming = client.get(
        f"/sessions/{session_id}/requests/incoming",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert incoming.status_code == 200
    assert len(incoming.json()) == 1
    assert incoming.json()[0]["requestId"] == request_id
    assert incoming.json()[0]["senderSummary"]["sharedInterestCount"] == 2

    # 9. Bob accepts request -> CONNECTION formed!
    accept_res = client.put(
        f"/sessions/{session_id}/requests/{request_id}/accept",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["connectionFormed"] is True

    # 10. Alice checks active connections -> Bob's identity is now revealed!
    conns_alice = client.get(
        f"/sessions/{session_id}/connections",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert conns_alice.status_code == 200
    alice_connections = conns_alice.json()
    assert len(alice_connections) == 1
    conn = alice_connections[0]
    assert conn["otherParticipant"]["nickname"] == "Bob"
    assert "icebreaker" in conn
    assert len(conn["icebreaker"]) > 5

    # 11. Bob checks active connections -> Alice's identity is now revealed!
    conns_bob = client.get(
        f"/sessions/{session_id}/connections",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert conns_bob.status_code == 200
    bob_connections = conns_bob.json()
    assert len(bob_connections) == 1
    assert bob_connections[0]["otherParticipant"]["nickname"] == "Alice"

    # 12. Open Table feature (stretch)
    conn_id = conn["connectionId"]
    open_res = client.put(
        f"/sessions/{session_id}/connections/{conn_id}/open-table",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert open_res.status_code == 200
    assert open_res.json()["isOpenTable"] is True

    # 13. Test Leave Session
    leave_res = client.delete(
        f"/sessions/{session_id}/participants/me",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert leave_res.status_code == 200
    
    # After leave, Alice no longer appears in Bob's discover list
    disc_bob = client.get(
        f"/sessions/{session_id}/discover",
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert len(disc_bob.json()) == 0

def test_silent_decline_and_bidirectional_block():
    session_id = "cafe-alpha_2026-11-01"
    t1 = "user-1"
    t2 = "user-2"

    client.post(
        f"/sessions/{session_id}/join",
        headers={"Authorization": f"Bearer {t1}"},
        json={"nickname": "User 1", "interests": ["AI"], "intention": "make_friends"},
    )
    client.post(
        f"/sessions/{session_id}/join",
        headers={"Authorization": f"Bearer {t2}"},
        json={"nickname": "User 2", "interests": ["AI"], "intention": "make_friends"},
    )
    client.put(
        f"/sessions/{session_id}/participants/me/discoverability",
        headers={"Authorization": f"Bearer {t1}"},
        json={"discoverability": True},
    )
    client.put(
        f"/sessions/{session_id}/participants/me/discoverability",
        headers={"Authorization": f"Bearer {t2}"},
        json={"discoverability": True},
    )

    # t1 requests t2
    req = client.post(
        f"/sessions/{session_id}/requests",
        headers={"Authorization": f"Bearer {t1}"},
        json={"toParticipantId": t2},
    ).json()

    # t2 declines quietly
    dec = client.put(
        f"/sessions/{session_id}/requests/{req['requestId']}/decline",
        headers={"Authorization": f"Bearer {t2}"},
    )
    assert dec.status_code == 200

    # Bidirectional block: neither can see the other
    d1 = client.get(f"/sessions/{session_id}/discover", headers={"Authorization": f"Bearer {t1}"}).json()
    d2 = client.get(f"/sessions/{session_id}/discover", headers={"Authorization": f"Bearer {t2}"}).json()
    assert len(d1) == 0
    assert len(d2) == 0
