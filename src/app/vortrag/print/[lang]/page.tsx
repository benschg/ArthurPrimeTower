import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SlidePrint } from "@/components/presentation/SlidePrint";
import { isLang, langs } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return langs.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  title: "Vortrag zum Drucken · Prime Tower Zürich",
  robots: { index: false },
};

/** All slides stacked for printing; the source of the downloadable PDF and HTML (scripts/export-talk.mjs). */
export default async function PrintPage({ params }: PageProps<"/vortrag/print/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <SlidePrint lang={lang} />;
}
