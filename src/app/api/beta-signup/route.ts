import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Beta sign-up: one email address, stored server-side.
 *
 * ⭐ WHY THE SERVER AND NOT THE BROWSER. The Admin SDK bypasses Firestore rules, so
 * `firestore.rules` can stay closed (`allow read, write: if false`). If the browser wrote this
 * collection directly, the same permission that lets a visitor add their address would let anyone
 * enumerate every address already on the list — an email harvest with no bug required.
 *
 * ⚠️ THIS IS PERSONAL DATA UNDER A GDPR NOTICE that names a real controller. The Privacy Notice
 * says the beta needs no email to USE, which stays true: this address is for the invitation only.
 * Purpose limitation is therefore enforced here, not just promised in copy — the document records
 * WHAT was consented to and WHEN, so a later "we never said we'd email you" is answerable.
 */

const COLLECTION = 'betaSignups';

/**
 * Deliberately permissive: the goal is to reject typos and obvious junk, not to police valid
 * addresses. Over-strict regexes reject real mail (plus-addressing, new TLDs, unicode domains)
 * and the only cost of a bad address here is one bounced invite.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 practical maximum

function adminApp(): App | null {
  if (getApps().length > 0) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error('beta-signup: FIREBASE_SERVICE_ACCOUNT is not set');
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { private_key?: string };
    // ⚠️ THE PEM MUST HAVE REAL NEWLINES. A service-account JSON stores the key with literal
    // `\n` two-character sequences, and every way of getting it into an env var (dotenv,
    // Vercel's dashboard, `firebase functions:config`) preserves them as literal backslash-n.
    // `cert()` then fails with "Invalid PEM formatted message" — which is what the field showed,
    // and is the single most common Firebase-Admin deployment error. Normalising here means the
    // value can be pasted from the JSON verbatim, in any host, without a per-host escaping ritual.
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    return initializeApp({ credential: cert(parsed as Parameters<typeof cert>[0]) });
  } catch (err) {
    // A malformed credential must not take the page down — see the 503 below. Log the REASON:
    // a bare `catch {}` here cost several minutes of guessing at env-var quoting when the
    // failure was reportable all along.
    console.error('beta-signup: credential rejected —', (err as Error).message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  if (typeof email !== 'string') {
    return NextResponse.json({ error: 'An email address is required.' }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();
  if (normalized.length > MAX_EMAIL_LENGTH || !EMAIL.test(normalized)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  const app = adminApp();
  if (!app) {
    // ⚠️ Never pretend to have stored it. A cheerful "you're on the list" on a misconfigured
    // deploy loses the sign-up silently, which is the one failure the reader cannot detect.
    console.error('beta-signup: FIREBASE_SERVICE_ACCOUNT missing or unparseable');
    return NextResponse.json(
      { error: 'Sign-up is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  try {
    // The address is the document id, so a second submission overwrites rather than duplicating —
    // idempotent by construction, and it means the collection can never hold the same person
    // twice however many times they tap the button.
    await getFirestore(app)
      .collection(COLLECTION)
      .doc(normalized)
      .set(
        {
          email: normalized,
          createdAt: FieldValue.serverTimestamp(),
          // What they actually agreed to, recorded at the moment of consent. Purpose limitation
          // is only meaningful if the record says what the purpose WAS.
          purpose: 'beta-invite-and-feedback',
          consentedTo: ['beta-terms', 'privacy-notice', 'age-18-plus'],
          source: 'landing-hero',
        },
        { merge: true },
      );
  } catch (err) {
    console.error('beta-signup: write failed', err);
    return NextResponse.json(
      { error: 'Sign-up is temporarily unavailable. Please try again later.' },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
