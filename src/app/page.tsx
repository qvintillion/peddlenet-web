import Link from 'next/link';
import { NetworkMark } from '@/components/NetworkMark';
import { IrisRing } from '@/components/IrisRing';
import { AppleMark, AndroidMark } from '@/components/PlatformMarks';
import { BetaSignupForm } from '@/components/BetaSignupForm';
import { MessagePathway } from '@/components/MessagePathway';

export const metadata = {
  title: 'PeddleNet — the festival mesh that works with no signal',
  description:
    'PeddleNet carries messages phone-to-phone over Bluetooth. No signal, no wifi, no accounts, no servers — your crew stays reachable when the network does not.',
};

/**
 * The public landing page.
 *
 * ⚠️ THIS ROUTE USED TO BE THE WEB CHAT APP. It now lives at `/app`, moved with `git mv` so the
 * file is byte-identical. `/chat/[roomId]` is UNTOUCHED — those URLs are already live inside QR
 * codes, shared invites and the Android App Links verification, so breaking them would strand
 * every invite ever sent.
 *
 * ⭐ Content is deliberately about the ONE thing that is true and unusual: it works with no
 * signal. No screenshots, no fake testimonials, no download buttons for stores it is not on yet.
 *
 * ⭐ 08-27: ported from the approved mockup — the network mark, the animated iris, the CTA to the
 * field-test form, and the five-role pathway.
 *
 * ⚠️ NO PRIVACY SECTION, AND NO "Open the app" IN THE FOOTER (user, 08-27). An earlier revision
 * carried a "Built to know as little as possible" list here; it was cut deliberately, not lost in
 * a re-sync. The privacy promises live in the Notice, which the hero footnote and the footer both
 * link to. Do not restore either as a "fix".
 *
 * ⚠️ THE MARK'S ASPECT IS 1.24 — width hits the box edge first, so it is sized on WIDTH
 * (`w-[30px] h-auto`) and the height follows. Sizing on height renders it letterboxed.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#08080b] font-[family-name:var(--font-jetbrains-mono)] leading-relaxed text-[#f4f1ea] antialiased">
      <div className="border-b border-[#1e1e28] bg-[#141018] px-6 py-2.5 text-xs tracking-[.04em] text-[#f5b642]">
        Community beta · not yet on the app stores
      </div>

      <div className="mx-auto max-w-[960px] px-6">
        {/* ⭐ OPTICAL, NOT BOX, ALIGNMENT. The iris ring below is drawn at r=93 in a 240 viewBox
            with an 11-wide halo, so its leftmost ink sits ~8.96% into its box. The mark's small
            leaf starts at x=7 of 100. Matching the BOXES would leave the two shapes ~15px apart
            on screen; this offset lines up the INK instead.
            ⚠️ RECOMPUTE IF THE MARK CHANGES — 14.92px assumes the leaf begins at x=7 at 30px wide. */}
        <header className="flex justify-start pt-[26px]">
          <Link
            href="/"
            aria-label="PeddleNet home"
            className="ml-[14.92px] inline-flex items-center gap-2.5 text-[13px] font-bold tracking-[.04em] text-[#f4f1ea] no-underline opacity-90 transition-opacity hover:opacity-100 max-[640px]:ml-[calc(42vw*0.0896-2.1px)]"
          >
            <NetworkMark className="block h-auto w-[30px] flex-none" />
            <span>PeddleNet</span>
          </Link>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="pb-16 pt-[46px]">
          <IrisRing />
          <h1 className="m-0 text-[clamp(36px,6.6vw,66px)] font-bold leading-[1.04] tracking-[-.025em]">
            No signal.
            <br />
            <span className="bg-gradient-to-r from-[#ff5db1] via-[#8b5cff] to-[#4fe0c0] bg-clip-text text-transparent">
              The crowd is the network.
            </span>
          </h1>
          <p className="mt-[22px] text-[clamp(14px,2vw,17px)] text-[#a7a29b]">
            Messaging and more for festivals and off-grid events
          </p>
          {/* ⭐ THIS IS THE HOOK FOR CARD 03. The drop-off idea is what makes this more than a
              chat app, but it was only explained far down the page; naming it here plants the
              idea before the reader meets it. Plain English beats the internal vocabulary —
              the app calls these outposts and anchors, but "drop-off zones" needs no glossary,
              and card 03 still introduces "outpost" properly further down.

              The glyphs replace the words "iOS & Android": they survive a narrow screen without
              wrapping mid-phrase, and they are marks of PLATFORM SUPPORT, not store badges — the
              app is not on either store yet. `inline-flex` keeps them on the baseline with the
              text; the visually-hidden span is what a screen reader reads.

              ⚠️ THE WHOLE LINE FITS ON ONE ROW DOWN TO 320px. Verify a longer wording by BLOCK
              HEIGHT vs line-height — counting distinct child `top` values reports a false wrap,
              because the glyph span sits 1px lower than the text. */}
          <p className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs uppercase tracking-[.06em] text-[#6e6a64]">
            <span>Bluetooth</span>
            <span aria-hidden="true">&middot;</span>
            <span>Drop-off zones</span>
            <span aria-hidden="true">&middot;</span>
            <span className="inline-flex items-center gap-[7px]">
              {/* ⭐ OPTICAL, NOT BOX, SIZING — the same rule the iris ring follows above. Matching
                  the two heights makes Apple look SMALLER: its glyph fills its box top to bottom,
                  while the Android robot is a squat silhouette with headroom above the antennae.
                  The apple is set a touch taller so the pair reads as one weight. */}
              <AppleMark className="h-[14px] w-auto" />
              <AndroidMark className="h-[12px] w-auto" />
              <span className="sr-only">iOS and Android</span>
            </span>
          </p>

          {/* ⭐ 09-01: the email field REPLACED a link out to a Google Form. One field beats a
              redirect — the reader never leaves the page and never meets a second brand. The
              purpose sentence, the 18+ line and both legal links live inside the component, so
              they travel with the field rather than drifting from it. */}
          <BetaSignupForm />
        </div>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section id="how" className="scroll-mt-7 border-t border-[#1e1e28] py-[60px]">
          <h2 className="m-0 mb-2 text-[clamp(22px,3.4vw,32px)] font-bold tracking-[-.01em]">
            How it works
          </h2>
          <p className="mb-[38px] mt-0 max-w-[54ch] text-[#a7a29b]">
            Three ways a message gets there when there’s no signal.
          </p>

          <div className="grid grid-cols-[auto_1fr] gap-5 py-6 max-[640px]:grid-cols-1 max-[640px]:gap-1.5">
            <div className="whitespace-nowrap pt-[5px] text-xs tracking-[.14em] text-[#6e6a64] max-[640px]:pt-0">
              01
            </div>
            <div>
              <h3 className="m-0 mb-1.5 text-[17px] font-bold">Mesh messaging</h3>
              <p className="m-0 max-w-[58ch] text-[#a7a29b]">
                Instantly connect with the people around you — chat, and find each other with the
                compass. Every member becomes a <span className="text-[#4fe0c0]">node</span> in the
                mesh, and every node makes it stronger.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-5 border-t border-[#1e1e28] py-6 max-[640px]:grid-cols-1 max-[640px]:gap-1.5">
            <div className="whitespace-nowrap pt-[5px] text-xs tracking-[.14em] text-[#6e6a64] max-[640px]:pt-0">
              02
            </div>
            <div>
              <h3 className="m-0 mb-1.5 text-[17px] font-bold">Relay for others</h3>
              <p className="m-0 max-w-[58ch] text-[#a7a29b]">
                Too far to reach directly? With{' '}
                <span className="text-[#ff5db1]">relays</span>, messages hop devices to reach your
                crew — more relays mean more paths.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-5 border-t border-[#1e1e28] py-6 max-[640px]:grid-cols-1 max-[640px]:gap-1.5">
            <div className="whitespace-nowrap pt-[5px] text-xs tracking-[.14em] text-[#6e6a64] max-[640px]:pt-0">
              03
            </div>
            <div>
              <h3 className="m-0 mb-1.5 text-[17px] font-bold">
                <span className="text-[#f5b642]">◆</span> Drop off at an outpost
              </h3>
              <p className="m-0 max-w-[58ch] text-[#a7a29b]">
                Nobody in range at all? Leave it at an{' '}
                <span className="text-[#f5b642]">outpost</span> — a phone pinned to one spot that
                holds mail until its owner walks past. A{' '}
                <span className="text-[#8b5cff]">peddler</span> does the same on foot, carrying what
                you left in their pocket until the paths finally cross.
              </p>
            </div>
          </div>

          <MessagePathway />
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-[#1e1e28] pb-[60px] pt-[34px] text-[13px] text-[#6e6a64]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="font-semibold text-[#f4f1ea]">PeddleNet</span>
            <Link href="/terms" className="no-underline hover:text-[#4fe0c0]">
              Beta Terms of Service
            </Link>
            <Link href="/privacy" className="no-underline hover:text-[#4fe0c0]">
              Privacy Notice
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
