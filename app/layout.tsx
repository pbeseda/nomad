import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOMAD",
  description: "An ongoing investigation in mapping abandoned infrastructure in the American West.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
