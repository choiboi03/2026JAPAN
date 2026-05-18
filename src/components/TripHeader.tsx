"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, ListChecks, Image as ImageIcon, Copy, Check, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Trip } from "@/lib/types";
import TripSettingsModal from "./TripSettingsModal";

interface Props {
  trip: Trip;
}

export default function TripHeader({ trip }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Publish the actual rendered header height as a CSS variable so the
  // day-section sticky header can pin exactly under us with no overlap or gap.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => {
      document.documentElement.style.setProperty("--trip-header-h", `${el.offsetHeight}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  function copyCode() {
    navigator.clipboard.writeText(trip.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const planHref = `/trip/${trip.code}`;
  const overviewHref = `/trip/${trip.code}/overview`;
  const photosHref = `/trip/${trip.code}/photos`;
  const summaryHref = `/trip/${trip.code}/summary`;
  const tabs = [
    { href: planHref, label: "계획", icon: Calendar, active: pathname === planHref },
    { href: overviewHref, label: "전체", icon: ListChecks, active: pathname === overviewHref },
    {
      href: photosHref,
      label: "추억",
      icon: ImageIcon,
      active: pathname === photosHref || pathname === summaryHref
    }
  ];

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-30 border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-2.5">
          <Link href="/" className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">{trip.title}</div>
            <div className="text-[11px] leading-tight text-neutral-400">
              {trip.start_date} ~ {trip.end_date}
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="여행 설정"
            className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
          >
            <Settings className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-mono font-semibold tracking-widest text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {trip.code}
          </button>
        </div>
        <nav className="mx-auto flex max-w-md gap-1 px-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-sm transition ${
                  t.active
                    ? "border-ocean-500 font-semibold text-ocean-600"
                    : "border-transparent text-neutral-400 hover:text-neutral-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {settingsOpen && (
        <TripSettingsModal
          trip={trip}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}
