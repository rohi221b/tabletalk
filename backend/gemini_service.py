from __future__ import annotations
import logging
from typing import List, Optional, Tuple
import httpx
import config

logger = logging.getLogger("gemini_service")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

def _call_gemini_with_retry(prompt: str) -> Optional[str]:
    """
    Calls Gemini 2.0 Flash via standard Google REST API with 1 silent retry.
    Returns generated string or None.
    """
    if not config.GEMINI_API_KEY:
        return None

    url = f"{GEMINI_API_URL}?key={config.GEMINI_API_KEY}"
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 150,
        }
    }

    for attempt in range(2):
        try:
            with httpx.Client(timeout=8.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            text = parts[0].get("text", "").strip()
                            if text:
                                return text
                else:
                    logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.warning(f"Gemini API attempt {attempt + 1} failed: {e}")

    return None

def generate_request_blurb(
    sender_interests: List[str],
    recipient_interests: List[str],
    shared_interests: List[str],
    sender_intention: str,
    recipient_intention: str
) -> Tuple[str, bool]:
    """
    Prompt 1: Conversation Request Blurb.
    No names included. Max 2 sentences.
    Returns (blurb_text, is_fallback).
    """
    shared_str = ", ".join(shared_interests) if shared_interests else "shared topics"
    fallback_text = f"You both share an interest in {shared_str}. This could be a great conversation."

    prompt = f"""
You are TableTalk, an AI companion in a café helping two people connect in person.
Write a friendly, enticing 1 to 2 sentence blurb for someone receiving a conversation request from another customer.
Do NOT use any names.

Context:
- Sender interests: {', '.join(sender_interests)}
- Recipient interests: {', '.join(recipient_interests)}
- Shared interests: {shared_str}
- Sender social intention: {sender_intention.replace('_', ' ')}
- Recipient social intention: {recipient_intention.replace('_', ' ')}

Respond ONLY with the 1-2 sentence blurb. No greetings, no quotes, no markdown.
"""
    result = _call_gemini_with_retry(prompt)
    if result:
        clean = result.strip('"').strip("'").strip()
        if clean:
            return clean, False

    return fallback_text, True

def generate_icebreaker(
    a_name: str,
    a_interests: List[str],
    a_intention: str,
    b_name: str,
    b_interests: List[str],
    b_intention: str,
    shared_interests: List[str]
) -> Tuple[str, bool]:
    """
    Prompt 2: Icebreaker on mutual acceptance.
    Includes names, interests, intentions. One specific sentence.
    Returns (icebreaker_text, is_fallback).
    """
    first_shared = shared_interests[0] if shared_interests else "your shared interests"
    fallback_text = f"Ask {b_name} what they think about {first_shared} — you both chose it."

    prompt = f"""
You are TableTalk, an AI café companion. Two strangers ({a_name} and {b_name}) in the same café have just mutually agreed to talk!
Give them ONE specific, engaging, and friendly icebreaker question or topic to start their in-person conversation right now.
Focus on their shared passion ({', '.join(shared_interests) if shared_interests else first_shared}).

Details:
- Person 1: {a_name} (Intention: {a_intention.replace('_', ' ')}, Interests: {', '.join(a_interests)})
- Person 2: {b_name} (Intention: {b_intention.replace('_', ' ')}, Interests: {', '.join(b_interests)})

Respond ONLY with one concrete sentence they can say to each other. No preface, no quotes.
"""
    result = _call_gemini_with_retry(prompt)
    if result:
        clean = result.strip('"').strip("'").strip()
        if clean:
            return clean, False

    return fallback_text, True
