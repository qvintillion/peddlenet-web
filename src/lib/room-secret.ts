/**
 * The joinable secret, ADR-0009 Stage 1a: the web twin of peddlenet-core's `RoomSecret.kt`.
 *
 *   roomSecret := 128 random bits        (possession IS membership; never sent to a server)
 *   roomId     := base32(SHA-256("pn-room-id-v1" ‖ roomSecret))[:12]
 *   share code := "pn1-" + 26 lowercase RFC 4648 base32 chars, exactly one spelling per secret
 *
 * 🟥 MUST derive the same id as Android and iOS from the same secret, or a shared invite opens a
 * DIFFERENT crew in the browser. Pinned by `room-secret.test.ts` to the same known-answer
 * vectors as core's `RoomSecretTest`, which were computed independently in Python.
 *
 * 🔑 The secret travels in the URL FRAGMENT (`#s=`). Browsers never send the fragment to a
 * server, so the secret never reaches Vercel or Cloud Run logs. Only code running in this page
 * ever sees it.
 */

export const SHARE_CODE_PREFIX = 'pn1-';
const SECRET_BYTES = 16;
const ROOM_ID_LENGTH = 12;
const CODE_LENGTH = SHARE_CODE_PREFIX.length + 26;
const ROOM_ID_DOMAIN = 'pn-room-id-v1';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function base32(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(buffer >> bits) & 0x1f];
    }
    buffer &= (1 << bits) - 1; // keep only the bits not yet emitted (no 32-bit overflow)
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 0x1f];
  return out;
}

/** Exactly 16 bytes from 26 chars, or null. Rejects non-zero pad bits: one secret, one spelling. */
function unbase32(chars: string): Uint8Array | null {
  const out = new Uint8Array(SECRET_BYTES);
  let buffer = 0;
  let bits = 0;
  let n = 0;
  for (const c of chars) {
    const v = ALPHABET.indexOf(c);
    if (v < 0) return null;
    buffer = (buffer << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out[n++] = (buffer >> bits) & 0xff;
    }
    buffer &= (1 << bits) - 1;
  }
  return n === SECRET_BYTES && buffer === 0 ? out : null;
}

export function encodeShareCode(secret: Uint8Array): string {
  if (secret.length !== SECRET_BYTES) throw new Error(`room secret must be ${SECRET_BYTES} bytes`);
  return SHARE_CODE_PREFIX + base32(secret);
}

/** Tolerant of case and whitespace (what a paste does); strict about everything else. */
export function decodeShareCode(text: string): Uint8Array | null {
  const s = text.replace(/\s+/g, '').toLowerCase();
  if (s.length !== CODE_LENGTH || !s.startsWith(SHARE_CODE_PREFIX)) return null;
  return unbase32(s.slice(SHARE_CODE_PREFIX.length));
}

export async function roomIdFor(secret: Uint8Array): Promise<string> {
  if (secret.length !== SECRET_BYTES) throw new Error(`room secret must be ${SECRET_BYTES} bytes`);
  const domain = new TextEncoder().encode(ROOM_ID_DOMAIN);
  const input = new Uint8Array(domain.length + secret.length);
  input.set(domain);
  input.set(secret, domain.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  return base32(digest).slice(0, ROOM_ID_LENGTH);
}

/** A new crew: a fresh secret from the CSPRNG and the id derived from it. */
export async function mintCrew(): Promise<{ roomId: string; shareCode: string }> {
  const secret = crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
  return { roomId: await roomIdFor(secret), shareCode: encodeShareCode(secret) };
}

/**
 * The invite in the apps' `peddlenet://` scheme, carrying the same `#s=`. A space is `%20` and a
 * real `+` is `%2B`: the form BOTH app parsers decode identically (the 10-20 `+`-for-space bug
 * ran on exactly this seam, so the invite format lives here, beside [checkInvite], and nowhere else).
 */
export function appLink(roomId: string, name: string | null, shareCode: string | null): string {
  const query = name ? `?roomName=${encodeURIComponent(name)}` : '';
  const fragment = shareCode ? `#s=${shareCode}` : '';
  return `peddlenet://chat/${encodeURIComponent(roomId)}${query}${fragment}`;
}

export type InviteCheck =
  | { kind: 'secret'; roomId: string; shareCode: string }
  | { kind: 'legacy'; roomId: string }
  | { kind: 'damaged' };

/**
 * Reads an invite's `#s=` fragment against its path id (Android `RoomInviteParser.fromUrl`).
 *
 * 🟥 A secret that does not check out is REFUSED, not ignored: a fragment that fails to decode,
 * or derives a different id than the path, is `damaged`. Falling back to the path id would join a
 * crew with no key (truncated by a chat app) or one the secret does not belong to (tampered).
 * No `#s=` at all is a legacy invite, which opens its path id as before.
 */
export async function checkInvite(pathRoomId: string, hash: string): Promise<InviteCheck> {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const s = params.get('s');
  if (s === null) return { kind: 'legacy', roomId: pathRoomId };
  const secret = decodeShareCode(s);
  if (!secret) return { kind: 'damaged' };
  const roomId = await roomIdFor(secret);
  if (roomId !== pathRoomId) return { kind: 'damaged' };
  return { kind: 'secret', roomId, shareCode: encodeShareCode(secret) };
}

// ── This browser's copy (for the web chat's own share/QR once it returns) ─────

const storageKey = (roomId: string) => `room:${roomId}:secret`;

/** First secret wins, like both apps. Storage can be blocked (private mode): never throws. */
export function rememberSecret(roomId: string, shareCode: string): void {
  try {
    if (!localStorage.getItem(storageKey(roomId))) localStorage.setItem(storageKey(roomId), shareCode);
  } catch {
    // The page still works; the browser chat just won't know this crew's secret.
  }
}

export function storedSecret(roomId: string): string | null {
  try {
    return localStorage.getItem(storageKey(roomId));
  } catch {
    return null;
  }
}
