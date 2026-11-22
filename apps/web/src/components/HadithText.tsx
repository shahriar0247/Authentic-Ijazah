import Link from "next/link";

export interface Annotation {
  kind: string;
  start: number;
  end: number;
  person_id: number | null;
  person_name: string | null;
}

/** Render hadith text with clickable narrator spans + styled Quran quotes. */
export function HadithText({
  text,
  annotations,
  locale,
}: {
  text: string;
  annotations: Annotation[];
  locale: string;
}) {
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cur = 0;
  let key = 0;
  for (const a of sorted) {
    if (a.start < cur || a.end > text.length) continue; // skip overlaps
    if (a.start > cur) parts.push(<span key={key++}>{text.slice(cur, a.start)}</span>);
    const seg = text.slice(a.start, a.end);
    if (a.kind === "narrator" && a.person_id) {
      parts.push(
        <Link
          key={key++}
          href={`/${locale}/persons/${a.person_id}`}
          title={a.person_name ?? ""}
          className="narrator-link"
        >
          {seg}
        </Link>,
      );
    } else if (a.kind === "quran") {
      parts.push(<span key={key++} className="quran-quote">{seg} ﴿﴾</span>);
    } else {
      parts.push(<span key={key++}>{seg}</span>);
    }
    cur = a.end;
  }
  if (cur < text.length) parts.push(<span key={key++}>{text.slice(cur)}</span>);
  return <p className="hadith-text text-justify">{parts}</p>;
}
