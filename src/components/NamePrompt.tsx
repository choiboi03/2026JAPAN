"use client";

import { useState } from "react";
import { useMe, pickColor } from "@/lib/me";
import { getSupabase } from "@/lib/supabase";

interface Props {
  tripId: string;
  tripCode: string;
  onJoined?: () => void;
  children?: React.ReactNode;
}

export default function NamePrompt({ tripId, tripCode, onJoined, children }: Props) {
  const [me, setMe] = useMe(tripCode);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (me) return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const color = pickColor(name);
    const sb = getSupabase();
    await sb.from("participants").upsert(
      { trip_id: tripId, name: name.trim(), color },
      { onConflict: "trip_id,name" }
    );
    setMe({ name: name.trim(), color });
    onJoined?.();
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center px-5">
      <form onSubmit={submit} className="w-full space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h2 className="text-lg font-semibold">이 여행에서 어떻게 부를까요?</h2>
        <p className="text-sm text-neutral-500">친구들이 누구의 메모/사진인지 알아볼 수 있게요.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 지민"
          maxLength={12}
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-lg outline-none focus:border-sakura-400 focus:bg-white"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="w-full rounded-xl bg-sakura-500 py-3 font-semibold text-white shadow-md shadow-sakura-200 disabled:opacity-50"
        >
          시작하기
        </button>
      </form>
    </main>
  );
}
