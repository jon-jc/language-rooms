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
  title: "LanguageRooms — live video language practice",
  description:
    "Persistent multi-user video and voice rooms for practicing languages together, with shared whiteboards and a supportive community.",
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
      <body className="app-backdrop flex min-h-full flex-col text-zinc-100">
        <TopNav user={user} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
          {children}
        </main>
        <footer className="border-t border-white/5 py-5 text-center text-xs text-zinc-600">
          © LanguageRooms ·{" "}
          <a href="/terms" className="transition-colors hover:text-zinc-400">
            Terms of Service
          </a>
        </footer>
      </body>
    </html>
  );
}
