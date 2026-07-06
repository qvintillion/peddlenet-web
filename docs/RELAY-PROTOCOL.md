# Relay Protocol — how the native BLE mesh bridges into this server

**Status: current as of July 2026 (server on Cloud Run, paired with peddlenet-app v1.5.24).**
The client side of this protocol is documented in [`peddlenet-app` → docs/architecture/RELAY_AND_PRESENCE.md](https://github.com/qvintillion/peddlenet-app/blob/main/docs/architecture/RELAY_AND_PRESENCE.md).

## Concept

A phone running the native PeddleNet app with **relay mode** on keeps one Socket.IO connection to this server and bridges its Bluetooth-mesh neighbors both directions: BLE-only phones reach web users, web users reach the mesh. The relay's socket **must stay connected even when its user isn't in any room** — that's the "silent relay" state.

## Events (relay ↔ server)

| Event | Direction | Purpose |
|---|---|---|
| `register-relay` | relay → server | Marks the socket (`socket.data.isRelay`), joins the `'relays'` Socket.IO room so it receives relay fan-outs. |
| `relay-subscribe` | relay → server | Silent-joins a room channel for bridging. Server replies with a **`relay-roster`** snapshot (real web users in the room) and replays **message history** so a late bridge catches up. |
| `relay-presence` | relay → server | Announces a **bridged BLE peer** as present in a room (the peer's identity, not the relay's). Server stores in the `relayPresence` Map and emits `peer-joined` with `relayed:true`. Cleaned up by stale-sweep, explicit leave, or relay disconnect. |
| `chat-message` | relay → server | Uplink of a BLE-authored chat (raw JSON verbatim — Ed25519 `pk`/`sig` fields preserved for mesh-path re-fans). |
| `relay-forward` | server → `'relays'` room | Downlink fan-out of room chat to every relay bridging that room. |
| `join-room` / `leave-room` | relay → server | The relay **user's own participant identity** (visible member of a room). `leave-room` (added July 2026) removes the participant **without a disconnect** — mirrors the user-cleanup half of the disconnect handler, leaves `relay-presence` entries, `socket.data.isRelay`, and a relay's room-channel subscription untouched. Web clients never need it (their leave *is* a disconnect). |
| `peer-joined` / `peer-left` | server → room | Roster deltas. `relayed:true` = a BLE virtual (excluded from web rosters). ⚠️ Emitted via `socket.to(room)` — **excludes the sender socket**, so a relay never hears about its *own* participant leave; the client compensates locally. |

## Server structures (all in-memory, per-instance)

- `activeUsers` Map — `"displayName_socketId"` → user data (participants, incl. an in-room relay's own identity)
- `rooms` Map — roomId → Set of user keys
- `relayPresence` Map — bridged BLE peers, keyed per relay socket

**Consequence:** a relay and the room's web consumers must land on the **same Cloud Run instance**. There is no cross-instance presence store.

## Operational gotchas

- **Deploy → relay pinning:** after a deploy, existing relay sockets stay connected to the *old* instance while new web clients land on the new one → presence appears split until the relay reconnects (toggle relay off/on in the app, or restart it).
- Duplicate-socket prevention on `join-room` disconnects older sockets of the same display name **in the same room only** (page refresh / multi-tab); navigation between rooms is deliberately allowed.
- History replay: `relay-subscribe` replays up to the room's stored history (cap 100/room, 1h cleanup cycle) — a churning relay that re-subscribes repeatedly will re-pull history each time; healthy clients subscribe once per room per session.
- Web boundary strips mesh signatures: the `chat-message` rebuild for browsers (and what message-history stores) drops `pk`/`sig`/`nodeId` — accepted while web clients neither sign nor verify.

## Deploy

`npm run deploy:websocket:production` → Cloud Build → Cloud Run (`peddlenet-websocket-server`, us-central1). The frontend (Vercel, peddlenet.app) picks up the same WS URL from `next.config.ts`. Remember the relay-pinning gotcha above when verifying a deploy.
