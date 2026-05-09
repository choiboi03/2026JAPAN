"use client";

import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
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
  // PointerSensor: desktop click+drag.  TouchSensor with delay = mobile long-press to drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  async function addBlock() {
    const sb = getSupabase();
    await sb.from("blocks").insert({ day_id: day.id, position: blocks.length });
    onChanged();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(blocks, oldIndex, newIndex);
    const sb = getSupabase();
    await Promise.all(
      reordered.map((b, i) => sb.from("blocks").update({ position: i }).eq("id", b.id))
    );
    onChanged();
  }

  return (
    <section className="space-y-3">
      <div className="sticky top-[81px] z-20 -mx-4 bg-white/95 px-4 py-2.5 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <span className="rounded-full bg-ocean-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-ocean-700">
            DAY {index + 1}
          </span>
          <h2 className="text-base font-bold tracking-tight">{formatDateKo(day.date)}</h2>
        </div>
      </div>

      {blocks.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-neutral-200 bg-white/60 p-6 text-center text-sm text-neutral-400">
          이 날의 첫 블록을 추가해보세요.
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
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
        </SortableContext>
      </DndContext>

      <button
        onClick={addBlock}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 transition hover:border-ocean-300 hover:bg-white hover:text-ocean-600"
      >
        <Plus className="h-4 w-4" /> 블록 추가
      </button>
    </section>
  );
}
