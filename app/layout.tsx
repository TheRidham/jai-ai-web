import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "./components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jai AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex flex-col min-h-screen">
          <header className="bg-white shadow z-50">
            <div className="px-4 py-4 text-center">
              <h1 className="text-3xl font-bold">Jai Ai Web</h1>
            </div>
          </header>
          <main className="flex-1 py-4 bg-white">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
