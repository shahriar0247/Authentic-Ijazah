import Link from "next/link";
import { setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function TopicsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ parent?: string }>;
}) {
  const { locale } = await params;
  const { parent } = await searchParams;
  setRequestLocale(locale);
  const topics = await api<any[]>(`/topics${parent ? `?parent=${parent}` : ""}`);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Topics</h1>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((tp) => (
          <Link key={tp.id} href={`/${locale}/topics/${tp.id}`} className="card p-4 hover:shadow-md">
            <div className="font-medium">{locale === "en" ? (tp.title_en ?? tp.title_ar) : (tp.title_ar ?? tp.title_en)}</div>
            <div className="mt-1 text-xs text-stone-500">level {tp.level}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
