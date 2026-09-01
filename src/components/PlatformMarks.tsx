/**
 * The two platform glyphs in the hero's capability line.
 *
 * ⚠️ THESE STATE PLATFORM SUPPORT, NOT STORE AVAILABILITY. PeddleNet is not on either store yet
 * — the banner at the top of the page says so — and a store badge ("Download on the App Store",
 * the Google Play badge) would promise a link that does not exist. Apple and Google both reserve
 * those badges for shipping apps, so the bare glyphs are used here instead: they read as "runs on
 * iPhone and Android", which is what is true today.
 *
 * ⭐ `currentColor` — NOT the brand colours. The glyphs inherit the muted tagline grey, which
 * keeps them subordinate to the CTA and avoids restyling either mark in a brand palette. Both
 * companies' guidelines allow a monochrome rendering; neither allows recolouring.
 *
 * `aria-hidden` on the paths with a real text label alongside: a screen reader hears
 * "iOS & Android" from the visually-hidden span, never "path" or a mangled glyph name.
 */

export function AppleMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export function AndroidMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 576 512" className={className} fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M420.6 301.9a24 24 0 1 1 24-24 24 24 0 0 1 -24 24m-265.1 0a24 24 0 1 1 24-24 24 24 0 0 1 -24 24m273.7-144.5 47.9-83a10 10 0 1 0 -17.3-10h0l-48.5 84.1a301.3 301.3 0 0 0 -246.6 0L116.2 64.5a10 10 0 1 0 -17.3 10h0l47.9 83C64.5 202.2 8.2 285.6 0 384H576c-8.2-98.4-64.5-181.8-146.9-226.6" />
    </svg>
  );
}
