# Handoff — deep-link invites and the late join announcement

**Filed:** 2026-08-23. **Status:** all four items are open work, none started.

Four defects traced from one field report. They were briefly filed as GitHub issues
(`peddlenet-web` #9/#10, `peddlenet-app` #454/#455) and then closed in favour of this
document — this file is the record, not the issue tracker.

Two of the four live in `qvintillion/peddlenet-app` (private, separate repo). They are kept here
because all four fall out of the same report and items 1 and 3 have to land together to be worth
anything.

## The field report

> Share link with the peddlenet.app link doesn't always bring users to the app if they have it
> installed. The deep link also doesn't include the original room name. Then a join message
> arrived late — the participants seem never to have met (invite sent over WhatsApp); only after
> peddling a few messages back and forth did it arrive (or possibly from an outpost pickup, or
> maybe they were in range with each other for a bit). The join announcement should have arrived
> after the first peddled message.

Line references below are from `peddlenet-web@ba8144d` and `peddlenet-app@93229c6`.

---

## 1. `shareRoom()` builds the share URL without `?roomName=` — `peddlenet-app`

**Repo:** `qvintillion/peddlenet-app` · **File:** `app/src/main/java/com/peddlenet/festivalchat/ui/components/RoomQRBottomSheet.kt`

The two invite paths build **different URLs** and only one carries the name.

QR path — carries it (`RoomQRBottomSheet.kt:244-249`):

```kotlin
val deepLinkUrl = if (roomName != null && roomName != roomCode) {
    val encodedName = java.net.URLEncoder.encode(roomName, "UTF-8")
    "https://peddlenet.app/chat/$roomCode?roomName=$encodedName"
} else {
    "https://peddlenet.app/chat/$roomCode"
}
```

Share-sheet path — drops it (`RoomQRBottomSheet.kt:294-296`):

```kotlin
private fun shareRoom(context: Context, roomCode: String, roomName: String?) {
    val displayName = roomName ?: roomCode
    val webappUrl = "https://peddlenet.app/chat/$roomCode"   // <-- no ?roomName=
```

`displayName` reaches the human-readable prose and `EXTRA_SUBJECT`, but the **URL** — the only
part that survives being tapped — is name-less.

**Why the receiver can't recover the name.** `RoomCodeGenerator.kt:113-120` already spells this
out: on create, `generateCode()` mints a random `adjective-noun-NN` id with **no relationship to
the typed name**; the name only went to `RoomMetadataManager`, a server that is deliberately torn
down. The name cannot be derived — it has to travel with the code. That reasoning already produced
`NAME_CODE_SEP` / `shareText()` (`RoomCodeGenerator.kt:130-143`) for pasted text; it applies
identically to the shared URL. The receiving end is ready: `MainActivity.kt:124-131` reads
`data.getQueryParameter("roomName")` and falls back to `prettifyRoomCode(roomId)` only when absent
— which is what happens today.

**Fix.** Extract the URL construction at `:244-249` into one helper (e.g.
`RoomCodeGenerator.deepLinkUrl(roomCode, roomName)`) and call it from **both** `generateQRCode` and
`shareRoom`, so the paths can't drift again. Keep the `roomName != null && roomName != roomCode`
guard; consider also skipping the param when `roomName == prettifyRoomCode(roomCode)` — the
condition `shareText()` already uses at `:141` — so a link carries a name only when it adds
information. Cover it alongside `RoomCodeInTextTest.kt`: both invite paths produce the same URL for
the same `(code, name)`.

---

## 2. Web chat page ignores `?roomName=` — `peddlenet-web`

**File:** `src/app/chat/[roomId]/page.tsx`

The name is put *into* the link but never read *out* of it on the web side.

**Written:** `src/components/QRModal.tsx:96-100` sets `roomName` on the invite URL. The native app
does the same for its QR payload and reads it back (item 1).

**Never read:** `src/app/chat/[roomId]/page.tsx` has exactly one `URLSearchParams` read (line 334)
and it pulls only `host`, `name`, and `t` — the QR peer-handshake params. `roomName` is never
consulted. The displayed name comes from:

```ts
// page.tsx:69
const [cachedRoomDisplayName, setCachedRoomDisplayName] = useState(() => prettifyRoomCode(roomId));
// page.tsx:126
const roomDisplayName = serverRoomName || cachedRoomDisplayName;
```

A joiner who has never seen the room before gets `prettifyRoomCode(roomId)` ("Cosmic Dragon 42")
and only ever gets the real name if the WebSocket server happens to report one on join. Same
underlying constraint as item 1: for a created room the name is not derivable from the id.

**Fix.** Read `roomName` from the URL and fold it into the display-name precedence:

1. `serverRoomName` (authoritative, when it arrives)
2. `?roomName=` from the deep link
3. cached name from `localStorage`
4. `prettifyRoomCode(roomId)`

Cache the URL-supplied name via the same `room:<code>:name` localStorage path `src/app/page.tsx:72`
already uses, so a later visit without the query string still shows it.

- Read it after mount, not during the initial render — `page.tsx:65-73` documents the hydration
  constraint (#418).
- Treat the value as untrusted display text: decode, trim, length-cap before rendering.

**Ordering note.** Items 1 and 2 are one user-visible fix in two repos. Fixing either alone still
loses the name for the common path (app shares a name-less URL → web renders the prettified code).

---

## 3. Share links don't reliably open the installed app — `peddlenet-web`

**Files:** `src/app/chat/[roomId]/page.tsx`, `public/manifest.json`, `public/.well-known/assetlinks.json`

**App side is already wired up** (`peddlenet-app`):

- `AndroidManifest.xml:66-76` — `android:autoVerify="true"` filter for `https://peddlenet.app`,
  `pathPrefix="/chat"`.
- `AndroidManifest.xml:79-88` — custom-scheme filter for `peddlenet://chat/<roomId>` that works
  **without** verification.
- `MainActivity.kt:115-142` handles both forms.

**Web side hosts the association:** `public/.well-known/assetlinks.json` delegates
`handle_all_urls` to `com.peddlenet.festivalchat` with two SHA-256 fingerprints.

**What's missing:** nothing in `src/` references `peddlenet://` or `intent://` — there is no
"open in app" path at all. Once the link resolves in a browser the user is stuck on the web client.

```
$ grep -rn "intent://\|peddlenet://\|Open in app" src/ public/sw.js
(no matches)
```

**Why it's intermittent.** App Links are all-or-nothing and several ordinary conditions bypass them:

1. **In-app browsers.** WhatsApp (also Instagram, Messenger, Slack) opens links in its own WebView
   by default. A WebView never consults the App Links table, so the app is never offered — this
   alone explains a WhatsApp-shared link behaving differently from the same link in Gmail. Most
   likely cause of the reported symptom, given the invite went out over WhatsApp.
2. **Verification not established.** `autoVerify` succeeds only if domain verification actually
   completed on that device — it can fail on install, on a network-restricted first boot, or if the
   installed build is signed with a key whose fingerprint isn't in `assetlinks.json`. Both listed
   fingerprints must cover every distribution channel (Play App Signing key *and* upload/debug keys).
3. **Per-app link setting.** The user or an OEM ROM can have "Open supported links" off for
   PeddleNet, and nothing in the flow tells them.

**Also:** `public/manifest.json` has no `id`, no `scope`, and no link-capturing declaration, so for
users on the **installed PWA** a `/chat/...` link opens a plain browser tab rather than the
installed app window.

**Work:**

1. **Give `/chat/<roomId>` an in-app escape hatch (the main fix).** On Android clients, surface an
   explicit "Open in PeddleNet app" affordance navigating to the custom scheme, which needs no
   domain verification:
   `peddlenet://chat/<roomId>?roomName=<name>`
   or, for Chrome, `intent://chat/<roomId>#Intent;scheme=peddlenet;package=com.peddlenet.festivalchat;S.browser_fallback_url=<web url>;end`,
   which falls back to the web page cleanly when the app isn't installed. Preserve the full query
   string (item 2 — the name has to survive the handoff).
   Make it a **visible button, not an auto-redirect**: an auto-redirect punishes people who
   deliberately want the web client, and in-app WebViews often block scheme navigations without a
   user gesture.
2. **Detect the in-app-browser case explicitly.** WhatsApp's WebView UA is identifiable; when
   detected, prompt "open in browser or app" rather than silently rendering the web client — that
   context also breaks notifications and install prompts.
3. **Verify the App Links association end to end.** Confirm the live
   `/.well-known/assetlinks.json` response (status, `Content-Type: application/json`, no redirect)
   and confirm the fingerprints cover the shipping signing key(s), e.g.
   `adb shell pm get-app-links com.peddlenet.festivalchat` on a device where the link fails.
   **Not yet verified** — outbound requests to `peddlenet.app` were blocked from the sandbox this
   was investigated in.
4. **PWA link capture.** Add `id` and `scope` to `public/manifest.json` and declare link handling
   (`launch_handler` / `handle_links`).

---

## 4. Join announcement arrives long after the joiner's first peddled message — `peddlenet-app`

**Repo:** `qvintillion/peddlenet-app` · **Files:** `BluetoothMeshManager.kt`, `peddlenet-core/.../RecordlessAnnounceGate.kt`, `MembershipLedger.kt`, `AntiEntropyScope.kt`

**Expected:** the join announcement arrives **no later than the joiner's first peddled message**. A
message from someone whose arrival hasn't been announced reads as a stranger appearing out of
nowhere, and the transcript ordering is backwards.

**Why this looks structural rather than a race.** Every store-and-forward / catch-up lane in the
receive path is **chat-typed**. Membership has no equivalent, so a room-join frame that finds no
live path at the moment it is emitted has nothing to ride later.

| Lane | Where | Gate |
|---|---|---|
| Replay buffer | `BluetoothMeshManager.kt:5161` | `if (message.type == "chat")` |
| Anchor drop-box hold (S2) | `BluetoothMeshManager.kt:~5176` | inside the same `type == "chat"` block |
| Drop-box carve-out for left rooms | `BluetoothMeshManager.kt:~3871` | `if (anchorMode && message.type == "chat")` |
| Peddler hold | `BluetoothMeshManager.kt:~4001` | `if (peddlerMode && !anchorMode && message.type == "chat" && …)` |
| Rejoin replay / link replay | `scheduleRejoinReplay`, `scheduleLinkReplay` → `offerMissedChats` | chats only, by name and construction |

**Open question — resolve this first.** The courier hold at `BluetoothMeshManager.kt:~5290`
(`peddlerMode && !anchorMode && !authoredByUs`) is **not** type-gated; its comment says a courier
"picks up whatever it hears, anywhere". Confirm whether room-join frames actually reach and survive
that lane *and its replay*. If they do, the problem is narrower than the table suggests and is
about **ordering**, not **carriage** — which decides which fix below applies.

**The other propagation route is anti-entropy, and it's strictly reactive.**
`AntiEntropyScope.kt`: *"a peer's own hop-0 `room-join` names the room, and we answer only for THAT
room… Being a cache is passive: it responds, it never solicits."* A cached record therefore cannot
reach a node that never gets a hop-0 join from the member in question.

**The same shape is already documented for chats.** `BluetoothMeshManager.kt:1560-1575`, the `#168`
LINK-READY CATCH-UP note:

> nord's link to the iPad came up first, so a5 learned of the join ONLY as the iPad's forward —
> **10 of 10 room-joins arrived at hopCount 1** — … the a5↔nord DIRECT link then formed 14 s later,
> but no fresh room-join accompanied it: the reciprocal handshake is deduped session-wide
> (`sentRoomJoinTo`, "skipping reciprocal (anti-loop)").

`#168` gave *chats* a second trigger. Membership never got one — and `sentRoomJoinTo`'s
session-wide dedup means the joiner will not re-emit its join when a path finally appears.

**Secondary suspect — suppressed rather than missing.** If the room-join frame did arrive but
stayed silent:

- `RecordlessAnnounceGate.kt` — joins landing inside `ARRIVAL_MUTE_MS` of our own room entry absorb
  silently ("on OUR arrival every existing member's announce is presence, not news"), and
  `onRoomEntered(existingMembers)` makes a roster-seeded peer silent **however late** its join
  arrives (test: `rosterSeededMembersNeverAnnounceHoweverLateTheirJoinArrives`). If a peer is seeded
  onto the roster from a *chat* frame or a scan advert before its join lands, suppression is
  correct-by-design — but the user still never sees an arrival.
- `MembershipLedger.announcementFor` announces only genuine state changes; `REFRESHED` is silent. If
  the first arrival is a re-announce at higher seq for a state already inferred, nothing prints.

**Direction:**

1. **Answer the carriage question first** (instrument whether `type == "room-join"` frames are held
   and replayed by the courier lane at `:~5290`, or only by the live forward path).
2. **Give membership a carriage lane.** Either let the drop-box/outbox hold membership frames as
   first-class cargo, or piggyback the author's signed `MemberRecord` on chat frames — a chat
   already carries `pk`/`sig`, and a signed record is self-verifying (`MembershipLedger` rules 2-4:
   a holder can only serve or withhold, never forge). Piggybacking makes the invariant automatic:
   *a chat can never outrun its author's join.*
3. **Order the announcement against the chat.** Where a chat arrives from a sender with no announced
   membership in this room, emit the arrival line before the message renders — derived from the
   chat's own signed identity if the record hasn't landed.
4. **Check the seeding path against the mute gate**, so a peer seeded onto the roster by an inbound
   chat isn't classified as pre-existing presence and silently swallowed.

**Repro sketch.** Two phones that have never linked, out of direct range, one relay/outpost between:

1. A creates a room, shares the link out of band.
2. B opens the link and joins while out of A's direct range.
3. B sends a message; let it peddle through.

Expected: A sees "B joined" at or before B's first message. Observed: the message arrives, the join
line does not — it turns up only after further churn or a direct/outpost contact.

---

## Suggested order of work

1. **Items 1 + 2 together** — small, confirmed, one user-visible fix across two repos.
2. **Item 3** — start with the `intent://` / `peddlenet://` escape hatch on the chat page; the
   assetlinks verification is a separate check needing a real device.
3. **Item 4** — largest and least certain. Resolve the courier-lane question before designing.
