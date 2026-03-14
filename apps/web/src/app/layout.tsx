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
        <header className="sticky top-0 z-20 border-b border-dune/60 bg-sand/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-display text-2xl">
              Soji
            </Link>
            <nav className="flex items-center gap-5 text-sm text-cocoa/75">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
