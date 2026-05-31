---
name: Chat SSE and overlay architecture
description: How Twitch chat streaming and OBS overlay work
---

**Chat SSE:** `GET /api/chat/stream?channel=USERNAME` — streams newline-delimited JSON `ChatMessage` objects via Server-Sent Events. Uses tmi.js connection pool in `artifacts/api-server/src/routes/chat.ts` — one IRC connection per channel, shared across all SSE subscribers.

**Overlay page:** `/overlay?channel=USERNAME` — transparent page for OBS browser source. Messages are queued one at a time with entry animations. TTS via browser `speechSynthesis` using voice params mapped from voiceId names (alloy/echo/fable/onyx/nova/shimmer).

**Chat page:** `/chat` — requires Twitch login; scrolling live chat viewer with mini-avatars.

**Why:** SSE chosen over WebSocket for simplicity; tmi.js handles Twitch IRC anonymously (read-only).
