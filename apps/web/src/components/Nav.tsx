import Link from "next/link";
import { getTranslations } from "next-intl/server";

const items = [
  ["nav.search", ""],
  ["nav.scholars", "/timeline"],
  ["nav.map", "/map"],
  ["nav.books", "/books"],
  ["nav.topics", "/topics"],
  ["nav.positions", "/positions"],
] as const;

export async function Nav({ locale }: { locale: string }) {
  const t = await getTranslations({ locale });
  const other = locale === "ar" ? "en" : "ar";
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href={`/${locale}`} className="flex items-baseline gap-2">
          <span className="font-quran text-xl font-bold text-madinah">
            {t("app.name")}
          </span>
          <span className="hidden text-xs text-stone-500 sm:inline">
            {t("app.tagline")}
          </span>
        </Link>
        <nav className="ms-auto flex items-center gap-1 text-sm">
          {items.map(([key, href]) => (
            <Link
              key={key}
              href={`/${locale}${href}`}
              className="rounded-lg px-2.5 py-1.5 text-stone-700 hover:bg-stone-200/60 hover:text-ink"
            >
              {t(key)}
            </Link>
          ))}
          <Link
            href={`/${other}`}
            className="ms-2 rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-white"
          >
            {locale === "ar" ? "EN" : "عربي"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
