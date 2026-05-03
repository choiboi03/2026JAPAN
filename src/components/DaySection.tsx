"use client";

import { Plus } from "lucide-react";
import type { Block, Candidate, Day } from "@/lib/types";
import { formatDateKo } from "@/lib/date";
import BlockCarousel from "./BlockCarousel";
import { getSupabase } from "@/lib/supabase";

interface Props {
  day: Day;
  index: number;
  tripCode: string;
  blocks: Block[];
  candidatesByBlock: Map<string, Candidate[]>;
  onChanged: () => void;
}

export default function DaySection({ day, index, tripCode, blocks, candidatesByBlock, onChanged }: Props) {
  async function addBlock() {
    const sb = getSupabase();
    await sb.from("blocks").insert({ day_id: day.id, position: blocks.length });
    onChanged();
  }

  return (
    <section className="space-y-3">
      <div className="sticky top-[97px] z-20 -mx-4 bg-gradient-to-b from-[#fff5f7] to-[#fff5f7]/80 px-4 py-2 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-sakura-500">DAY {index + 1}</span>
          <h2 className="text-lg font-bold tracking-tight">{formatDateKo(day.date)}</h2>
        </div>
      </div>

      {blocks.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-white/60 p-6 text-center text-sm text-neutral-400">
          이 날의 첫 블록을 추가해보세요.
        </div>
      )}

      <div className="space-y-3">
        {blocks.map((b) => (
          <BlockCarousel
            key={b.id}
            block={b}
            candidates={candidatesByBlock.get(b.id) ?? []}
            tripCode={tripCode}
            onChanged={onChanged}
          />
        ))}
      </div>

      <button
        onClick={addBlock}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 transition hover:border-sakura-300 hover:bg-white hover:text-sakura-600"
      >
        <Plus className="h-4 w-4" /> 블록 추가
      </button>
    </section>
  );
}
