import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { locale, id } = await params;
  const { cursor = "0" } = await searchParams;
  setRequestLocale(locale);
  const d = await api<any>(`/books/${id}?cursor=${cursor}&limit=60`);
  const w = d.work;
  return (
    <div className="space-y-5">
      <header className="card p-6">
        <h1 className="font-quran text-2xl font-bold">{w.title_ar}</h1>
        <p className="mt-1 text-stone-600">{w.author_name_ar}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {w.category && <span className="badge badge-muted">{w.category}</span>}
          {w.tasnif && <span className="badge badge-muted">{w.tasnif}</span>}
          {w.dar && <span className="badge badge-muted">{w.dar}</span>}
          {w.tabaa && <span className="badge badge-muted">ط {w.tabaa}</span>}
          {w.city && <span className="badge badge-muted">{w.city}</span>}
          {w.hadith_count && <span className="badge badge-thiqa">{Number(w.hadith_count).toLocaleString(locale)} hadith</span>}
        </div>
      </header>
      <ul className="space-y-2">
        {d.hadiths.map((h: any) => (
          <li key={h.id}>
            <Link href={`/${locale}/hadith/${h.id}`} className="card block p-3 hover:shadow-md">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <span>#{h.hadith_no}</span>
                {h.hukm && <span className="badge badge-muted">{h.hukm}</span>}
                {h.type === "qudsi" && <span className="badge badge-sahabi">قدسي</span>}
              </div>
              <p className="hadith-text mt-1 line-clamp-2 text-[15px]">{h.snippet}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/${locale}/books/${id}?cursor=${Number(cursor) + 60}`}
        className="inline-block rounded-lg bg-madinah px-4 py-2 text-sm text-white"
      >
        →
      </Link>
    </div>
  );
}
