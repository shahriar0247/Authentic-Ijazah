import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { api, rankBadge } from "@/lib/api";
import { gradeEn, nameEn } from "@/lib/en";

export const dynamic = "force-dynamic";

const MIN_AH = 1, MAX_AH = 700;

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ start_ah?: string; end_ah?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const start = Number(sp.start_ah ?? 1), end = Number(sp.end_ah ?? 300);
  const people = await api<any[]>(`/timeline?start_ah=${start}&end_ah=${end}&limit=250`).catch(() => []);

  const span = Math.max(1, end - start);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("timeline.title")}</h1>
      <p className="text-sm text-stone-500">{t("timeline.filter", { s: start, e: end })}</p>
      <div className="card divide-y divide-stone-100">
        {people.map((p) => {
          const b = p.birth_ah_min ?? Math.max(start, (p.death_ah_min ?? start) - 60);
          const d = p.death_ah_min ?? Math.min(end, b + 70);
          const left = Math.max(0, Math.min(100, ((b - start) / span) * 100));
          const width = Math.max(1.5, Math.min(100 - left, ((d - b) / span) * 100));
          return (
            <Link key={p.id} href={`/${locale}/persons/${p.id}`} className="flex items-center gap-3 px-4 py-2 hover:bg-stone-50">
              <div className="w-56 shrink-0 truncate text-sm">{locale === "en" ? nameEn(p) : (p.display_name_ar ?? p.display_name_en)}</div>
              <div className="relative h-4 flex-1" dir="ltr">
                <div
                  className="absolute top-1 h-2 rounded-full bg-madinah/70"
                  style={{ left: `${left}%`, width: `${width}%` }}
                  title={`${b}–${d} AH`}
                />
              </div>
              <span className="w-20 shrink-0 text-end text-xs text-stone-500">{b}–{d}</span>
              {p.rank_ar && <span className={`badge shrink-0 ${rankBadge(p.rank_norm)}`}>{locale === "en" ? gradeEn(p.rank_ar) : p.rank_ar}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
