import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { api, rankBadge } from "@/lib/api";
import { SearchBox } from "@/components/SearchBox";
import { gradeEn, nameEn, workEn } from "@/lib/en";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const res = q.trim()
    ? await api<{
        hadiths?: any[]; persons?: any[]; topics?: any[]; groups?: any[];
      }>(`/search?q=${encodeURIComponent(q)}&limit=25`)
    : {};

  return (
    <div className="space-y-8">
      <SearchBox locale={locale} placeholder={t("home.searchPlaceholder")} initial={q} />

      {!!res.persons?.length && (
        <section>
          <h2 className="section-title mb-3">{t("search.persons")}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {res.persons.map((p) => (
              <Link key={p.id} href={`/${locale}/persons/${p.id}`} className="card flex items-center gap-3 p-3 hover:shadow-md">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{locale === "en" ? nameEn(p) : (p.display_name_ar ?? p.display_name_en)}</div>
                  <div className="text-xs text-stone-500">
                    {p.tabaqa} · {p.death_ah_min ? `${p.death_ah_min} ${t("common.ah")}` : ""}
                  </div>
                </div>
                {p.rank_ar && <span className={`badge ${rankBadge(p.rank_norm)}`}>{locale === "en" ? gradeEn(p.rank_ar) : p.rank_ar}</span>}
                {p.is_companion && <span className="badge badge-sahabi">{t("person.companion")}</span>}
                {p.is_critic && <span className="badge badge-critic">{t("person.critic")}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!res.hadiths?.length && (
        <section>
          <h2 className="section-title mb-3">{t("search.hadiths")}</h2>
          <div className="space-y-2">
            {res.hadiths.map((h) => (
              <Link key={h.id} href={`/${locale}/hadith/${h.id}`} className="card block p-4 hover:shadow-md">
                <div className="flex items-baseline gap-3">
                  <span className="shrink-0 text-xs text-stone-500">{locale === "en" ? workEn(h.work) : h.work} #{h.hadith_no}</span>
                  {h.hukm && <span className="badge badge-muted shrink-0">{locale === "en" ? gradeEn(h.hukm) : h.hukm}</span>}
                </div>
                <p className="hadith-text mt-1 line-clamp-2 text-[15px]">{h.snippet}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!res.groups?.length && (
        <section>
          <h2 className="section-title mb-3">{t("hadith.group")}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {res.groups.map((g) => (
              <Link key={g.id} href={`/${locale}/groups/${g.id}`} className="card p-3 hover:shadow-md">
                <p className="hadith-text line-clamp-2 text-[15px]">{g.title_ar}</p>
                <div className="mt-1 flex gap-2 text-xs text-stone-500">
                  {g.is_qudsi && <span className="badge badge-sahabi">{t("group.qudsi")}</span>}
                  <span>{g.sahaba_qty} {t("group.sahaba")}</span>
                  <span>{g.repeat_qty} {t("group.narrations")}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!res.topics?.length && (
        <section>
          <h2 className="section-title mb-3">{t("search.topics")}</h2>
          <div className="flex flex-wrap gap-2">
            {res.topics.map((tp) => (
              <Link key={tp.id} href={`/${locale}/topics/${tp.id}`} className="badge badge-muted hover:bg-stone-200">
                {locale === "en" ? (tp.title_en ?? tp.title_ar) : (tp.title_ar ?? tp.title_en)}
              </Link>
            ))}
          </div>
        </section>
      )}

      {q.trim() && !res.persons?.length && !res.hadiths?.length && !res.topics?.length && (
        <p className="text-center text-stone-500">{t("search.empty")}</p>
      )}
    </div>
  );
}
