/**
 * THE IRIS — the app's own signature component, ported from `PlSigils.kt` /
 * `PeddleComponents.swift`.
 *
 * ⭐ ONE 4s PERIOD DRIVES EVERYTHING. On device the ring, its halo and the core share a single
 * clock deliberately: two clocks drift and read as two separate things pulsing. Same here — every
 * keyframe is 4s, and the halo rings differ only by ANIMATION-DELAY, which is what makes the
 * bloom ripple OUTWARD instead of the whole disc dimming in unison.
 *
 * ⚠️ A ring that cannot hold still is unusable for anyone who needs motion reduced — and the
 * state is carried by COLOUR anyway, exactly as the app argues. `globals.css` stops it dead under
 * `prefers-reduced-motion: reduce`.
 *
 * ⚠️ The keyframes live in `globals.css` (`.pl-iris-*`) because they cannot be expressed as
 * Tailwind utilities.
 */
export function IrisRing() {
  return (
    <div className="mb-[34px] w-[min(190px,42vw)]" aria-hidden="true">
      <svg viewBox="0 0 240 240" className="block h-auto w-full overflow-visible">
        <defs>
          <radialGradient id="pl-iris-core">
            <stop offset="0" stopColor="#ff5db1" />
            <stop offset=".55" stopColor="#8b5cff" />
            <stop offset="1" stopColor="#4fe0c0" />
          </radialGradient>
          <linearGradient id="pl-iris-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff5db1" />
            <stop offset=".5" stopColor="#8b5cff" />
            <stop offset="1" stopColor="#4fe0c0" />
          </linearGradient>
        </defs>
        {/* the halo is the ring's wake — each lags the one inside it */}
        <g stroke="url(#pl-iris-ring)" fill="none">
          <circle className="pl-iris-halo pl-iris-h3" cx="120" cy="120" r="103" strokeWidth="11" />
          <circle className="pl-iris-halo pl-iris-h2" cx="120" cy="120" r="99" strokeWidth="8" />
          <circle className="pl-iris-halo pl-iris-h1" cx="120" cy="120" r="96" strokeWidth="5" />
        </g>
        <circle
          className="pl-iris-ring"
          cx="120"
          cy="120"
          r="93"
          fill="none"
          stroke="url(#pl-iris-ring)"
          strokeWidth="2.4"
        />
        <circle className="pl-iris-node" cx="120" cy="120" r="10" fill="url(#pl-iris-core)" />
      </svg>
    </div>
  );
}
