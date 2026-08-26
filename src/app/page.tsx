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
        <p className="mb-4 text-sm font-medium tracking-widest text-[#4FE0C0] uppercase">
          Off-grid mesh messaging
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Your crew stays reachable
          <br />
          <span className="bg-gradient-to-r from-[#F45D9E] via-[#A55CFF] to-[#4FE0C0] bg-clip-text text-transparent">
            when the network doesn&apos;t.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#B9B4AC]">
          At a festival the signal dies exactly when you need it. PeddleNet passes
          messages <strong className="text-[#F4F1EA]">phone to phone over Bluetooth</strong> —
          so a message finds your friend even when nothing else can.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/app"
            className="rounded-full bg-[#4FE0C0] px-7 py-3 font-semibold text-[#0B0B0F] transition hover:opacity-90"
          >
            Open PeddleNet
          </Link>
          <a
            href="#how"
            className="rounded-full border border-[#2A2A33] px-7 py-3 font-semibold text-[#F4F1EA] transition hover:border-[#4FE0C0]"
          >
            How it works
          </a>
        </div>

        <p className="mt-6 text-sm text-[#7C7770]">
          No account. No phone number. Nothing to sign up for.
        </p>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="border-t border-[#1C1C22] bg-[#0E0E13]">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                t: 'Phones relay for each other',
                d: 'Every phone running PeddleNet passes messages along. Your friend does not need to be in range of you — only of someone between you.',
              },
              {
                t: 'Messages wait to be carried',
                d: 'Out of range? A message is held and handed over the moment a path appears. Walking past someone is enough.',
              },
              {
                t: 'A compass, not a map',
                d: 'See roughly how far away your crew is and which way to walk — with the uncertainty shown honestly, never a confident wrong arrow.',
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
            <strong className="text-[#F4F1EA]">No accounts.</strong> You pick a display name on
            your own device. There is nothing to register and nothing to log in to.
          </li>
          <li>
            <strong className="text-[#F4F1EA]">Messages travel between phones.</strong> Over
            Bluetooth they do not pass through our servers, because on the mesh there are none.
          </li>
          <li>
            <strong className="text-[#F4F1EA]">Location stays on your phone.</strong> The compass
            works out distances locally. Your position is shared only with the crew you joined.
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
