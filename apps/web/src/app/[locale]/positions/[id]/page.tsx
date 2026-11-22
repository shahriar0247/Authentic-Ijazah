import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { api, rankBadge } from "@/lib/api";

export const dynamic = "force-dynamic";

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
  return (
    <div className="space-y-5">
      <header className="card p-6">
        <div className="flex items-center gap-2 text-xs">
          <span className="badge badge-muted">{p.domain}</span>
          <span className="badge badge-muted">{p.status}</span>
        </div>
        <h1 className="mt-2 font-quran text-2xl font-bold">{p.title_ar ?? p.title_en}</h1>
        {p.summary_ar && <p className="mt-3 text-stone-700">{p.summary_ar}</p>}
      </header>
      <section className="card p-5">
        <h2 className="section-title mb-3">{t("positions.stance")}s</h2>
        <ul className="space-y-3">
          {d.attributions.map((a: any) => (
            <li key={a.id} className="rounded-lg bg-stone-50/70 p-3">
              <div className="flex items-center gap-2">
                <Link href={`/${locale}/persons/${a.person_id}`} className="font-medium text-madinah hover:underline">
                  {a.display_name_ar ?? a.display_name_en}
                </Link>
                <span className={`badge ${rankBadge(a.stance)}`}>{a.stance}</span>
                <span className="badge badge-muted">{a.relation}</span>
              </div>
              {a.note_ar && <p className="mt-1 text-sm text-stone-700">{a.note_ar}</p>}
            </li>
          ))}
        </ul>
      </section>
      {!!d.evidence?.length && (
        <section className="card p-5">
          <h2 className="section-title mb-3">{t("positions.evidence")}</h2>
          <ul className="space-y-2 text-sm">
            {d.evidence.map((e: any) => (
              <li key={e.id} className="flex items-start gap-2">
                <span className="badge badge-muted shrink-0">{e.ref_type}</span>
                <span>{e.citation ?? e.note}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
