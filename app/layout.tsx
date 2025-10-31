import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CEU Monster",
  description: "Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
