# The Peddler's Run — crew sheet

**Yahn Dawn · Sept 17–20 2026** · event build **1.8.1-beta.2 / 676**

For whoever is seeding posts and answering *"it's not working"*. Written to be read at 2am.
Companion print sheet: `peddlers-run-cards.html` (post cards + seeding sheet, prints on 4 pages).

---

## The game in four lines

Four posts. Each has a card nailed up with a **room code** and a bead tin.
Join the code, stand at the post ~30 seconds, and the outpost hands you a **clue** naming the
next post and giving you one **word**.
Four beads, or the four words in order, claims the prize at the trading post.

Two locks, and both of them are real:

- the **code** exists only on the card at the post — it is not in the app, not in any room;
- the **clue** only leaves the outpost into the hands of someone standing next to it.

Neither can be relayed, carried by a peddler, or forwarded. That is the whole design.

---

## 🟥 Tonight, before you seed anything — the 20-minute test

This has never run at scale. It rides **#532** (*"the acceptor could never bootstrap a link to a
cross-room outpost"*), fixed on 09-10 and shipping first in 676. Prove it on the rig before you
spend an evening seeding posts that may hold nothing.

| # | do | pass looks like |
|---|---|---|
| 1 | **O** = an outpost: joined to its zone room, armed, **foregrounded**, on mains | another phone lists it |
| 2 | **A** joins `test-lantern-4417`, stands at O, drops off a message | ⭐ **"dropped at the outpost" confirmation** |
| 3 | Put A in airplane mode — A must not be a source | — |
| 4 | **B** joins `test-lantern-4417`, walks to O | clue arrives; note how long standing there |
| 5 | **C** joins `test-lantern-4417`, stays far from O **and** from B | ⭐ **C gets nothing** |
| 6 | Bring B and C together, away from O | tells you the real size of the leak |
| 7 | Reboot O, rejoin, foreground. **D** collects | survives the morning protocol |

**Step 2 is the gate.** No confirmation means the drop never landed. Stop and fix, or run
beads-only.

**Step 5 is the game.** If C gets the clue without walking to the post, the drop is not
place-bound. That is not a disaster — **run beads-only and use the app for the story**. Decide
this tonight, not on Friday.

**Step 7 matters because the fleet reboots every morning.** Drops are durable and survive it;
the outpost's room membership does not rejoin itself.

---

## Each morning — five lines on top of the morning protocol

Slot this in after **step 4 (rejoin the room)** of `EVENT_RUNBOOK.md §2`. Budget ~10 minutes on
top of the usual 30–40.

Per post:

- [ ] Outpost is back in its **zone** room after the reboot
- [ ] App **FOREGROUNDED**, in its room, on mains *(screen off is fine; backgrounded is not — a
      backgrounded outpost holds mail nobody can collect)*
- [ ] **Re-drop the clue.** TTL defaults to 24 h, so yesterday's is dying or dead
- [ ] ⭐ **Wait for "dropped at the outpost" before you walk away.** That ack fires only after
      the store persists. No ack, no clue — you have seeded an empty post
- [ ] **Second phone joins the hunt room, walks up, collects.** If nothing arrives, the post is
      dead however healthy it looks on its own screen
- [ ] Card still up, bead tin topped up

---

## The four posts

Codes are **room IDs** — read them back to people, never go by display name. Fill in the blanks
before you print.

| # | Zone | Hunt room ID | Word | Points to | Card location |
|---|------|--------------|------|-----------|---------------|
| 1 | main-stage | `amber-lantern-4417` | **SALT** | swirl-bridge | ____________ |
| 2 | swirl-bridge | `velvet-ember-3852` | **EMBER** | meadow-gate | ____________ |
| 3 | meadow-gate | `copper-thistle-5106` | **WILLOW** | the fourth post | ____________ |
| 4 | ____________ | `quiet-harbor-2741` | **DAWN** | the trading post | ____________ |

Phrase: **salt · ember · willow · dawn**

**Card placement:** inside the radius where collection actually worked in the test — pace it out
and put the card *well* inside it, not at the edge. Someone who reads the card from the fringe,
joins, then wanders off will conclude the app is broken.

**If you mint your own codes:** four digits, and never `19xx` or `20xx` — those deliberately
don't turn into tappable links when typed in chat.

---

## The hook

Post in `make-a-trade` on the first morning, and again each day:

> ◆ **The Peddler's Run.** Four posts on the site, each with a card and a tin. Take a bead, take
> a word. Four words in order at the trading post claims it. Start at the main stage — look for
> the diamond.

Seed only the *existence* of the run, never a code. The codes live on the cards.

---

## "It's not working" — triage, in this order

1. **Are they actually in the hunt room?** Tapping a code in chat joins it; typing needs an exact
   match. Confirm the room ID on their screen against the card.
2. **Are they standing still?** ~30 seconds, within a few metres of the card. Walking past is not
   enough.
3. **Is the outpost foregrounded and in its room?** Its own screen reads healthy either way —
   that is the trap. Check that *another* phone can see it.
4. **Outpost pill flickering on and off every ~90 seconds?** That's **#536**. Cosmetic. Collection
   still works. Do not spend the night on it.
5. **Slow message, or a peer reading Unreachable while standing right there?** Stale MAC.
   🟥 **Wait 5 minutes — it usually clears itself.** If it persists, restart the app on the phone
   that has been **running longest**. Restarting the wrong end does nothing; that's the trap.
6. **Still dead?** Hand them the bead and the word. The game continues. The app is the flavour,
   not the game.

---

## House rules for us

- **Never promise the app.** Beads are the game; the mesh is how it feels magic when it works.
- **Never seed a post without the drop confirmation.**
- **Nothing private in a clue.** Messages are signed but not encrypted — treat rooms like an open
  radio channel. Anyone in the room who walks past gets it, and sender identity is the only thing
  that can't be forged.
- **Do not ship the peddler↔outpost handoff change before the 20th** (`EVENT-PREP.md`, option (a)).
  Outposts being *terminal* mailboxes — a peddler cannot ferry mail out of one — is precisely what
  keeps a clue at its post. Leaving it as-is is the game mechanic.
- **Crews, not individuals.** Once someone collects, they can tell a friend the next code. That's
  teamwork. Design the prize so that's fine.

---

## Afterwards — the passport you already have

Every Android anchor runs a persistent capture all four days. A hop-0 link from a player's node to
an anchor at time T **is a visit stamp** — first-person, unforgeable by the player, and already
being recorded.

Post-event, stitch per-node visit timelines out of the captures: gives you a *"most posts visited"*
award, and feeds the courier field lab (`PEDDLER_ROLE_DESIGN_AND_FIELD_LAB.md` §3) at the same time.
It also answers the question worth knowing before building an in-app passport screen in October:
did people actually walk to all four?
