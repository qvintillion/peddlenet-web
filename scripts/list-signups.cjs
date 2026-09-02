#!/usr/bin/env node
/**
 * Print the beta sign-up list.
 *
 *   node scripts/list-signups.cjs                    # table, newest first
 *   node scripts/list-signups.cjs --csv              # csv, for a mail merge
 *   node scripts/list-signups.cjs --emails           # bare addresses, one per line
 *   node scripts/list-signups.cjs --remove <email>   # honour a removal request
 *
 * ⭐ WHY A SCRIPT AND NOT JUST THE CONSOLE. `firestore.rules` is deny-all, so no browser client
 * can read this collection — that is deliberate: a rule that let a visitor add their address
 * would also let anyone enumerate every address already on the list. Reading therefore requires
 * the Admin SDK (which bypasses rules) or the Firebase console, which authenticates as the
 * project owner. This is the Admin SDK path.
 *
 * ⚠️ READS THE SAME `FIREBASE_SERVICE_ACCOUNT` AS THE API ROUTE, from `.env.local` — which is
 * gitignored and must stay that way. Do not copy the key anywhere else.
 *
 * ⭐ `--remove` EXISTS BECAUSE THE PRIVACY NOTICE PROMISES IT. The notice tells people they can
 * ask to be taken off the list; without a command that is a manual console hunt, and a promise
 * that is awkward to keep is a promise that quietly is not. The deletion is REAL and permanent —
 * there is no soft-delete flag, because keeping a record of someone who asked to be forgotten is
 * the thing they asked you not to do.
 */
const fs = require('fs');
const path = require('path');

const ENV = path.join(__dirname, '..', '.env.local');

function credentials() {
  if (!fs.existsSync(ENV)) {
    console.error(`No .env.local at ${ENV} — cannot authenticate.`);
    process.exit(1);
  }
  const line = fs
    .readFileSync(ENV, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('FIREBASE_SERVICE_ACCOUNT='));
  if (!line) {
    console.error('FIREBASE_SERVICE_ACCOUNT is not set in .env.local');
    process.exit(1);
  }
  let raw = line.split('=').slice(1).join('=').trim();
  if (raw.startsWith("'") || raw.startsWith('"')) raw = raw.slice(1, -1);
  const sa = JSON.parse(raw);
  // The PEM is stored with literal \n two-character sequences in every env-var host; cert()
  // fails with "Invalid PEM formatted message" without this. Same normalisation as the route.
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, '\n');
  return sa;
}

(async () => {
  const { initializeApp, cert } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  initializeApp({ credential: cert(credentials()) });
  const db = getFirestore();

  // ── Removal ────────────────────────────────────────────────────────────────
  if (process.argv[2] === '--remove') {
    // Normalised the SAME way the route stores it (trim + lowercase), or a request typed with
    // different capitalisation silently matches nothing and the person stays on the list
    // believing they were removed.
    const target = (process.argv[3] || '').trim().toLowerCase();
    if (!target) {
      console.error('Usage: node scripts/list-signups.cjs --remove <email>');
      process.exit(1);
    }
    const ref = db.collection('betaSignups').doc(target);
    const doc = await ref.get();
    if (!doc.exists) {
      // Not an error worth a non-zero exit in the usual case — "already gone" is the outcome
      // the requester wanted. Say which address was checked so a typo is visible.
      console.log(`\nNot on the list: ${target}\nNothing to remove.\n`);
      process.exit(0);
    }
    const joined = doc.data().createdAt?.toDate?.().toISOString().replace('T', ' ').slice(0, 16) ?? '—';
    // Confirm before a permanent delete, unless --yes is passed for scripted use.
    if (!process.argv.includes('--yes') && process.stdin.isTTY) {
      const answer = await new Promise((resolve) => {
        process.stdout.write(`\nRemove ${target} (joined ${joined})? This cannot be undone. [y/N] `);
        process.stdin.setEncoding('utf8');
        process.stdin.once('data', (d) => resolve(d.trim().toLowerCase()));
      });
      if (answer !== 'y' && answer !== 'yes') {
        console.log('Cancelled — nothing was removed.\n');
        process.exit(0);
      }
    }
    await ref.delete();
    console.log(`\nRemoved ${target} (had joined ${joined}).\n`);
    process.exit(0);
  }

  const snap = await db
    .collection('betaSignups')
    .orderBy('createdAt', 'desc')
    .get();

  const rows = snap.docs.map((d) => {
    const x = d.data();
    return {
      email: d.id,
      joined: x.createdAt?.toDate?.().toISOString().replace('T', ' ').slice(0, 16) ?? '',
      source: x.source ?? '',
      purpose: x.purpose ?? '',
    };
  });

  const mode = process.argv[2];
  if (mode === '--emails') {
    rows.forEach((r) => console.log(r.email));
  } else if (mode === '--csv') {
    console.log('email,joined,source,purpose');
    rows.forEach((r) => console.log(`${r.email},${r.joined},${r.source},${r.purpose}`));
  } else {
    console.log(`\n${rows.length} beta sign-up${rows.length === 1 ? '' : 's'}\n`);
    const w = Math.max(5, ...rows.map((r) => r.email.length));
    rows.forEach((r) => console.log(`  ${r.joined}   ${r.email.padEnd(w)}   ${r.source}`));
    console.log('');
  }
  process.exit(0);
})().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
