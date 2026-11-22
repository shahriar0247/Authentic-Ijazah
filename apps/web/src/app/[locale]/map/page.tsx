import { getTranslations, setRequestLocale } from "next-intl/server";
import { api } from "@/lib/api";
import { MapView } from "@/components/MapView";

export const dynamic = "force-dynamic";

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const places = await api<any[]>("/places").catch(() => []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("map.title")}</h1>
      <p className="text-sm text-stone-500">{t("map.hint")}</p>
      {places.length ? <MapView places={places} locale={locale} /> : (
        <div className="card p-8 text-center text-stone-500">
          places table is empty — populate via ETL (Phase 3 gazetteer stage)
        </div>
      )}
    </div>
  );
}
