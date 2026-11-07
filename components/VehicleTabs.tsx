"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/** Horizontally scrolling section tabs that keep the active tab in view. */
export function VehicleTabs({ tabs, activeTab, label }: { tabs: { key: string; label: string; href: string }[]; activeTab: string; label: string }) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>("a.active");
    if (!nav || !active) return;
    const target = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeTab]);

  return (
    <div className="section-tabs-wrap">
      <nav className="tabs section-tabs" aria-label={label} ref={navRef}>
        {tabs.map((tab) => (
          <Link className={activeTab === tab.key ? "active" : ""} aria-current={activeTab === tab.key ? "page" : undefined} href={tab.href} key={tab.key} scroll={false}>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
