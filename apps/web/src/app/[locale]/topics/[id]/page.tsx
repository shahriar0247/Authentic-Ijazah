import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const d = await api<any>(`/topics/${id}`);
  return (
    <div className="space-y-5">
      <header className="card p-6">
        <h1 className="font-quran text-2xl font-bold">{d.topic.title_ar ?? d.topic.title_en}</h1>
        {d.topic.title_en && d.topic.title_ar && <p className="text-stone-500">{d.topic.title_en}</p>}
      </header>
      {!!d.children?.length && (
        <div className="flex flex-wrap gap-2">
          {d.children.map((c: any) => (
            <Link key={c.id} href={`/${locale}/topics/${c.id}`} className="badge badge-muted hover:bg-stone-200">
              {c.title_ar ?? c.title_en}
            </Link>
          ))}
        </div>
      )}
      {!!d.meanings?.length && (
        <section className="card p-5">
          <h2 className="section-title mb-3">meaning groups ({d.meanings.length})</h2>
          <ul className="grid gap-1 sm:grid-cols-2">
            {d.meanings.map((m: any) => (
              <li key={m.id}>
                <Link href={`/${locale}/groups/${m.id}`} className="block rounded px-2 py-1 text-sm hover:bg-stone-100">
                  {m.title_ar}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
