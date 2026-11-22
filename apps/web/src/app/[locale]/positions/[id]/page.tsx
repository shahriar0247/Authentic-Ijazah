import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

const STANCE_BADGE: Record<string, string> = {
  affirms: "badge-thiqa",
  rejects: "badge-daif",
  qualified: "badge-critic",
  disputed: "badge-daif",
  unknown: "badge-muted",
};

export default async function PositionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const d = await api<any>(`/positions/${id}`);
  const p = d.position;
  const evByAttr = new Map<string, any[]>();
  for (const e of d.evidence ?? []) {
    const list = evByAttr.get(e.attribution_id) ?? [];
    list.push(e);
    evByAttr.set(e.attribution_id, list);
  }

  return (
    <div className="space-y-5">
      <header className="card p-6">
        <span className="badge badge-muted">{p.domain}</span>
        <h1 className="mt-2 font-quran text-2xl font-bold leading-relaxed">
          {p.proposition_ar}
        </h1>
        {p.proposition_en && (
          <p className="mt-2 text-stone-600" dir="ltr">{p.proposition_en}</p>
        )}
      </header>
      <section className="card p-5">
        <h2 className="section-title mb-3">{t("positions.stance")}</h2>
        <ul className="space-y-3">
          {d.attributions.map((a: any) => (
            <li key={a.id} className="rounded-lg bg-stone-50/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/${locale}/persons/${a.person_id}`}
                  className="font-medium text-madinah hover:underline">
                  {a.display_name_ar ?? a.display_name_en}
                </Link>
                {a.tabaqa && <span className="badge badge-muted">{a.tabaqa}</span>}
                <span className={`badge ${STANCE_BADGE[a.stance] ?? "badge-muted"}`}>
                  {a.stance}
                </span>
                <span className="badge badge-muted">{a.status}</span>
              </div>
              {a.qualifier_ar && (
                <p className="mt-1 text-sm text-stone-600">{a.qualifier_ar}</p>
              )}
              {(evByAttr.get(a.id) ?? []).map((e: any) => (
                <blockquote key={e.id} className="mt-2 border-s-2 border-madinah/30 ps-3">
                  <p className="text-sm leading-relaxed text-stone-700">{e.excerpt_ar}</p>
                  {e.excerpt_en && (
                    <p className="mt-1 text-sm text-stone-600" dir="ltr">{e.excerpt_en}</p>
                  )}
                  {e.source_locator && (
                    <cite className="mt-1 block text-xs not-italic text-stone-500">
                      {e.source_locator}
                    </cite>
                  )}
                </blockquote>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
