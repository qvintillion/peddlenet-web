#!/usr/bin/env node
/**
 * Print the beta sign-up list.
 *
 *   node scripts/list-signups.cjs           # table, newest first
 *   node scripts/list-signups.cjs --csv     # csv, for a mail merge
 *   node scripts/list-signups.cjs --emails  # bare addresses, one per line
 *
 * ⭐ WHY A SCRIPT AND NOT JUST THE CONSOLE. `firestore.rules` is deny-all, so no browser client
 * can read this collection — that is deliberate: a rule that let a visitor add their address
 * would also let anyone enumerate every address already on the list. Reading therefore requires
 * the Admin SDK (which bypasses rules) or the Firebase console, which authenticates as the
 * project owner. This is the Admin SDK path.
 *
 * ⚠️ READS THE SAME `FIREBASE_SERVICE_ACCOUNT` AS THE API ROUTE, from `.env.local` — which is
 * gitignored and must stay that way. Do not copy the key anywhere else.
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

  const snap = await getFirestore()
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
