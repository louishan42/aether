"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { ChatDock } from "./ChatDock";
import { FileViewProvider } from "../lib/fileView";

const groups = [
  {
    label: "Operations",
    items: [
      { href: "/dashboard", label: "Overview" },
      { href: "/analysis", label: "Analysis" },
      { href: "/approvals", label: "Approvals" },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/invoices", label: "Invoices" },
      { href: "/customers", label: "Customers" },
      { href: "/appointments", label: "Bookings" },
      { href: "/grants", label: "Grants" },
      { href: "/compliance", label: "Compliance" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/datasets", label: "Datasets" },
      { href: "/about", label: "About Us" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function moveSpot(event: React.MouseEvent<HTMLDivElement>) {
    document.documentElement.style.setProperty("--spot-x", `${(event.clientX / window.innerWidth) * 100}%`);
    document.documentElement.style.setProperty("--spot-y", `${(event.clientY / window.innerHeight) * 100}%`);
  }

  if (pathname === "/") {
    return <main className="page">{children}</main>;
  }

  return (
    <FileViewProvider>
    <div className="min-h-screen bg-white md:pl-56" onMouseMove={moveSpot}>
      <div className="fx" aria-hidden>
        <div className="fx-orb fx-orb-a" />
        <div className="fx-orb fx-orb-b" />
        <div className="fx-grid" />
        <div className="fx-spot" />
      </div>
      <header className="mobile-topbar md:hidden">
        <button className="menu-btn" type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
          Menu
        </button>
        <Logo />
      </header>
      {open && <button className="mobile-scrim md:hidden" aria-label="Close menu" type="button" onClick={() => setOpen(false)} />}
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 w-[min(18rem,86vw)] overflow-y-auto md:w-56 ${open ? "open" : ""}`}>
        <div className="flex items-center justify-between border-b border-white/25 px-5 py-5">
          <Logo />
          <button className="menu-btn md:hidden" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <nav className="space-y-5 px-2 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">{group.label}</p>
              <ul className="mt-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={`nav-link ${pathname === item.href ? "active" : ""}`}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/25 px-5 py-4 text-xs text-white">Asia/Singapore</div>
      </aside>
      <main className="page mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-8">{children}</main>
      <ChatDock />
    </div>
    </FileViewProvider>
  );
}
