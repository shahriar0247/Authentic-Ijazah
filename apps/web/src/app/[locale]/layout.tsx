import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Nav } from "@/components/Nav";
import "../globals.css";

export const metadata: Metadata = {
  title: "Authentic Ijazah — الإجازة الموثوقة",
  description: "Atlas of hadith sciences: chains, narrators, jarh wa ta'dil",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const rtl = locale === "ar";

  return (
    <html lang={locale} dir={rtl ? "rtl" : "ltr"}>
      <body>
        <NextIntlClientProvider>
          <Nav locale={locale} />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
