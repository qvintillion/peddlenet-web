'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * The hero's one action: an email address, in place.
 *
 * ⭐ REPLACES A LINK OUT TO A GOOGLE FORM. One field beats a redirect — the reader never leaves
 * the page and never sees a second brand.
 *
 * ⚠️ NO MARKETING CHECKBOX, DELIBERATELY. Consent under GDPR must be specific and unbundled, so
 * a single "I accept the Terms" box would not cover marketing anyway — it would only look like
 * it did. What the address is for is stated AT the field instead, and the scope is genuinely
 * transactional: the invite, and a thank-you asking for feedback. If a newsletter is ever added,
 * it needs its own separately-ticked box; this copy would then be a lie rather than a promise.
 *
 * The 18+ line and the two legal links stay under the field, where they are read before the tap
 * rather than after.
 */
export function BetaSignupForm() {
  const [email, setEmail] = useState('');
  /**
   * 🍎🤖 09-13 — REQUIRED, and deliberately un-preselected. The two builds ship on different
   * tracks (Play testing track vs TestFlight, which is capped and needs the address registered
   * BEFORE an invite exists), so this decides which invite someone gets. A default would file
   * whoever did not notice onto the wrong track, silently — the failure nobody detects. `null`
   * until chosen, and the submit button stays disabled, so the required-ness is visible rather
   * than only enforced on submit.
   */
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    // Belt to the disabled button's braces: a form can still be submitted by keyboard.
    if (!platform) {
      setError('Please choose Android or iPhone so we send you the right build.');
      return;
    }
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, platform }),
      });
      if (!res.ok) {
        // ⚠️ Surface the server's own message: a 503 means "not stored", and telling the reader
        // it worked would lose the sign-up silently — the one failure they cannot detect.
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Something went wrong. Please try again.');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError('Could not reach the server. Please try again.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className="mt-[34px]">
        <p className="m-0 text-[17px] font-bold text-[#4fe0c0]">You&rsquo;re on the list.</p>
        <p className="mt-2 text-sm text-[#a7a29b]">
          We&rsquo;ll email <span className="text-[#f4f1ea]">{email}</span> when the beta opens.
          Nothing else — and you can ask us to remove you any time at{' '}
          <a href="mailto:th3p3ddl3r@gmail.com" className="text-[#a7a29b] hover:text-[#4fe0c0]">
            th3p3ddl3r@gmail.com
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[34px]">
      {/* ⚠️ THE INPUT TAKES ITS OWN ROW UNTIL `sm`. As a `flex-1` item in a wrapping row it does
          not wrap — it shrinks: at 375px it was squeezed to 105px beside the 210px button, too
          narrow to even show the "you@example.com" placeholder. `basis-full` forces the break on
          phones; from `sm` up it returns to one line with the buttons. */}
      <form onSubmit={submit} className="flex flex-wrap gap-3">
        <label htmlFor="beta-email" className="sr-only">
          Email address
        </label>
        <input
          id="beta-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          aria-describedby="beta-email-note"
          aria-invalid={error ? true : undefined}
          className="min-w-0 basis-full rounded-full border border-[#1e1e28] bg-[#0d0d12] px-5 py-[13px] text-sm text-[#f4f1ea] placeholder-[#6e6a64] outline-none transition focus:border-[#4fe0c0] sm:min-w-[260px] sm:flex-1 sm:basis-auto"
        />
        {/* 🍎🤖 09-13 — WHICH BUILD. A RADIO GROUP, not two checkboxes: the choice is exclusive,
            and radios are what keyboard and screen-reader users already know how to operate
            (arrow keys move within the group, the legend is announced with each option).
            `basis-full` keeps it on its own row so it never competes with the email field for
            width on a phone — the same wrapping lesson the input records above. */}
        <fieldset className="basis-full border-0 p-0 m-0 sm:basis-auto">
          {/* The legend is the accessible name for the group and must stay in the DOM. On sm+
              the question sits beside the email field where a stacked label would push the row
              out of alignment, so it is visually hidden there and the two options — "Android"
              and "iPhone" — carry the meaning, which they do unaided. */}
          <legend className="mb-2 text-xs text-[#a7a29b] sm:sr-only">
            Which phone will you test on? <span className="text-[#ff5db1]">*</span>
          </legend>
          {/* 🟥 The visually-hidden legend above takes the REQUIREDNESS with it on sm+, so the
              choice looked optional on desktop until submit was attempted. This restores the one
              bit that cannot be inferred from "Android | iPhone" — that an answer is needed —
              beside the options where the eye already is. Hidden on phones, where the full
              question is visible. */}
          <p className="sr-only mb-2 text-xs text-[#a7a29b] sm:not-sr-only sm:mb-2">
            Which phone? <span className="text-[#ff5db1]">*</span>
          </p>
          <div className="flex gap-3">
            {([
              { value: 'android', label: 'Android' },
              { value: 'ios', label: 'iPhone' },
            ] as const).map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border px-5 py-[11px] text-sm font-bold transition ${
                  platform === opt.value
                    ? 'border-[#4fe0c0] bg-[#4fe0c0]/10 text-[#4fe0c0]'
                    : 'border-[#1e1e28] text-[#f4f1ea] hover:border-[#4fe0c0]'
                }`}
              >
                <input
                  type="radio"
                  name="platform"
                  value={opt.value}
                  checked={platform === opt.value}
                  onChange={() => setPlatform(opt.value)}
                  required
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>
        {/* 🎯 09-13 (user): the two CTAs are CENTRED, on their own row. They used to be trailing
            items in the wrapping row, so on desktop they sat hard left with ~286px of empty
            space beside them — fine at 375px only because they happened to fill the line.
            09-13 (2nd pass, user): LEFT-aligned, with breathing room above — the platform
            question and the CTAs were touching, so the required choice read as part of the
            button cluster rather than as its own step. "How it works" is now a TERTIARY link in
            transport green, not an outlined button: two pill buttons of equal size competed for
            the tap, and only one of them is the action this form exists for. */}
        <div className="mt-3 flex basis-full flex-col items-stretch gap-3 sm:mt-4 sm:flex-row sm:items-center sm:gap-2">
          <button
            type="submit"
            disabled={state === 'sending' || !platform}
            className="w-full whitespace-nowrap rounded-full border border-[#4fe0c0] bg-[#4fe0c0] px-6 py-[13px] text-sm font-bold text-[#08080b] transition hover:opacity-90 disabled:opacity-60 sm:w-auto sm:min-w-[210px]"
          >
            {state === 'sending' ? 'Sending…' : 'Join the field test'}
          </button>
          <a
            href="#how"
            className="w-full whitespace-nowrap px-6 py-2 text-center text-sm font-bold text-[#4fe0c0] no-underline transition hover:opacity-80 sm:w-auto sm:text-left"
          >
            How it works
          </a>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-xs text-[#ff5db1]">
          {error}
        </p>
      )}

      {/* Purpose limitation, stated where it is read: before the tap, not in a notice nobody
          opens. This sentence and the route's `purpose` field must say the same thing. */}
      <p id="beta-email-note" className="mt-4 text-xs text-[#6e6a64]">
        We&rsquo;ll only use this to send your beta invite and ask how it went. Community beta ·
        18+ · by joining you accept the{' '}
        <Link href="/terms" className="text-[#a7a29b] hover:text-[#4fe0c0]">
          Beta&nbsp;Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="text-[#a7a29b] hover:text-[#4fe0c0]">
          Privacy&nbsp;Notice
        </Link>
      </p>
    </div>
  );
}
