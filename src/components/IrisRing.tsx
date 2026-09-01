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
 *
 * ⭐ THE SHINING NODES ARE NOT ON THE DEVICE — they illustrate the hero's own claim, that the
 * crowd IS the network. They shine in turn (staggered delays on the shared clock), never in
 * unison: a crowd pulsing as one reads as a loading spinner.
 * 🟥 A NEEDLE WAS TRIED HERE AND REJECTED — a line from the core to the ring reads as a CLOCK
 * HAND, whatever it is coloured. Do not re-add one; direction, if it is ever wanted, belongs in
 * an arc ON the ring, not a radius through the middle.
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
        {/* ⭐ THE CROWD INSIDE THE IRIS — the hero says "the crowd is the network", and an empty
            ring left that unillustrated.

            ⚠️ POSITIONS AND BRIGHTNESS ARE DELIBERATELY IRREGULAR. Three earlier passes each read
            as an instrument rather than a crowd: even spacing at one radius looked like a dial,
            points ON the ring looked like tick marks, and a uniform fill looked like six copies
            of one dot. These are scattered across the middle band (r 26–74, clear of the r=10
            core and well inside the ring at 93) with per-node size, colour and peak brightness —
            no two alike, because a crowd is not a pattern.

            Each node scales about ITSELF via `transform-box:fill-box` in globals.css — that
            property does NOT inherit, so it sits on the circles, not on this <g>. Fills come from
            the same three brand stops the ring's gradient uses.

            `--pl-peak` is each node's own brightest point; the keyframes multiply it rather than
            animating to a fixed opacity, so the variation survives the pulse instead of every
            node converging on the same value at the top of the beat. */}
        <g>
          <circle className="pl-iris-peer pl-iris-q1" cx="173.0" cy="130.2" r="3.5" fill="#4fe0c0" style={{ ['--pl-peak' as string]: '.87' }} />
          <circle className="pl-iris-peer pl-iris-q2" cx="138.3" cy="57.3" r="3.4" fill="#8b5cff" style={{ ['--pl-peak' as string]: '.49' }} />
          <circle className="pl-iris-peer pl-iris-q3" cx="122.5" cy="146.1" r="3.0" fill="#ff5db1" style={{ ['--pl-peak' as string]: '.82' }} />
          <circle className="pl-iris-peer pl-iris-q4" cx="137.2" cy="191.8" r="3.2" fill="#4fe0c0" style={{ ['--pl-peak' as string]: '.98' }} />
          <circle className="pl-iris-peer pl-iris-q5" cx="105.6" cy="85.2" r="2.2" fill="#8b5cff" style={{ ['--pl-peak' as string]: '.49' }} />
          <circle className="pl-iris-peer pl-iris-q6" cx="68.2" cy="98.8" r="2.9" fill="#ff5db1" style={{ ['--pl-peak' as string]: '.59' }} />
          <circle className="pl-iris-peer pl-iris-q7" cx="70.0" cy="149.4" r="3.3" fill="#8b5cff" style={{ ['--pl-peak' as string]: '.60' }} />
        </g>

        <circle className="pl-iris-node" cx="120" cy="120" r="10" fill="url(#pl-iris-core)" />
      </svg>
    </div>
  );
}
