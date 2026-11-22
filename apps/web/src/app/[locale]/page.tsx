import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";
import { SearchBox } from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const stats = await api<{ stats: Record<string, number> }>("/stats").catch(
    () => ({ stats: {} }),
  );

  const cards = [
    ["isnad", `/search`],
    ["scholars", `/timeline`],
    ["network", `/timeline`],
    ["map", `/map`],
    ["positions", `/positions`],
    ["books", `/books`],
  ] as const;

  return (
    <div className="space-y-10">
      <section className="pt-8 text-center">
        <h1 className="font-quran text-5xl font-bold text-madinah">
          {t("app.name")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-stone-600">{t("home.hero")}</p>
        <div className="mx-auto mt-6 max-w-2xl">
          <SearchBox locale={locale} placeholder={t("home.searchPlaceholder")} />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-stone-500">
          {Object.entries(stats.stats ?? {}).slice(0, 8).map(([k, v]) => (
            <span key={k} className="badge badge-muted">
              {k.replaceAll("_", " ")}: {Number(v).toLocaleString(locale)}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([key, href]) => (
          <Link key={key} href={`/${locale}${href}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="font-semibold text-ink group-hover:text-madinah">
              {t(`home.features.${key}.t`)}
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              {t(`home.features.${key}.d`)}
            </p>
          </Link>
        ))}
      </section>
    </div>
  );
}
