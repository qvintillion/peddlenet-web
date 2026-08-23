'use client';

import React, { useEffect, useState } from 'react';

/**
 * 🟥 08-23 (user, field): an invite shared over WhatsApp took their friends to this web page
 * instead of opening the installed app — "it always brought them to peddlenet.app even though
 * they had the alpha".
 *
 * ## Why the App Link alone cannot fix it
 *
 * The Android association is **correct and verified** (checked on a real device 08-23: live
 * `assetlinks.json` returns 200 `application/json` with no redirect, both the debug and release
 * signing fingerprints are present, the device reports `peddlenet.app: approved`, and a real
 * `VIEW` intent opens `MainActivity` with no chooser). Signing was not the problem.
 *
 * The problem is **where the link is opened**. WhatsApp — like Instagram, Messenger and Slack —
 * renders links in its own in-app WebView, and *a WebView never consults the App Links table*.
 * The app is never offered, so the page just renders. Nothing on the app side can change that,
 * because the app is never asked. The page is the only place left that can offer a way out.
 *
 * A second, independent cause: App Links verification in this form is **Android 12+**, so older
 * phones fall back to a browser regardless of how correct the association is.
 *
 * ## Why a button and not an auto-redirect
 *
 * 1. In-app WebViews commonly block scheme navigations that lack a user gesture, so an automatic
 *    hop is exactly the case most likely to be swallowed.
 * 2. Some people deliberately want the web client; punishing them to rescue the others is a bad
 *    trade when a single tap serves both.
 *
 * ## Platform strategy
 *
 * - **Android** → `intent://` with `S.browser_fallback_url`. Chrome resolves it to the app when
 *   installed and cleanly falls back to this same page when not, so one control serves both.
 * - **iOS** → `peddlenet://`, which the app registered on 08-23. iOS has **no store listing yet**
 *   (no TestFlight, no App Store), so there is deliberately no "download" offer here: a dead
 *   store link is worse than none. When a listing exists, add it as the iOS fallback.
 * - **Desktop / anything else** → render nothing. There is no app to open.
 *
 * ⚠️ The full query string is preserved, so `?roomName=` survives the hop — otherwise the
 * handoff lands in "Cosmic Dragon 42" instead of "Sunset Crew", which is the same 08-23 bug
 * one layer down.
 */

const ANDROID_PACKAGE = 'com.peddlenet.festivalchat';

type Platform = 'android' | 'ios' | 'other';

/** Read once on the client — `navigator` does not exist during SSR. */
function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return 'android';
  // iPadOS 13+ reports a desktop Safari UA; the touch-point check is the standard tell.
  const iOSLike = /iPad|iPhone|iPod/.test(ua)
    || (/Macintosh/.test(ua) && typeof document !== 'undefined' && navigator.maxTouchPoints > 1);
  return iOSLike ? 'ios' : 'other';
}

/**
 * Best-effort "are we inside someone else's browser". Used only to WORD the prompt more
 * urgently — never to gate the button, because UA sniffing for WebViews is inherently
 * incomplete and a false negative must not cost anyone the escape hatch.
 */
function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /\bFBAN|\bFBAV|Instagram|Line\/|Twitter|WhatsApp|Snapchat|Slack/i.test(ua);
}

export function OpenInAppBanner({ roomId, roomName }: { roomId: string; roomName?: string }) {
  // Rendered only after mount: the first client render must match the server HTML or hydration
  // fails (#418, the same constraint the room-name read on this page is under).
  const [platform, setPlatform] = useState<Platform>('other');
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    setPlatform(detectPlatform());
    setInApp(isInAppBrowser());
  }, []);

  if (platform === 'other' || !roomId) return null;

  // Preserve the whole query string — `?roomName=` has to survive, and anything added later
  // travels for free rather than needing this to be updated.
  const query = typeof window !== 'undefined' ? window.location.search : '';
  const webUrl = typeof window !== 'undefined' ? window.location.href : '';
  const schemeUrl = `peddlenet://chat/${encodeURIComponent(roomId)}${query}`;
  // `intent://` needs the scheme's OWN path, not the https one, plus the package so Chrome
  // resolves it without a chooser. The fallback returns here when the app is absent.
  const intentUrl =
    `intent://chat/${encodeURIComponent(roomId)}${query}` +
    `#Intent;scheme=peddlenet;package=${ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;

  const href = platform === 'android' ? intentUrl : schemeUrl;
  const label = roomName ? `Open "${roomName}" in PeddleNet` : 'Open in PeddleNet';

  return (
    <div className="mb-3 rounded-lg border border-purple-500/40 bg-purple-500/10 p-3">
      <a
        href={href}
        className="block w-full rounded-md bg-purple-600 px-4 py-2 text-center font-medium text-white hover:bg-purple-700"
      >
        {label}
      </a>
      <p className="mt-2 text-center text-xs text-gray-400">
        {inApp
          // The honest instruction for the case that actually broke: some in-app browsers refuse
          // scheme navigation outright, and then only "open in the real browser" works.
          ? "Opened from another app — if the button doesn't work, choose \"Open in browser\" from its menu first."
          : platform === 'ios'
            ? 'Requires the PeddleNet app. Otherwise carry on here in the browser.'
            : "Don't have it? The button brings you back here."}
      </p>
    </div>
  );
}
