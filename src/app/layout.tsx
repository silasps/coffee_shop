import type { Metadata } from "next";
import { GlobalActionFeedback } from "@/components/global-action-feedback";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cafeteria AT | Coffee Shop",
    template: "%s | Cafeteria AT",
  },
  description:
    "Sistema inicial para cardápio público, pedidos, painel do vendedor, administração e financeiro da Cafeteria AT.",
  openGraph: {
    title: "Cafeteria AT",
    description:
      "Cardápio multilíngue, checkout e gestão operacional para balcão, mesa e totem.",
    url: siteUrl,
    siteName: "Cafeteria AT",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cafeteria AT",
    description:
      "Cardápio multilíngue, checkout e gestão operacional para a Cafeteria AT.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <GlobalActionFeedback />
      </body>
    </html>
  );
}
