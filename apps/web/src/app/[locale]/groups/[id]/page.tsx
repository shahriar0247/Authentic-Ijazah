import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";
import { GraphCanvas } from "@/components/GraphCanvas";
import { gradeEn, nameEn, workEn } from "@/lib/en";

export const dynamic = "force-dynamic";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const d = await api<any>(`/groups/${id}`);
  const g = d.group;

  return (
    <div className="space-y-6">
      <header className="card p-6">
        <h1 className="font-quran text-2xl font-bold">{g.title_ar}</h1>
        {locale === "en" && g.matn_en && (
          <p className="mt-3 text-lg leading-relaxed">{g.matn_en}</p>
        )}
        {g.taraf_nass && <p className="hadith-text mt-3 text-lg">{g.taraf_nass}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {g.is_qudsi && <span className="badge badge-sahabi">{t("group.qudsi")}</span>}
          <span className="badge badge-muted">{g.sahaba_qty ?? g.sahabah_qty} {t("group.sahaba")}</span>
          <span className="badge badge-muted">{g.repeat_qty} {t("group.narrations")}</span>
          <span className="badge badge-muted">{d.dag?.totalRoutes ?? 0} {t("hadith.routes")}</span>
        </div>
      </header>

      {!!d.dag?.nodes?.length && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="section-title">{t("nav.network")}</h2>
            {d.dag.madar?.map((m: any) => {
              const n = d.dag.nodes.find((x: any) => x.id === m.person_id);
              return (
                <span key={m.person_id} className="badge badge-thiqa">
                  {t("graph.madar")}: {(locale === "en" ? nameEn(n) : n?.display_name_ar) || m.person_id}
                  {" · "}{Math.round(m.coverage * 100)}% {t("graph.coverage")}
                </span>
              );
            })}
          </div>
          <GraphCanvas nodes={d.dag.nodes} edges={d.dag.edges} locale={locale} direction="UP" height={640} />
          <p className="text-xs text-stone-400">{t("graph.legend")}</p>
        </section>
      )}

      <section className="card p-5">
        <h2 className="section-title mb-3">{t("search.hadiths")} ({d.hadiths.length})</h2>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {d.hadiths.map((h: any) => (
            <li key={h.id}>
              <Link href={`/${locale}/hadith/${h.id}`} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-stone-100">
                <span className="text-stone-500">{locale === "en" ? workEn(h.work) : h.work}</span>
                <span>#{h.hadith_no}</span>
                {h.hukm && <span className="badge badge-muted ms-auto">{locale === "en" ? gradeEn(h.hukm) : h.hukm}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
