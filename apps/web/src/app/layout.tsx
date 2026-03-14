import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Soji",
  description: "Membership content platform for web and app."
};

const navigation = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/library", label: "Library" },
  { href: "/account", label: "Account" },
  { href: "/admin", label: "Admin" }
] as const;

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 bg-gradient-to-r from-sky-300 to-blue-400/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
            <Link href="/" className="text-2xl font-black text-darktext">
              Soji
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm font-semibold uppercase tracking-[0.16em] text-darktext md:text-base md:tracking-normal">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href} className="hover:opacity-70 transition-opacity">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
        <footer className="border-t border-darktext/15 bg-brightwhite px-6 py-12">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 text-sm text-darktext/70 md:flex-row md:items-center">
            <p className="font-semibold">
              Soji presents Well Endowed, an editorial money membership with public previews and paid depth.
            </p>
            <div className="flex gap-6 font-semibold">
              <Link href="/pricing" className="hover:text-darktext transition-colors">Join</Link>
              <Link href="/library" className="hover:text-darktext transition-colors">Preview</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
