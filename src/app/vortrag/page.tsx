import type { Metadata } from "next";
import { SlideDeck } from "@/components/presentation/SlideDeck";

export const metadata: Metadata = {
  title: "Vortrag · Prime Tower Zürich",
  description: "Schulvortrag über den Prime Tower: 9 Folien mit den wichtigsten Fakten, Fotos und Sprechernotizen. School talk on the Prime Tower.",
};

export default function PresentationPage() {
  return <SlideDeck />;
}
