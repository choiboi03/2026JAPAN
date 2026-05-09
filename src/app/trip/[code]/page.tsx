"use client";

export const runtime = "edge";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import TripHeader from "@/components/TripHeader";
import DaySection from "@/components/DaySection";
import NamePrompt from "@/components/NamePrompt";
import { useTripData } from "@/lib/useTripData";
import type { Candidate } from "@/lib/types";

export default function TripPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const { trip, days, blocks, candidates, loading, error, reload } = useTripData(code);
  const [activeIdx, setActiveIdx] = useState(0);

  const candidatesByBlock = useMemo(() => {
    const m = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const arr = m.get(c.block_id) ?? [];
      arr.push(c);
      m.set(c.block_id, arr);
    }
    return m;
  }, [candidates]);

  // Clamp active day if days array shrinks
  useEffect(() => {
    if (activeIdx >= days.length && days.length > 0) {
      setActiveIdx(days.length - 1);
    }
  }, [days.length, activeIdx]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ocean-500" />
      </div>
    );
  }
  if (error || !trip) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-neutral-600">{error ?? "여행을 찾을 수 없어요."}</p>
      </div>
    );
  }

  const activeDay = days[activeIdx];

  return (
    <>
      <TripHeader trip={trip} />
      <NamePrompt tripId={trip.id} tripCode={trip.code}>
        <main className="mx-auto max-w-md px-4 pb-24 pt-1">
          {activeDay ? (
            <DaySection
              key={activeDay.id}
              day={activeDay}
              index={activeIdx}
              totalDays={days.length}
              tripCode={trip.code}
              blocks={blocks.filter((b) => b.day_id === activeDay.id)}
              candidatesByBlock={candidatesByBlock}
              onChanged={reload}
              onPrevDay={() => {
                if (activeIdx > 0) {
                  setActiveIdx(activeIdx - 1);
                  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
                }
              }}
              onNextDay={() => {
                if (activeIdx < days.length - 1) {
                  setActiveIdx(activeIdx + 1);
                  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
                }
              }}
            />
          ) : (
            <p className="py-12 text-center text-sm text-neutral-400">
              아직 일정이 비어있어요. 출발일/도착일을 다시 설정해주세요.
            </p>
          )}
        </main>
      </NamePrompt>
    </>
  );
}
