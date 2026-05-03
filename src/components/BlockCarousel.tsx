"use client";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Plus, Trash2 } from "lucide-react";
import type { Block, Candidate, CandidateType } from "@/lib/types";
import CandidateCard from "./CandidateCard";
import { getSupabase } from "@/lib/supabase";
import { useMe } from "@/lib/me";

interface Props {
  block: Block;
  candidates: Candidate[];
  tripCode: string;
  onChanged: () => void;
}

export default function BlockCarousel({ block, candidates, tripCode, onChanged }: Props) {
  const [emblaRef, embla] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const [selected, setSelected] = useState(0);
  const [me] = useMe(tripCode);

  useEffect(() => {
    if (!embla) return;
    const onSel = () => setSelected(embla.selectedScrollSnap());
    embla.on("select", onSel);
    onSel();
    return () => {
      embla.off("select", onSel);
    };
  }, [embla, candidates.length]);

  // Snap to selected_candidate_id when it changes
  useEffect(() => {
    if (!embla || !block.selected_candidate_id) return;
    const idx = candidates.findIndex((c) => c.id === block.selected_candidate_id);
    if (idx >= 0 && idx !== embla.selectedScrollSnap()) embla.scrollTo(idx, true);
  }, [embla, block.selected_candidate_id, candidates]);

  async function addCandidate(type: CandidateType) {
    const sb = getSupabase();
    const nextPos = candidates.length;
    const { data } = await sb
      .from("candidates")
      .insert({
        block_id: block.id,
        position: nextPos,
        type,
        title: "",
        created_by: me?.name ?? null
      })
      .select("id")
      .single();
    // If first candidate, auto-select it
    if (nextPos === 0 && data) {
      await sb.from("blocks").update({ selected_candidate_id: data.id }).eq("id", block.id);
    }
    onChanged();
    requestAnimationFrame(() => embla?.scrollTo(nextPos));
  }

  async function selectCandidate(id: string) {
    const sb = getSupabase();
    await sb.from("blocks").update({ selected_candidate_id: id }).eq("id", block.id);
    onChanged();
  }

  async function deleteBlock() {
    if (!confirm("이 블록 전체를 삭제할까요? (모든 후보 포함)")) return;
    const sb = getSupabase();
    await sb.from("blocks").delete().eq("id", block.id);
    onChanged();
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-white/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400">새 블록</span>
          <button onClick={deleteBlock} className="rounded-full p-1 text-neutral-300 hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <AddCandidateButtons onAdd={addCandidate} />
      </div>
    );
  }

  return (
    <div className="group relative">
      <div className="embla -mx-1" ref={emblaRef}>
        <div className="embla__container gap-3 px-1">
          {candidates.map((c) => (
            <div key={c.id} className="embla__slide" style={{ flex: "0 0 88%" }}>
              <CandidateCard
                candidate={c}
                selected={c.id === block.selected_candidate_id}
                onSelect={() => selectCandidate(c.id)}
                onChanged={onChanged}
              />
            </div>
          ))}
          <div className="embla__slide" style={{ flex: "0 0 88%" }}>
            <div className="flex h-full min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-white/40 p-4">
              <AddCandidateButtons onAdd={addCandidate} compact />
            </div>
          </div>
        </div>
      </div>
      {candidates.length > 0 && (
        <div className="mt-2 flex justify-center gap-1">
          {candidates.map((c, i) => (
            <span
              key={c.id}
              className={`h-1.5 rounded-full transition-all ${
                i === selected ? "w-5 bg-neutral-900" : "w-1.5 bg-neutral-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddCandidateButtons({
  onAdd,
  compact = false
}: {
  onAdd: (type: CandidateType) => void;
  compact?: boolean;
}) {
  const buttons: { type: CandidateType; label: string; emoji: string; cls: string }[] = [
    { type: "move", label: "이동", emoji: "🚆", cls: "bg-sky-100 text-sky-700" },
    { type: "place", label: "장소", emoji: "📍", cls: "bg-emerald-100 text-emerald-700" },
    { type: "other", label: "기타", emoji: "✨", cls: "bg-amber-100 text-amber-700" }
  ];
  return (
    <div className={compact ? "flex flex-col gap-2" : "grid grid-cols-3 gap-2"}>
      {buttons.map((b) => (
        <button
          key={b.type}
          onClick={() => onAdd(b.type)}
          className={`flex items-center justify-center gap-1.5 rounded-lg ${b.cls} px-3 py-2 text-xs font-semibold`}
        >
          <Plus className="h-3.5 w-3.5" /> {b.emoji} {b.label}
        </button>
      ))}
    </div>
  );
}
