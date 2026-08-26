import Link from 'next/link';

/**
 * Renders one of the REAL legal documents from `Pitch/legal stuff/Community Test - Agreements`,
 * extracted verbatim into `src/content/*.json`.
 *
 * ⭐⭐⭐ THE SOURCE OF TRUTH IS THE .docx, NOT THIS PAGE. These are counsel-reviewed templates that
 * a participant click-accepts before first use; a web page that paraphrases them would create a
 * second, diverging version of a document people have legally agreed to. So the text is rendered
 * verbatim and never re-worded here.
 *
 * 🟥 UNFILLED [bracketed] FIELDS ARE MADE VISIBLE, NOT HIDDEN. The source README is explicit:
 * "BEFORE ANYONE SIGNS: fill every [bracketed] field (jurisdiction, entity, server region,
 * liability cap, date) and have counsel confirm." Silently publishing a placeholder as if it were
 * settled terms is the failure mode this highlight exists to prevent — a reader must be able to
 * see that a clause is incomplete, and so must we.
 */
export function LegalDoc({
  paragraphs,
  otherHref,
  otherLabel,
}: {
  paragraphs: string[];
  otherHref: string;
  otherLabel: string;
}) {
  const [title, subtitle, ...body] = paragraphs;

  return (
    <main className="min-h-screen bg-[#0B0B0F] text-[#F4F1EA]">
      <article className="mx-auto max-w-3xl px-6 py-16 leading-relaxed">
        <Link href="/" className="text-sm text-[#4FE0C0] hover:underline">← PeddleNet</Link>
        <h1 className="mt-6 text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-[#7C7770]">{subtitle}</p>

        <div className="mt-10 space-y-4">
          {body.map((p, i) => {
            // A short line that opens with "N." is a section heading in these documents.
            const isHeading = /^\d+\.\s/.test(p) && p.length < 80;
            if (isHeading) {
              return (
                <h2 key={i} className="pt-6 text-xl font-semibold text-[#4FE0C0]">
                  {p}
                </h2>
              );
            }
            return (
              <p key={i} className="text-[#B9B4AC]">
                {highlightPlaceholders(p)}
              </p>
            );
          })}
        </div>

        <footer className="mt-16 border-t border-[#1C1C22] pt-6 text-sm text-[#7C7770]">
          <Link href="/" className="hover:text-[#4FE0C0]">PeddleNet</Link>
          <span className="mx-3">·</span>
          <Link href={otherHref} className="hover:text-[#4FE0C0]">{otherLabel}</Link>
        </footer>
      </article>
    </main>
  );
}

/** Wraps `[like this]` so an unfilled field is impossible to mistake for settled wording. */
function highlightPlaceholders(text: string) {
  const parts = text.split(/(\[[^\]]{2,60}\])/g);
  return parts.map((part, i) =>
    /^\[[^\]]{2,60}\]$/.test(part) ? (
      <mark
        key={i}
        title="This field is not filled in yet"
        className="rounded bg-[#3A2A12] px-1 text-[#F0C070]"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
