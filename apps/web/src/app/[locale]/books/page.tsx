import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { api } from "@/lib/api";
import { nameEn, workEn } from "@/lib/en";

export const dynamic = "force-dynamic";

export default async function BooksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const books = await api<any[]>("/books");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{books.length} {t("nav.books")}</h1>
      <div className="grid gap-2 sm:grid-cols-2">
        {books.map((b) => (
          <Link key={b.id} href={`/${locale}/books/${b.id}`} className="card flex items-center justify-between gap-3 p-3 hover:shadow-md">
            <div className="min-w-0">
              <div className="truncate font-medium">{locale === "en" ? workEn(b.title_ar) : b.title_ar}</div>
              <div className="text-xs text-stone-500">{locale === "en" ? (b.author_name_en ?? b.author_name_ar) : b.author_name_ar} · {b.category}</div>
            </div>
            <span className="badge badge-muted shrink-0">{Number(b.hadith_count ?? 0).toLocaleString(locale)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
