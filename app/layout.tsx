import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Camp desk",
  description: "Booking dashboard for a single campsite.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
