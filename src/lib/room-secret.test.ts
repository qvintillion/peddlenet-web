// Run: node --test src/lib/room-secret.test.ts   (Node 24 strips the types natively)
//
// ⭐ REFUSALS FIRST, then the known answers. The vectors are the SAME ones core's
// `RoomSecretTest.kt` pins, computed independently in Python (`hashlib` + `base64.b32encode`).
// If this file and that one ever disagree, a shared invite opens a different crew in the browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkInvite, decodeShareCode, encodeShareCode, mintCrew, roomIdFor } from './room-secret.ts';

const ascending = Uint8Array.from({ length: 16 }, (_, i) => i);
const ones = new Uint8Array(16).fill(0xff);
const zeros = new Uint8Array(16);
const CODE = 'pn1-aaaqeayeaudaocajbifqydiob4';
const ID = 'amhad76gqsez';

// ── Must REFUSE ──────────────────────────────────────────────────────────────

test('legacy adjective-noun codes, wrong length and wrong prefix are not share codes', () => {
  assert.equal(decodeShareCode('cosmic-dragon-4271'), null);
  assert.equal(decodeShareCode(CODE.slice(0, -1)), null);
  assert.equal(decodeShareCode(CODE + 'a'), null);
  assert.equal(decodeShareCode('pn2-' + CODE.slice(4)), null);
});

test('chars outside base32 are refused', () => {
  for (const bad of ['0', '1', '8', '9', '-', '=']) {
    assert.equal(decodeShareCode(CODE.slice(0, -2) + bad + CODE.slice(-1)), null, `accepted ${bad}`);
  }
});

test('non-zero pad bits are refused: one secret, one spelling', () => {
  const canonical = encodeShareCode(zeros);
  assert.deepEqual(decodeShareCode(canonical), zeros);
  for (const padded of ['b', 'c', 'd']) assert.equal(decodeShareCode(canonical.slice(0, -1) + padded), null);
});

test('an invite whose secret derives another id, or is truncated, is damaged', async () => {
  assert.deepEqual(await checkInvite(ID, `#s=${encodeShareCode(ones)}`), { kind: 'damaged' });
  assert.deepEqual(await checkInvite(ID, `#s=${CODE.slice(0, 26)}`), { kind: 'damaged' });
});

// ── Known answers (independent computation) ───────────────────────────────────

test('encode matches the RFC 4648 known answers', () => {
  assert.equal(encodeShareCode(ascending), CODE);
  assert.equal(encodeShareCode(ones), 'pn1-77777777777777777777777774');
  assert.equal(encodeShareCode(zeros), 'pn1-aaaaaaaaaaaaaaaaaaaaaaaaaa');
});

test('roomIdFor matches the known answers', async () => {
  assert.equal(await roomIdFor(ascending), ID);
  assert.equal(await roomIdFor(ones), 'hscpdct5ozuv');
  assert.equal(await roomIdFor(zeros), '76gt2bckudos');
});

test('a real cross-platform invite: the iOS-created iPad Crew Test (10-20 field)', async () => {
  // Minted on the iPad; nord derived the same id from it. The browser must too.
  assert.deepEqual(await checkInvite('llmvnq6uyfad', '#s=pn1-op3gcd47fhu2zn5dg5ezvi6h5q'), {
    kind: 'secret', roomId: 'llmvnq6uyfad', shareCode: 'pn1-op3gcd47fhu2zn5dg5ezvi6h5q',
  });
});

// ── Feature ──────────────────────────────────────────────────────────────────

test('no fragment is a legacy invite', async () => {
  assert.deepEqual(await checkInvite('cosmic-dragon-42', ''), { kind: 'legacy', roomId: 'cosmic-dragon-42' });
});

test('decode tolerates what a paste does and round-trips', async () => {
  const { roomId, shareCode } = await mintCrew();
  assert.equal(roomId.length, 12);
  assert.match(roomId, /^[a-z2-7]{12}$/);
  assert.deepEqual(decodeShareCode(`  ${shareCode.toUpperCase()}\n`), decodeShareCode(shareCode));
  assert.deepEqual(await checkInvite(roomId, `#s=${shareCode}`), { kind: 'secret', roomId, shareCode });
});

test('mintCrew is not degenerate', async () => {
  const codes = new Set(await Promise.all(Array.from({ length: 64 }, async () => (await mintCrew()).shareCode)));
  assert.equal(codes.size, 64);
});
