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
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/beta-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
          className="min-w-0 flex-1 rounded-full border border-[#1e1e28] bg-[#0d0d12] px-5 py-[13px] text-sm text-[#f4f1ea] placeholder-[#6e6a64] outline-none transition focus:border-[#4fe0c0]"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="rounded-full border border-[#4fe0c0] bg-[#4fe0c0] px-6 py-[13px] text-sm font-bold text-[#08080b] transition hover:opacity-90 disabled:opacity-60"
        >
          {state === 'sending' ? 'Sending…' : 'Join the field test'}
        </button>
        <a
          href="#how"
          className="rounded-full border border-[#1e1e28] px-6 py-[13px] text-sm font-bold text-[#f4f1ea] no-underline transition hover:border-[#4fe0c0]"
        >
          How it works
        </a>
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
