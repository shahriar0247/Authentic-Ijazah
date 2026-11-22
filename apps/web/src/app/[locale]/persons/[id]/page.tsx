import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { api, rankBadge, fmtAH } from "@/lib/api";
import { GraphCanvas } from "@/components/GraphCanvas";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const d = await api<any>(`/persons/${id}`);
  const p = d.person;
  const net = await api<any>(`/persons/${id}/network?limit=60`).catch(() => null);

  const teachers = (d.relationships ?? []).filter((r: any) => r.predicate === "narrated_from" && r.other_id !== p.id);
  const students = (d.relationships ?? []).filter((r: any) => r.predicate === "narrated_to");

  return (
    <div className="space-y-6">
      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-quran text-3xl font-bold">
              {p.display_name_ar ?? p.display_name_en}
            </h1>
            {p.display_name_en && p.display_name_ar && (
              <p className="mt-1 text-stone-500" dir="ltr">{p.display_name_en}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {p.is_companion && <span className="badge badge-sahabi">صحابي</span>}
              {p.is_critic && <span className="badge badge-critic">{t("search.persons")} · critic</span>}
              {p.rank_ar && <span className={`badge ${rankBadge(p.rank_norm)}`}>{p.rank_ar}</span>}
              {p.tabaqa && <span className="badge badge-muted">{p.tabaqa}</span>}
              {p.generation_ord && <span className="badge badge-muted">g{p.generation_ord}</span>}
              {p.is_stub && <span className="badge badge-muted">stub</span>}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <dt className="text-stone-500">{t("person.born")}</dt>
            <dd>{fmtAH(p.birth_ah_min, p.birth_ah_max) ?? "—"}</dd>
            <dt className="text-stone-500">{t("person.died")}</dt>
            <dd>{fmtAH(p.death_ah_min, p.death_ah_max) ?? "—"}</dd>
            <dt className="text-stone-500">{t("person.narrated")}</dt>
            <dd>{d.narratedHadithCount?.toLocaleString(locale)}</dd>
            <dt className="text-stone-500">{t("person.tabaqa")}</dt>
            <dd>{p.tabaqa ?? "—"}</dd>
          </dl>
        </div>
        {!!d.externalIds?.length && (
          <div className="mt-3 flex flex-wrap gap-2">
            {d.externalIds.map((e: any, i: number) => (
              <span key={i} className="badge badge-muted">{e.provider}:{e.external_id}</span>
            ))}
          </div>
        )}
        {p.biography && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-stone-700">{p.biography}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="section-title mb-3">{t("person.assessments")} ({d.assessments?.length ?? 0})</h2>
          <ul className="max-h-96 space-y-3 overflow-auto pe-2">
            {(d.assessments ?? []).map((a: any) => (
              <li key={a.id} className="rounded-lg bg-stone-50/70 p-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Link href={`/${locale}/persons/${a.critic_person_id ?? ""}`} className="font-medium text-madinah hover:underline">
                    {a.critic}
                  </Link>
                  {a.verdict_class && <span className={`badge ${rankBadge(a.verdict_class)}`}>{a.verdict_class}</span>}
                </div>
                <p className="text-stone-700">{a.text_ar}</p>
              </li>
            ))}
            {!d.assessments?.length && <li className="text-sm text-stone-500">—</li>}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="section-title mb-3">{t("person.teachers")} / {t("person.students")}</h2>
          <RelList rels={d.relationships ?? []} locale={locale} self={p.id} />
          {!!d.matches?.length && (
            <>
              <h3 className="section-title mb-2 mt-5">{t("person.matches")}</h3>
              <ul className="space-y-1 text-sm">
                {d.matches.map((m: any, i: number) => {
                  const other = m.person_a === p.id ? m.person_b : m.person_a;
                  const name = m.person_a === p.id ? m.b_name : m.a_name;
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <Link href={`/${locale}/persons/${other}`} className="text-madinah hover:underline">{name}</Link>
                      <span className="badge badge-muted">{m.method} · {Math.round((m.confidence ?? 0) * 100)}% · {m.status}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>

      {net && net.edges?.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-title">{t("person.network")}</h2>
          <GraphCanvas nodes={net.nodes} edges={net.edges} locale={locale} direction="RIGHT" />
        </section>
      )}
    </div>
  );
}

function RelList({ rels, locale, self }: { rels: any[]; locale: string; self: number }) {
  const groups = [
    ["teachers", rels.filter((r) => r.predicate === "narrated_from")],
    ["students", rels.filter((r) => r.predicate === "narrated_to")],
  ] as const;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map(([label, list]) => (
        <div key={label}>
          <h4 className="mb-1 text-xs font-medium text-stone-500">{label} ({list.length})</h4>
          <ul className="max-h-72 space-y-1 overflow-auto pe-1 text-sm">
            {list.slice(0, 80).map((r: any, i: number) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <Link href={`/${locale}/persons/${r.other_id}`} className="truncate text-madinah hover:underline">
                  {r.other_name}
                </Link>
                {r.weight > 1 && <span className="badge badge-muted">×{r.weight}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
