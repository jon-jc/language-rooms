import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/ui";
import { readSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LanguageRooms — live video language practice (18+)",
  description:
    "Persistent multi-user video and voice rooms for practicing languages together. Adults only.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readSession();
  const user = session
    ? await db.user.findUnique({
        where: { id: session.sub },
        select: { displayName: true, role: true },
      })
    : null;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 text-zinc-100">
        <TopNav user={user} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-600">
          LanguageRooms is for adults 18 and older. ·{" "}
          <a href="/terms" className="underline">
            Terms
          </a>
        </footer>
      </body>
    </html>
  );
}
