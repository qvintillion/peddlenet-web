'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { NetworkMark } from '@/components/NetworkMark';
import { appLink, checkInvite, rememberSecret, type InviteCheck } from '@/lib/room-secret';
import { installLinks, webChatEnabled } from '@/lib/install-links';

/**
 * The smart link (ADR-0009 Stage 1a, user 10-20). Every invite the apps share (Share crew, the
 * https form) lands here: `peddlenet.app/chat/<id>?roomName=<n>#s=<code>`.
 *
 *  - app installed → "Open in PeddleNet" hands the SAME invite to the app's `peddlenet://` scheme;
 *  - not installed → TestFlight / the Android tester invite, then back here to open it;
 *  - the code is shown for pasting into the app's Join field, the path that always works.
 *
 * 🔑 The secret is read from `location.hash` IN THE BROWSER and never sent anywhere: the fragment is
 * not part of the request, and nothing here fetches. A damaged invite (secret does not derive the
 * id, or was truncated by a chat app) is REFUSED with a plain message, same rule as both apps.
 */

type Props = { roomId: string; onContinueInBrowser: () => void };

type Resolved = { check: InviteCheck; name: string | null };

export function InviteLanding({ roomId, onContinueInBrowser }: Props) {
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  useEffect(() => {
    let live = true;
    const resolve = () => {
      const name = new URLSearchParams(window.location.search).get('roomName')?.trim() || null;
      checkInvite(roomId, window.location.hash)
        .then((check) => {
          if (!live) return;
          if (check.kind === 'secret') rememberSecret(check.roomId, check.shareCode);
          setResolved({ check, name });
        })
        .catch(() => live && setResolved({ check: { kind: 'damaged' }, name }));
    };
    resolve();
    // ⚠️ A second invite to the SAME crew opened in this tab changes only the hash: no remount, and
    // `roomId` is unchanged, so without this the first invite's verdict would stick (seen 10-20 in
    // the preview: a valid invite showed "damaged" after a damaged one with the same path).
    window.addEventListener('hashchange', resolve);
    return () => {
      live = false;
      window.removeEventListener('hashchange', resolve);
    };
  }, [roomId]);

  if (!resolved) return <Shell><p className="text-[#6e6a64]">Opening invite…</p></Shell>;
  if (resolved.check.kind === 'damaged') return <Damaged />;

  const { check, name } = resolved;
  const shareCode = check.kind === 'secret' ? check.shareCode : null;
  const code = shareCode ?? check.roomId;
  const appUrl = appLink(roomId, name, shareCode);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be denied (insecure context, permissions); the code stays selectable.
    }
  };

  return (
    <Shell>
      <p className="m-0 text-xs uppercase tracking-[.14em] text-[#6e6a64]">You&apos;re invited to</p>
      <h1 className="m-0 mt-2 break-words text-[clamp(30px,8vw,52px)] font-bold leading-[1.05] tracking-[-.02em]">
        {name ?? 'a PeddleNet crew'}
      </h1>
      <p className="mt-4 max-w-[46ch] text-[#a7a29b]">
        PeddleNet is chat that works without signal, phone to phone over Bluetooth.
      </p>

      <a href={appUrl} className="mt-8 block rounded-full bg-gradient-to-r from-[#ff5db1] via-[#8b5cff] to-[#4fe0c0] px-6 py-4 text-center font-bold text-[#08080b]">
        Open in PeddleNet
      </a>

      <InstallButtons />

      <div className="mt-8 border-t border-[#1e1e28] pt-6">
        <p className="m-0 text-sm text-[#a7a29b]">
          Just installed it? Come back and tap <span className="text-[#f4f1ea]">Open in PeddleNet</span>, or paste this
          code into <span className="text-[#f4f1ea]">Join</span> in the app:
        </p>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#1e1e28] bg-[#0f0f14] px-4 py-3">
          <code className="min-w-0 flex-1 select-all break-all text-[15px] text-[#4fe0c0]">{code}</code>
          <button type="button" onClick={copy} className="flex-none rounded-lg border border-[#1e1e28] px-3 py-1.5 text-xs text-[#a7a29b] hover:text-[#f4f1ea]">
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {webChatEnabled && (
        <button type="button" onClick={onContinueInBrowser} className="mt-6 text-sm text-[#a7a29b] underline underline-offset-4 hover:text-[#f4f1ea]">
          Continue in browser instead
        </button>
      )}
    </Shell>
  );
}

function InstallButtons() {
  const { ios, android } = installLinks;
  if (!ios && !android) return null;
  return (
    <div className="mt-6">
      <p className="m-0 mb-3 text-xs uppercase tracking-[.14em] text-[#6e6a64]">Don&apos;t have it yet?</p>
      <div className="flex flex-wrap gap-3">
        {ios && <InstallLink href={ios} label="Get it on iPhone" />}
        {android && <InstallLink href={android} label="Get it on Android" />}
      </div>
    </div>
  );
}

function InstallLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="flex-1 basis-[180px] rounded-full border border-[#2a2a36] px-5 py-3 text-center text-sm font-bold text-[#f4f1ea] hover:border-[#4fe0c0]">
      {label}
    </a>
  );
}

function Damaged() {
  return (
    <Shell>
      <h1 className="m-0 text-[clamp(26px,6vw,40px)] font-bold tracking-[-.02em]">This invite link is damaged</h1>
      <p className="mt-4 max-w-[46ch] text-[#a7a29b]">
        Part of it is missing or doesn&apos;t match, often because a chat app cut it short. Ask whoever
        invited you to share it again, or to show you the crew&apos;s QR code.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#08080b] font-[family-name:var(--font-jetbrains-mono)] leading-relaxed text-[#f4f1ea] antialiased">
      <div className="mx-auto max-w-[560px] px-6 pb-16 pt-14">
        {/* The home page's header pairing (mark + wordmark). Not its optical offset, which is
            tuned to the hero's iris ring and has no counterpart here. */}
        <Link href="/" aria-label="PeddleNet home" className="mb-10 inline-flex items-center gap-2.5 text-[13px] font-bold tracking-[.04em] text-[#f4f1ea] no-underline opacity-90 transition-opacity hover:opacity-100">
          <NetworkMark className="block h-auto w-[26px] flex-none" />
          <span>PeddleNet</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
