import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { api, rankBadge, fmtAH } from "@/lib/api";
import { SearchBox } from "@/components/SearchBox";
import { PathFinder } from "@/components/PathFinder";

export const dynamic = "force-dynamic";

const RANKS = ["thiqa", "saduq", "daif", "sahabi"];

export default async function ScholarsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const qs = new URLSearchParams(
    Object.entries(sp).filter(([, v]) => v != null && v !== "") as [string, string][],
  ).toString();
  const scholars = await api<any[]>(`/scholars?limit=60&${qs}`);

  const filters = [
    ["companion", "صحابي"], ["critic", "ناقد"],
    ["sahih=bukhari", "رواة البخاري"], ["sahih=muslim", "رواة مسلم"],
    ["sahih=both", "رواة الصحيحين"],
    ["flags=tadlis", "مدلسون"],
    ...RANKS.map((r) => [`rank=${r}`, r] as const),
  ];

  const active = (f: string) =>
    f.startsWith("rank=") ? sp.rank === f.split("=")[1]
    : f.startsWith("sahih=") ? sp.sahih === f.split("=")[1]
    : f.startsWith("flags=") ? sp.flags === f.split("=")[1]
    : sp[f] === "1";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t("nav.scholars")}</h1>
      <SearchBox locale={locale} placeholder={t("home.searchPlaceholder")} initial={sp.q ?? ""} />
      <PathFinder locale={locale} />
      <div className="flex flex-wrap gap-2">
        {filters.map(([f, label]) => {
          const on = active(f);
          const href = `?${on ? "" : f}`;
          return (
            <Link key={f} href={`/${locale}/scholars${href}`}
              className={`badge ${on ? "badge-thiqa" : "badge-muted"} hover:opacity-80`}>
              {label}
            </Link>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {scholars.map((p) => (
          <Link key={p.id} href={`/${locale}/persons/${p.id}`} className="card flex items-center gap-3 p-3 hover:shadow-md">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{p.display_name_ar ?? p.display_name_en}</div>
              <div className="text-xs text-stone-500">
                {p.tabaqa} · {fmtAH(p.birth_ah_min, p.death_ah_min) ?? "—"} {t("common.ah")}
                · {p.assessment_count} {t("person.assessments")}
              </div>
            </div>
            {p.rank_ar && <span className={`badge shrink-0 ${rankBadge(p.rank_norm)}`}>{p.rank_ar}</span>}
            {p.is_companion && <span className="badge badge-sahabi shrink-0">صحابي</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
