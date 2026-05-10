"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { name: "Platform", href: "#platform" },
  { name: "Solutions", href: "#solutions" },
  { name: "AI Audit", href: "#ai-audit" },
  { name: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );

    NAV_LINKS.forEach(({ href }) => {
      const id = href.substring(1);
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.substring(1);
      const elem = document.getElementById(targetId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", href);
      }
    }
  };

  return (
    <nav className="bg-surface-dim/80 backdrop-blur-md border-b border-border-subtle flex justify-between items-center px-6 md:px-12 py-4 w-full fixed top-0 z-50 transition-colors">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 bg-[#007AFF] rounded-md flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-white text-xl">payments</span>
        </div>
        <span className="text-xl font-bold text-foreground">Spendly</span>
      </div>
      
      <div className="hidden md:flex items-center gap-6">
        {NAV_LINKS.map((link) => {
          const isActive = activeSection === link.href.substring(1);
          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={(e) => handleScroll(e, link.href)}
              className={`px-3 rounded-md transition-all hover:text-foreground hover:bg-foreground/5 ${
                isActive
                  ? "text-[#007AFF] font-bold border-b-2 border-[#007AFF] pb-1 pt-2"
                  : "text-foreground/70 py-2"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <Link href="/audit" className="bg-[#007AFF] text-white font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-blue-600 transition-colors shadow-[0_0_15px_rgba(0,122,255,0.3)] hidden sm:block">
          Audit My Stack
        </Link>
      </div>
    </nav>
  );
}
