import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider"; // <- Capital A, default import

export const metadata: Metadata = {
  title: "CEU Monster",
  description: "CEU certificates made easy",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
