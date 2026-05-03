"use client";

import { useEffect, useState } from "react";

const PALETTE = ["#f43f6a", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

export interface Me {
  name: string;
  color: string;
}

function keyFor(tripCode: string) {
  return `me:${tripCode}`;
}

export function getMe(tripCode: string): Me | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(keyFor(tripCode));
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

export function setMe(tripCode: string, me: Me) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyFor(tripCode), JSON.stringify(me));
}

export function pickColor(seedName: string): string {
  let hash = 0;
  for (let i = 0; i < seedName.length; i++) hash = (hash * 31 + seedName.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function useMe(tripCode: string): [Me | null, (m: Me) => void] {
  const [me, setMeState] = useState<Me | null>(null);
  useEffect(() => {
    setMeState(getMe(tripCode));
  }, [tripCode]);
  const update = (m: Me) => {
    setMe(tripCode, m);
    setMeState(m);
  };
  return [me, update];
}
