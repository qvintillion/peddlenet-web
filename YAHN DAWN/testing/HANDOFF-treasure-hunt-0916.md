# 🏁 HAND-OFF — the Yahn Dawn treasure hunt (session of 2026-09-11 → 09-16)

**Event starts TOMORROW (Sept 17–20).** Design session only — no app code was written or changed.
Deliverables are two docs on `peddlenet-web` branch `claude/yahn-dawn-treasure-hunt-t33ixy`,
under `YAHN DAWN/testing/`.

---

## 1. What was asked, and where it landed

The user wanted a simple treasure hunt to run at Yahn Dawn using PeddleNet — originally *"drop a
message in make-a-trade that people pick up at a certain outpost."*

**The design we landed on — "The Peddler's Run":**

Four posts. Each has a **physical card** nailed up carrying a **hunt-room code**, plus a bead tin.
Join the code, stand at the post ~30 s, and the outpost hands you a **drop** containing the next
post's name and one **word**. Four beads, or the four words in order, claims the prize.

**Two locks, both real and both unrelayable:**
1. the **code** exists only on the physical card — never in the app, never in any room;
2. the **drop** only leaves the outpost to a room member standing in radio range.

**Beads are the actual game; the app is the flavour.** That is deliberate — see §3.

---

## 2. 🟥 The load-bearing conclusion: you cannot bind a payload to a place

The user's sharpest question was *"how do I post a word that can't be passed along through relays
or peddlers?"* The answer is that **you can't, at the message layer**, and the design follows from
accepting it:

- A store-and-forward mesh exists to make messages travel. Relay forwarding, peddler carry and
  `ChatReplayBuffer` replay-on-join (50 msgs / 10 min / join-triggered) all defeat place-binding
  by design.
- Even with perfect radio behaviour, the first collector can read the word and retype it.
- ⇒ **Any game where the payload IS the secret leaks at the first collector.**

**What genuinely cannot travel** (`EVENT-PREP.md`, on trilateration):

> Distances are first-person RSSI — **they cannot ride the mesh.**

BLE adverts are hop-0 and a GATT link is a two-way physical fact. So *proximity* is bindable even
though *payload* is not. Every good option below is built on that.

**One current behaviour is doing real work here.** Per `EVENT-PREP.md` §"outpost → peddler
handoff", a peddler today **refuses** frames served from an outpost — outposts are terminal
mailboxes, and mail only leaves into a recipient who personally walks up. That is filed as a *gap*
with a pending option (a) to fix it.

🟥 **Do NOT ship option (a) before the 20th.** Terminal outposts are the hunt's mechanic.

---

## 3. Why beads, and not the app

The hunt rides the outpost drop path end to end: link → ingest → persist → replay → room-scoping.
It also rides **#532** (*"the acceptor could never bootstrap a link to a cross-room outpost"*),
merged `48ad3c74` on 09-10 and shipping first in **1.8.1-beta.2 / 676** — never run at scale.

So the design degrades: a dead post costs a walk, not the game. The crew sheet's triage ends with
*"hand them the bead, the game continues."*

---

## 4. ⭐ Findings from the code worth keeping

All verified by reading `qvintillion/peddlenet-app` at `b03633be` / `1a8e195d`.

### 4.1 The Tier 0.5 / Tier 1 docs are STALE — the drop path has shipped

`docs/features/peddler-tier05-mail-drop.md` still says **"SCOPED, not started"** (08-17). The code
disagrees. `AppDatabase.kt` is at **v8**:

| migration | adds | dated |
|---|---|---|
| v3→v4 | `drop_frames`, `drop_stats` (Tier 0.5 S2) | 08-17 |
| v4→v5 | `outbox_entries.dropOff`, `expiresAtWall` (S4) | 08-17 |
| v5→v6 | `messages.peddledAtWall` — the 🧳 receipt stamp | 08-17 |
| v6→v7 | `drop_stats.carried` — the Tier 1 peddler lane | 08-19 |
| v7→v8 | `messages.viaPath` — received-side provenance | 08-19 |

And `peddlenet-core/.../core/` holds `DropStore.kt`, `FileBackedDropStore.kt`, `DropCoordinator.kt`,
`DropAckTargetPolicy.kt`, `CargoOfferTarget.kt`, `CarrierProvenance.kt`, `CustodyReceiptDelivery.kt`,
`PeddlerArrivals.kt`, `NearbyPeddlers.kt`, `NearestOutpost.kt`, `ProvenanceUpgrade.kt`.

⇒ **Tier 1 shipped too**, and `viaPath` + `CarrierProvenance` suggest the collection-provenance item
that §6 of the Tier 0.5 doc lists as "not yet built on Android either" also landed.
📋 **Doc debt: the Tier 0.5/1 feature docs need a status pass post-event.**

### 4.2 The mechanic the hunt depends on

- **Anchor ingest is room-agnostic; replay is recipient-scoped.** The outpost stores what it hears
  regardless of room, and replays only frames for rooms the arriving peer is in. ⇒ **the outpost
  does NOT need to be a member of the hunt room** — it only needs to hear the drop. Leave it in its
  zone room (the zone map depends on that; a device has one current room).
- **Collection is automatic** — no collect button. Passive radio proximity.
- **The drop-off ack fires only after the store persists** (S5). That confirmation is the crew's
  only proof a post is really seeded. The sheet makes it a hard rule.
- **Room codes linkify in chat** (`RoomCodeGenerator.CODE_IN_TEXT`) — a code typed in a message
  becomes tap-to-join. Since 08-22 codes are 4-digit (24.6 bits); ⚠️ `19xx`/`20xx` are deliberately
  excluded and will NOT linkify.

