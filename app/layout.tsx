import type { Metadata, Viewport } from "next";
import config from "@/business.config";
import "./globals.css";

const { business, brand, copy, mode } = config;

export const metadata: Metadata = {
  title: `Book with ${business.name}`,
  description: mode === "quote" ? copy.quoteHeroLine : copy.heroLine,
  appleWebApp: { capable: true, title: business.shortName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: brand.colours.paper,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

function fontHref() {
  const fam = (f: string) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700`;
  const fams = Array.from(new Set([brand.displayFont, brand.bodyFont])).map(fam).join("&");
  return `https://fonts.googleapis.com/css2?${fams}&display=swap`;
}

const vars = `:root{
  --ink:${brand.colours.ink};--paper:${brand.colours.paper};--surface:${brand.colours.surface};
  --accent:${brand.colours.accent};--accent-ink:${brand.colours.accentInk};--muted:${brand.colours.muted};
  --line:${brand.colours.line};--radius:${brand.radius};
  --font-display:"${brand.displayFont}";--font-body:"${brand.bodyFont}";
}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={fontHref()} />
        <style dangerouslySetInnerHTML={{ __html: vars }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
