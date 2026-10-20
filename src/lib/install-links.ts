/**
 * Where a visitor without the app gets it, and whether the browser chat is offered.
 *
 * Set per deployment in Vercel (Project → Settings → Environment Variables). An unset link hides
 * its button rather than rendering a dead one.
 *
 * ⚠️ Invite-only links on purpose (no patent filed; public distribution counts as public use).
 * These are tester links, not store listings.
 */
export const installLinks = {
  /** The TestFlight public link (https://testflight.apple.com/join/…). */
  ios: process.env.NEXT_PUBLIC_TESTFLIGHT_URL || '',
  /** The Firebase App Distribution tester invite for the Android `testers` group. */
  android: process.env.NEXT_PUBLIC_ANDROID_INVITE_URL || '',
};

/**
 * The browser chat (`ChatRoom`) talks to the WebSocket relay, which is torn down until the
 * WebSocket re-integration phase. Until then the landing offers open/install only (user, 10-20:
 * no dead end). Flip with NEXT_PUBLIC_WEB_CHAT_ENABLED=true once the server is durably back.
 */
export const webChatEnabled = process.env.NEXT_PUBLIC_WEB_CHAT_ENABLED === 'true';
