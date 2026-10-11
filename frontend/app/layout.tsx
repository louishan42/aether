import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "../components/AppShell";

export const metadata: Metadata = {
  title: "Aether",
  description: "Collections, grants, follow-ups, compliance, and bookings",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
