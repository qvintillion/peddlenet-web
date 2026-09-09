import Link from 'next/link';

export const metadata = {
  title: 'Child Safety Standards — PeddleNet',
  description:
    "PeddleNet's published standards against child sexual abuse and exploitation (CSAE), and how to report a concern.",
};

/**
 * Published, externally hosted child safety standards page — required by Google Play's
 * child safety standards policy (and the equivalent App Store review requirement) for any
 * app with messaging/user-generated content, regardless of store category.
 *
 * Unlike /privacy and /terms, this is NOT rendered through <LegalDoc> from a counsel-reviewed
 * .docx — it's an operational policy disclosure, not a click-accepted agreement, so it's
 * authored directly as a page rather than routed through the verbatim-.docx pipeline.
 *
 * Keep this in sync with:
 * - Terms of Service §1 (18+ eligibility) — Pitch/legal stuff/Community Test - Agreements
 * - Privacy Notice §9 ("we do not knowingly process data from children")
 * - An in-app "Report a Safety Concern" path was drafted 09-09 (peddlenet-app,
 *   SettingsScreen.kt, branch feature/child-safety-reporting-0909) but is NOT yet merged or
 *   shipped — do not reference it here as an existing feature until it lands. If/when it
 *   ships, add a line back pointing users to Settings, same as the drafted app copy does.
 */
export default function SafetyStandardsPage() {
  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F4F1EA]">
      <article className="mx-auto max-w-3xl px-6 py-16 leading-relaxed">
        <Link href="/" className="text-sm text-[#4FE0C0] hover:underline">← PeddleNet</Link>
        <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Child Safety Standards</h1>
        <p className="mt-2 text-sm text-[#7C7770]">
          PeddleNet — standards against child sexual abuse and exploitation (CSAE)
        </p>

        <div className="mt-10 space-y-4">
          <h2 className="pt-2 text-xl font-semibold text-[#4FE0C0]">Our commitment</h2>
          <p className="text-[#B9B4AC]">
            PeddleNet has zero tolerance for child sexual abuse material (CSAM) and child
            sexual abuse and exploitation (CSAE) of any kind. This applies to every part of the
            Service — public rooms, private crews, and any content relayed across the mesh.
          </p>

          <h2 className="pt-6 text-xl font-semibold text-[#4FE0C0]">Age requirement</h2>
          <p className="text-[#B9B4AC]">
            PeddleNet is for users 18 and older. This is stated in our{' '}
            <Link href="/terms" className="text-[#4FE0C0] hover:underline">
              Beta Terms of Service
            </Link>{' '}
            (§1, Eligibility), and we do not knowingly collect data from children, as stated in
            our{' '}
            <Link href="/privacy" className="text-[#4FE0C0] hover:underline">
              Privacy Notice
            </Link>{' '}
            (§9, Children).
          </p>

          <h2 className="pt-6 text-xl font-semibold text-[#4FE0C0]">How to report a concern</h2>
          <p className="text-[#B9B4AC]">
            If you encounter content or behavior on PeddleNet that you believe involves child
            sexual abuse or exploitation, report it immediately:
          </p>
          <p className="text-[#B9B4AC]">
            Email{' '}
            <a href="mailto:th3p3ddl3r@gmail.com" className="text-[#4FE0C0] hover:underline">
              th3p3ddl3r@gmail.com
            </a>{' '}
            with as much detail as you can safely provide — the room or crew involved, when it
            happened, and any display names you saw.
          </p>
          <p className="text-[#B9B4AC]">
            We respond to every report personally. PeddleNet is beta software with no
            server-side backbone — we cannot remotely delete content already on other
            participants&apos; devices — but we will act on every report: removing offending
            accounts and devices from any infrastructure we do control (room registries, the
            beta invitation list), and cooperating with law enforcement.
          </p>

          <h2 className="pt-6 text-xl font-semibold text-[#4FE0C0]">
            Reporting to authorities
          </h2>
          <p className="text-[#B9B4AC]">
            Suspected CSAM or CSAE should also be reported directly to the relevant authorities.
            In the United States, report to the{' '}
            <a
              href="https://report.cybertip.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4FE0C0] hover:underline"
            >
              National Center for Missing &amp; Exploited Children (NCMEC) CyberTipline
            </a>
            . Outside the US, contact your national child protection authority or local law
            enforcement. We comply with applicable child safety laws and will report credible
            instances of CSAM/CSAE to the relevant authorities in addition to acting on the
            report ourselves.
          </p>

          <h2 className="pt-6 text-xl font-semibold text-[#4FE0C0]">Designated contact</h2>
          <p className="text-[#B9B4AC]">
            Bill Costello / Qvintessential Design —{' '}
            <a href="mailto:th3p3ddl3r@gmail.com" className="text-[#4FE0C0] hover:underline">
              th3p3ddl3r@gmail.com
            </a>{' '}
            is the designated point of contact for PeddleNet&apos;s child safety and CSAM
            prevention practices, and is able to respond to compliance inquiries.
          </p>

          <p className="pt-2 text-sm text-[#7C7770]">Version date: 9 September 2026</p>
        </div>

        <footer className="mt-16 border-t border-[#1C1C22] pt-6 text-sm text-[#7C7770]">
          <Link href="/" className="hover:text-[#4FE0C0]">PeddleNet</Link>
          <span className="mx-3">·</span>
          <Link href="/privacy" className="hover:text-[#4FE0C0]">Privacy Notice</Link>
          <span className="mx-3">·</span>
          <Link href="/terms" className="hover:text-[#4FE0C0]">Beta Terms of Service</Link>
        </footer>
      </article>
    </main>
  );
}
