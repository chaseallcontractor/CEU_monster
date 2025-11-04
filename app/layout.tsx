// app/layout.tsx
import "../src/app/globals.css";
import type { Metadata } from "next";
import AuthProvider from "../src/providers/AuthProvider";

export const metadata: Metadata = {
  title: "CEU Monster",
  description: "Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
