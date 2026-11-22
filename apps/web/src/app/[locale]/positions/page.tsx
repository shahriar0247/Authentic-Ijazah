import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function PositionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const positions = await api<any[]>("/positions").catch(() => []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav.positions")}</h1>
      {!positions.length && <div className="card p-8 text-center text-stone-500">{t("positions.empty")}</div>}
      <div className="grid gap-3 sm:grid-cols-2">
        {positions.map((p) => (
          <Link key={p.id} href={`/${locale}/positions/${p.id}`} className="card p-5 hover:shadow-md">
            <div className="flex items-center gap-2 text-xs">
              <span className="badge badge-muted">{p.domain}</span>
              {p.era && <span className="badge badge-muted">{p.era}</span>}
            </div>
            <h3 className="mt-2 font-medium">{p.title_ar ?? p.title_en}</h3>
            <p className="mt-1 text-sm text-stone-600">{p.attributions} attributed</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
