/**
 * THE PEDDLENET NETWORK MARK — the LEAF MARK (variant N3, 2026-08-27).
 *
 * ⭐ Geometry lifted VERBATIM from the shipped Android drawable
 * (`peddlenet-app/app/src/main/res/drawable/ic_peddlenet_logo.xml`) on the same 100x100 grid, so
 * this file is a fifth copy of one drawing. iOS `NetworkMarkShape` and the launcher-icon
 * generator are the others. ⚠️ A change here is a change in all of them — verify, do not assume.
 *
 * ## Shape
 *   the SMALL LEAF  pink #FF5DB1, LEFT  — exactly HALF the big leaf's height
 *   the BIG LEAF    violet #8B5CFF, RIGHT
 *   two TAILS       short message-bubble tails, one per leaf, drawn UNDER the blades
 *   the NODE        iris #4FE0C0, a circle BELOW, clear of both tail tips
 *
 * 🟥 DRAW ORDER IS LOAD-BEARING: the TAILS are emitted FIRST and the blades paint over them, so
 * each tail reads as hanging under its leaf. Reordering re-creates the "L above the leaf" shape
 * the user rejected on 08-27.
 *
 * 🟥 Each leaf's outer end is cut on a line TANGENT to the node circle — that is what makes the
 * shapes read as one object. Change the node's radius or centre and the cuts must be RECOMPUTED,
 * not nudged by eye. The tail must also never reach the node (clearance 5.50 units; at r 18 it
 * overlaps).
 *
 * ⚠️ FLAT FILLS, NOT THE PRISMATIC RAMP. The app is explicit that the ramp is reserved for "the
 * lights" — the animated iris on this page gets it, the mark does not.
 */
export function NetworkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-hidden="true" className={className}>
      <path d="M33.76,26.11 L38.77,26.11 L38.77,35.79 L36.26,41.70 L33.76,35.79 Z" fill="#FF5DB1" />
      <path d="M49.28,15.36 L54.30,15.36 L54.30,34.71 L51.79,46.54 L49.28,34.71 Z" fill="#8B5CFF" />
      <path d="M11.81,36.86 L7.00,26.11 L38.06,26.11 L38.06,36.86 Z" fill="#FF5DB1" />
      <path d="M50.00,15.36 L93.00,15.36 L80.83,36.86 L50.00,36.86 Z" fill="#8B5CFF" />
      <circle cx="44.03" cy="67.92" r="16.72" fill="#4FE0C0" />
    </svg>
  );
}