### 4.3 The passport idea (user liked it; deferred to October)

An in-app *"outposts you have personally stood at"* screen. Unforgeable by relay, and **strictly
more robust than the clue-drop — it needs only the link to form, not the whole chain.**

- ⭐ **Right predicate: a held direct GATT link to an `rk:anchor` node**, already computed as
  `NearestOutpost.Candidate.direct` ("True when we hold a live direct radio link"), plus a dwell
  (~30 s) so a walk-past doesn't stamp.
- ❌ **Not** `RightHereHysteresis` — that's GPS co-location, and its own field note records accuracy
  swinging 9↔51 m at ~4 m true separation. Too coarse to certify a visit.
- ❌ Not bare advert reception — too generous in an open field.
- 🟥 **Nothing durable exists to extend.** `AppDatabase` v8 has no landmark/visit table; the 120 s
  `anchorStaleMs` registration is live state only.
- **Cost:** new `outpost_visits` table (v8→v9, additive, shaped like `MIGRATION_3_4` — note CI's
  `verify_room_migration.py` asserts the chain), a pure `PassportStamp` in core (the `NearestOutpost`
  house pattern: pure, unit-tested, freeze-exempt by construction), one write site, one screen.
- ⚠️ The write site lands in `BluetoothMeshManager` — one of the six files the guard-change CI
  workflow matches, so the PR needs a `Field-verified:` line (where "no" passes).
- **Recommended against for this event:** a Room migration on the event fleet in freeze week, whose
  rollback (a downgrade) wipes every room and all chat history per the runbook. Build it in October.

### 4.4 ⭐ You already have a passport — in the anchor captures

Persistent captures run on every Android anchor all four days (field-lab plan §1). **A hop-0 link
from a player's node to an anchor at time T is a visit stamp** — first-person, unforgeable by the
player, already being recorded, zero app changes.

Post-event: stitch per-node visit timelines → a *"most posts visited"* award, and it feeds
`PEDDLER_ROLE_DESIGN_AND_FIELD_LAB.md` §3 at the same time. It also answers the question worth
knowing before building §4.3: did people actually walk to all four posts?

---

## 5. Unverified — the pre-flight test exists to settle these

Written as a 7-step rig test in `PEDDLERS-RUN.md`. Two steps carry the weight:

| open question | the test |
|---|---|
| Does a drop actually land and get confirmed? | step 2 — the "dropped at the outpost" ack |
| 🟥 **Does a drop survive being collected twice?** Tier 0.5 has `delete-on-confirmed-delivery`; `EVENT-PREP` separately says outposts keep their copy by design. These may conflict for a room-broadcast clue | steps 4 + 6 |
| Is the drop genuinely place-bound? | ⭐ **step 5** — a third phone in the room, far from the post, must get **nothing** |
| Does it survive the mandatory morning reboot? | step 7 |

**If step 5 fails, run beads-only.** If step 2 fails, stop — nothing else works.

---

## 6. State of the work

**Branch `claude/yahn-dawn-treasure-hunt-t33ixy` on `peddlenet-web`**, pushed:

| file | what |
|---|---|
| `YAHN DAWN/testing/PEDDLERS-RUN.md` | crew doc — pre-flight test, post table, morning additions to `EVENT_RUNBOOK.md §2` step 4, triage, house rules |
| `YAHN DAWN/testing/peddlers-run-cards.html` | prints to 5 pages — 4 post cards to nail up + a crew seeding sheet |

Placeholders the user has NOT yet filled in: post 4's zone, card locations, and the post-3 clue
text. Codes (`amber-lantern-4417`, `velvet-ember-3852`, `copper-thistle-5106`, `quiet-harbor-2741`)
and words (**salt · ember · willow · dawn**) are invented and swappable.

⚠️ `676` was **built and banked but NOT uploaded** as of `HANDOFF-0910-NIGHT.md`. If the fleet ends
up on 675, #532's fix is absent — re-run pre-flight step 2 before seeding.

**Offered, not done:** an ADR-shaped October spec for the passport; the log-stitching script for
§4.4; a fifth post.

---

## 7. Notes for whoever picks this up

- **`peddlenet-app` is attached READ-ONLY here.** Everything in §4 came from the GitHub API, not a
  clone. Push access must be added before anything lands in that repo.
- 🟥 **`mcp__github__search_code` returns zero results for `peddlenet-app`** — even for strings
  known to exist (`yahn` in `EVENT-PREP.md`). The index looks broken. **Navigate directories or
  clone; do not trust a negative search.**
- **The real `YAHN DAWN/` folder is on the user's laptop**, outside both repos (referenced as
  `YAHN DAWN/pl-caravan/DESIGN-DOC.md` in `EVENT-PREP.md`). The folder in `peddlenet-web` is one I
  created so the files had a home they could be pushed from; the user copies them across by hand.
- Docs read: `EVENT-PREP.md`, `operations/EVENT_RUNBOOK.md`, `HANDOFF-0910-NIGHT.md`,
  `features/peddler-tier05-mail-drop.md`, `features/delivered-vs-read-and-outpost-ui-0825.md`,
  `architecture/PEDDLER_ROLE_DESIGN_AND_FIELD_LAB.md`, `architecture/ADR-0009-*`,
  `architecture/beacon-trilateration-config.md`, plus `AppDatabase.kt`, `NearestOutpost.kt`,
  `RightHereHysteresis.kt`.
