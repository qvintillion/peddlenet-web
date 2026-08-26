import Link from 'next/link';

export const metadata = {
  title: 'PeddleNet — the festival mesh that works with no signal',
  description:
    'PeddleNet carries messages phone-to-phone over Bluetooth. No signal, no wifi, no accounts, no servers — your crew stays reachable when the network does not.',
};

/**
 * The public landing page (08-26).
 *
 * ⚠️ THIS ROUTE USED TO BE THE WEB CHAT APP. It now lives at `/app`, moved with `git mv` so the
 * file is byte-identical. `/chat/[roomId]` is UNTOUCHED — those URLs are already live inside QR
 * codes, shared invites and the Android App Links verification, so breaking them would strand
 * every invite ever sent.
 *
 * ⭐ Content is deliberately about the ONE thing that is true and unusual: it works with no
 * signal. No screenshots, no fake testimonials, no download buttons for stores it is not on yet.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F4F1EA]">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 sm:pt-28">
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Your crew stays reachable
          <br />
          <span className="bg-gradient-to-r from-[#F45D9E] via-[#A55CFF] to-[#4FE0C0] bg-clip-text text-transparent">
            when the network doesn&apos;t.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#B9B4AC]">
          No towers. No wifi. No accounts.
          <br />
          Just the phones already around you.
        </p>

        <p className="mt-8 text-sm text-[#7C7770]">
          Bluetooth mesh. Nothing to sign up for.
        </p>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="border-t border-[#1C1C22]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                t: 'Everyone is the network',
                d: 'Each phone hands the message to the next. You are never talking to a tower — you are talking through the crowd.',
              },
              {
                t: 'A message can wait',
                d: 'Nobody in range? It sits in someone\u2019s pocket until a path opens. Sometimes that path is a stranger walking the long way round.',
              },
              {
                t: 'A pull, not a pin',
                d: 'The compass points at your crew and admits when it is guessing. A wide arc is the truth; a confident arrow would be a lie.',
              },
            ].map((c) => (
              <div key={c.t}>
                <h3 className="text-lg font-semibold text-[#4FE0C0]">{c.t}</h3>
                <p className="mt-3 leading-relaxed text-[#B9B4AC]">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Privacy ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">Built to know as little as possible</h2>
        <ul className="mt-8 space-y-4 text-[#B9B4AC]">
          <li>
            <strong className="text-[#F4F1EA]">You are a name you chose.</strong> Nothing to
            register, nothing to log into, nothing that follows you home.
          </li>
          <li>
            <strong className="text-[#F4F1EA]">There is no server to read it.</strong> On the mesh
            a message goes phone to phone. It never passes through us.
          </li>
          <li>
            <strong className="text-[#F4F1EA]">Your location stays where you are.</strong> The
            distance is worked out on your own phone, and only your crew ever sees it.
          </li>
        </ul>
        <p className="mt-8 text-sm text-[#7C7770]">
          The full detail is in the{' '}
          <Link href="/privacy" className="text-[#4FE0C0] underline underline-offset-4">
            Privacy Notice
          </Link>
          {' '}and the{' '}
          <Link href="/terms" className="text-[#4FE0C0] underline underline-offset-4">
            Beta Terms of Service
          </Link>
          . PeddleNet is currently a community beta, and it is 18+.
        </p>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1C1C22]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-10 text-sm text-[#7C7770]">
          <span className="font-semibold text-[#F4F1EA]">PeddleNet</span>
          <Link href="/app" className="hover:text-[#4FE0C0]">Open the app</Link>
          <Link href="/terms" className="hover:text-[#4FE0C0]">Beta Terms of Service</Link>
          <Link href="/privacy" className="hover:text-[#4FE0C0]">Privacy Notice</Link>
        </div>
      </footer>
    </main>
  );
}
