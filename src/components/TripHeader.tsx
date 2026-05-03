"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Calendar, Camera, Film, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Trip } from "@/lib/types";

interface Props {
  trip: Trip;
}

export default function TripHeader({ trip }: Props) {
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(trip.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const tabs = [
    { href: `/trip/${trip.code}`, label: "계획", icon: Calendar },
    { href: `/trip/${trip.code}/photos`, label: "사진", icon: Camera },
    { href: `/trip/${trip.code}/summary`, label: "스토리", icon: Film }
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
        <Link href="/" className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{trip.title}</div>
          <div className="text-[11px] text-neutral-400">
            {trip.start_date} ~ {trip.end_date}
          </div>
        </div>
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
          const active = pathname === t.href;
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 px-3 py-2 text-sm transition ${
                active
                  ? "border-sakura-500 font-semibold text-sakura-600"
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
  );
}
