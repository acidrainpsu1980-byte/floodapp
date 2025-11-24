import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "Flood Relief Hat Yai",
  description: "Flood relief request system for Hat Yai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={kanit.className}>
        {children}
      </body>
    </html>
  );
}
