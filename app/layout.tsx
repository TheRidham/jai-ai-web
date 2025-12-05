import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jai AI",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="h-screen flex flex-col flex-1 bg-white">{children}</main>
      </body>
    </html>
  );
}
