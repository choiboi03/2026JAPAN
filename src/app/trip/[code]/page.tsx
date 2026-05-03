"use client";

export const runtime = "edge";

import { use, useMemo } from "react";
import { Loader2 } from "lucide-react";
import TripHeader from "@/components/TripHeader";
import DaySection from "@/components/DaySection";
import NamePrompt from "@/components/NamePrompt";
import { useTripData } from "@/lib/useTripData";
import type { Candidate } from "@/lib/types";

export default function TripPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { trip, days, blocks, candidates, loading, error, reload } = useTripData(code);

  const candidatesByBlock = useMemo(() => {
    const m = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const arr = m.get(c.block_id) ?? [];
      arr.push(c);
      m.set(c.block_id, arr);
    }
    return m;
  }, [candidates]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sakura-500" />
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

  return (
    <>
      <TripHeader trip={trip} />
      <NamePrompt tripId={trip.id} tripCode={trip.code}>
        <main className="mx-auto max-w-md px-4 pb-24 pt-4">
          <div className="space-y-8">
            {days.map((day, i) => (
              <DaySection
                key={day.id}
                day={day}
                index={i}
                tripCode={trip.code}
                blocks={blocks.filter((b) => b.day_id === day.id)}
                candidatesByBlock={candidatesByBlock}
                onChanged={reload}
              />
            ))}
          </div>
          {days.length === 0 && (
            <p className="py-12 text-center text-sm text-neutral-400">
              아직 일정이 비어있어요. 출발일/도착일을 다시 설정해주세요.
            </p>
          )}
        </main>
      </NamePrompt>
    </>
  );
}
