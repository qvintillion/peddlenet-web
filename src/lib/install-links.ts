/**
 * Where a visitor without the app gets it, and whether the browser chat is offered.
 *
 * The defaults below are the live public links; an env var (Vercel → Project → Settings →
 * Environment Variables) overrides one per deployment. An empty link hides its button rather
 * than rendering a dead one.
 *
 * ⚠️ These are PUBLIC tester links (a TestFlight public link; Play open testing to come), and
 * public distribution is public use. No patent had been filed as of 09-14. Using them was the
 * user's call (10-20); keep that in view before adding any wider channel.
 */
export const installLinks = {
  /** TestFlight public link (user, 10-20). */
  ios: process.env.NEXT_PUBLIC_TESTFLIGHT_URL || 'https://testflight.apple.com/join/whKHYPj3',
  /**
   * EMPTY on purpose (10-20): the user is applying for Play production access to get an open
   * testing link. Set NEXT_PUBLIC_ANDROID_INVITE_URL, or fill the default, once it exists.
   */
  android: process.env.NEXT_PUBLIC_ANDROID_INVITE_URL || '',
};

/**
 * The browser chat (`ChatRoom`) talks to the WebSocket relay, which is torn down until the
 * WebSocket re-integration phase. Until then the landing offers open/install only (user, 10-20:
 * no dead end). Flip with NEXT_PUBLIC_WEB_CHAT_ENABLED=true once the server is durably back.
 */
export const webChatEnabled = process.env.NEXT_PUBLIC_WEB_CHAT_ENABLED === 'true';
