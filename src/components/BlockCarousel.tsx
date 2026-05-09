"use client";

import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  const sortable = useSortable({ id: block.id });
  const sortStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.6 : 1,
    zIndex: sortable.isDragging ? 30 : undefined
  };

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

  const dragHandle = (
    <button
      ref={sortable.setActivatorNodeRef}
      {...sortable.attributes}
      {...sortable.listeners}
      aria-label="블록 순서 변경 (꾹 누른 채 드래그)"
      className="flex shrink-0 cursor-grab touch-none items-center self-stretch px-0.5 text-neutral-300 transition active:cursor-grabbing active:text-neutral-700"
    >
      <GripVertical className="h-5 w-5" />
    </button>
  );

  if (candidates.length === 0) {
    return (
      <div ref={sortable.setNodeRef} style={sortStyle} className="flex items-stretch gap-1">
        {dragHandle}
        <div className="flex-1 rounded-2xl border-2 border-dashed border-neutral-200 bg-white/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400">새 블록</span>
            <button onClick={deleteBlock} className="rounded-full p-1 text-neutral-300 hover:text-red-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <AddCandidateButtons onAdd={addCandidate} />
        </div>
      </div>
    );
  }

  return (
    <div ref={sortable.setNodeRef} style={sortStyle} className="flex items-stretch gap-1">
      {dragHandle}
      <div className="relative min-w-0 flex-1">
        <div className="embla -mx-1" ref={emblaRef}>
          <div className="embla__container gap-3 px-1">
            {candidates.map((c) => (
              <div key={c.id} className="embla__slide flex" style={{ flex: "0 0 88%" }}>
                <CandidateCard
                  candidate={c}
                  selected={c.id === block.selected_candidate_id}
                  onSelect={() => selectCandidate(c.id)}
                  onChanged={onChanged}
                />
              </div>
            ))}
            <div className="embla__slide flex" style={{ flex: "0 0 88%" }}>
              <div className="flex w-full items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-white/40 p-4">
                <AddCandidateButtons onAdd={addCandidate} compact />
              </div>
            </div>
          </div>
        </div>
        {candidates.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
            <div className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 backdrop-blur-sm">
              {candidates.map((c, i) => (
                <span
                  key={c.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === selected ? "w-4 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
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
