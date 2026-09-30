import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { LangProvider } from "@/i18n/LangContext";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  // every page title says the site is unofficial: "Mieter · Prime Tower Zürich (inoffiziell)"
  title: { default: "Prime Tower Zürich (inoffiziell)", template: "%s · Prime Tower Zürich (inoffiziell)" },
  description:
    "Ein interaktiver 3D-Showcase des Prime Tower in Zürich-West: Fakten, Geschosse, Mieter, Tiefgarage und Fotos. An interactive 3D showcase of the Prime Tower.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
