import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function BooksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const books = await api<any[]>("/books");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{books.length} books</h1>
      <div className="grid gap-2 sm:grid-cols-2">
        {books.map((b) => (
          <Link key={b.id} href={`/${locale}/books/${b.id}`} className="card flex items-center justify-between gap-3 p-3 hover:shadow-md">
            <div className="min-w-0">
              <div className="truncate font-medium">{b.title_ar}</div>
              <div className="text-xs text-stone-500">{b.author_name_ar} · {b.category}</div>
            </div>
            <span className="badge badge-muted shrink-0">{Number(b.hadith_count ?? 0).toLocaleString(locale)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
