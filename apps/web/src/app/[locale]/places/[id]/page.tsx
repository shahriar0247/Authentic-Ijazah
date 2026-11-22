import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { api, fmtAH } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PlacePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const d = await api<any>(`/places/${id}`);
  const p = d.place;
  const kinds = ["born", "resided", "died", "taught", "met", "moved"] as const;
  return (
    <div className="space-y-5">
      <header className="card p-6">
        <h1 className="text-2xl font-bold">{locale === "en" ? (p.name_en ?? p.name_ar) : (p.name_ar ?? p.name_en)}</h1>
        <p className="mt-1 text-stone-500">
          {p.name_en && p.name_ar ? `${locale === "en" ? p.name_ar : p.name_en} · ` : ""}
          {p.kind} · {p.lat?.toFixed(2)}, {p.lng?.toFixed(2)}
          {p.region ? ` · ${p.region}` : ""}
        </p>
      </header>
      {kinds.map((k) => {
        const rows = (d.scholars ?? []).filter((s: any) => s.kind === k);
        if (!rows.length) return null;
        return (
          <section key={k} className="card p-5">
            <h2 className="section-title mb-3">{k} ({rows.length})</h2>
            <ul className="grid gap-1 sm:grid-cols-2">
              {rows.map((s: any, i: number) => (
                <li key={i}>
                  <Link href={`/${locale}/persons/${s.id}`} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-stone-100">
                    <span className="truncate font-medium text-madinah">{locale === "en" ? (s.display_name_en ?? s.display_name_ar) : (s.display_name_ar ?? s.display_name_en)}</span>
                    <span className="ms-auto shrink-0 text-xs text-stone-500">
                      {fmtAH(s.ah_min, s.ah_max)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
