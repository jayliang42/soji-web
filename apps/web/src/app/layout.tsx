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
        <header className="sticky top-0 z-20 bg-[rgba(166,234,99,0.88)] backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
            <Link href="/" className="font-display text-[1.75rem] tracking-tight text-cocoa">
              Soji
            </Link>
            <nav className="flex items-center gap-5 text-[0.72rem] uppercase tracking-[0.24em] text-cocoa/70">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
        <footer className="border-t border-black/10 px-6 py-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 text-sm text-cocoa/65">
            <p>Soji is an editorial money membership with public previews and paid depth.</p>
            <div className="flex gap-4 uppercase tracking-[0.22em]">
              <Link href="/pricing">Join</Link>
              <Link href="/library">Preview</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
