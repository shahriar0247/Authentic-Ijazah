import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";
import { HadithText } from "@/components/HadithText";

export const dynamic = "force-dynamic";

export default async function HadithPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const data = await api<any>(`/hadith/${id}`);
  const h = data.hadith;
  const en = (data.translations ?? []).find((tr: any) => tr.lang === "en");
  const related = await api<any[]>(`/related/hadiths/${id}?limit=8`).catch(() => []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <article className="space-y-6">
        <div className="card p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <Link href={`/${locale}/books/${h.work_id}`} className="hover:text-madinah">
              {h.work_title}
            </Link>
            {h.author_name_ar && <span>· {h.author_name_ar}</span>}
            <span>· #{h.hadith_no}</span>
            {h.hukm && <span className="badge badge-muted">{h.hukm}</span>}
            {h.type === "qudsi" && <span className="badge badge-sahabi">قدسي</span>}
          </div>
          <HadithText text={h.text_ar} annotations={data.annotations ?? []} locale={locale} />
          <p className="mt-3 text-xs text-stone-400">{t("hadith.clickNarrator")}</p>
        </div>

        {en && (
          <div className="card p-6" dir="ltr">
            <h3 className="section-title mb-2">{t("hadith.translation")}</h3>
            <p className="text-[15px] leading-relaxed text-stone-700">{en.text}</p>
            {en.narrator && <p className="mt-2 text-xs text-stone-500">{en.narrator}</p>}
          </div>
        )}

        {!!data.routes?.length && (
          <div className="card p-6">
            <h3 className="section-title mb-3">
              {t("hadith.routes")} ({data.routes.length})
            </h3>
            <RoutesList routes={data.routes} id={id} locale={locale} />
          </div>
        )}

        {!!related.length && (
          <div className="card p-6">
            <h3 className="section-title mb-3">{t("hadith.related")}</h3>
            <ul className="space-y-2">
              {related.map((r: any) => (
                <li key={r.id} className="rounded-lg bg-stone-50/70 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-stone-500">
                    <Link href={`/${locale}/books/${r.work_id ?? ""}`} className="hover:text-madinah">{r.work}</Link>
                    <span className="badge badge-muted">{Math.round((1 - r.distance) * 100)}%</span>
                  </div>
                  <Link href={`/${locale}/hadith/${r.id}`} className="text-sm leading-relaxed text-stone-700 hover:text-madinah">
                    {r.snippet}…
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>

      <aside className="space-y-4">
        {data.group && (
          <Link href={`/${locale}/groups/${data.group.id}`} className="card block p-4 hover:shadow-md">
            <h3 className="section-title">{t("hadith.group")}</h3>
            <p className="mt-1 text-sm font-medium">{data.group.title_ar}</p>
            <p className="mt-1 text-xs text-stone-500">
              {data.group.sahabah_qty ?? data.group.sahaba_qty} صحابي ·{" "}
              {data.group.repeat_qty} رواية
            </p>
            <span className="mt-2 inline-block text-xs text-madinah">
              {t("graph.madar")} →
            </span>
          </Link>
        )}
        <div className="card p-4 text-sm">
          <h3 className="section-title mb-2">meta</h3>
          <dl className="space-y-1 text-stone-600">
            <div className="flex justify-between"><dt>source</dt><dd>{h.source}</dd></div>
            <div className="flex justify-between"><dt>chapter</dt><dd>{h.chapter_no ?? "—"}</dd></div>
            <div className="flex justify-between"><dt>emb.</dt><dd>{h.meaning_group_id ? "✓" : "—"}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

async function RoutesList({ routes, id, locale }: { routes: any[]; id: string; locale: string }) {
  const data = await api<any>(`/hadith/${id}/chains`);
  return (
    <ol className="space-y-3">
      {data.routes.map((r: any, i: number) => (
        <li key={r.id} className="rounded-lg bg-stone-50/70 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-stone-500">
            <span>#{i + 1}</span>
            <span>len {r.length}</span>
            {r.hukm && <span className="badge badge-muted">{r.hukm}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1" dir="rtl">
            {r.mentions.map((m: any, j: number) => (
              <span key={j} className="flex items-center gap-1">
                <Link
                  href={`/${locale}/persons/${m.person_id ?? ""}`}
                  className="rounded-md bg-white px-2 py-0.5 text-sm shadow-sm ring-1 ring-stone-200 hover:ring-madinah"
                  title={`${m.rank_ar ?? ""} ${m.tabaqa ?? ""}`}
                >
                  {m.display_name_ar ?? m.mention_text}
                </Link>
                {j < r.mentions.length - 1 && <span className="text-stone-400">◂</span>}
              </span>
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
