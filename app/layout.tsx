import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SP Online — Shopify Rechnungstool",
  description: "Shopify Rechnungstool für Starphone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <header className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="text-xl font-bold tracking-tight">
                SP Online
              </Link>
              <nav className="flex items-center gap-6 text-sm font-medium">
                <Link
                  href="/orders"
                  className="hover:text-gray-300 transition-colors"
                >
                  Bestellungen
                </Link>
                <Link
                  href="/invoices"
                  className="hover:text-gray-300 transition-colors"
                >
                  Rechnungen
                </Link>
                <Link
                  href="/invoices/new"
                  className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 transition-colors"
                >
                  + Neue Rechnung
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
