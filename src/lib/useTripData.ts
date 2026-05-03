"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Block, Candidate, Day, Trip } from "@/lib/types";

export interface TripData {
  trip: Trip | null;
  days: Day[];
  blocks: Block[];
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useTripData(code: string): TripData {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tripIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const sb = getSupabase();
      const { data: tripRow, error: e1 } = await sb.from("trips").select("*").eq("code", code).maybeSingle();
      if (e1) throw e1;
      if (!tripRow) {
        setError("여행을 찾을 수 없어요.");
        setLoading(false);
        return;
      }
      setTrip(tripRow as Trip);
      tripIdRef.current = tripRow.id;

      const { data: dayRows } = await sb
        .from("days")
        .select("*")
        .eq("trip_id", tripRow.id)
        .order("position", { ascending: true });
      const dayList = (dayRows ?? []) as Day[];
      setDays(dayList);

      if (dayList.length > 0) {
        const dayIds = dayList.map((d) => d.id);
        const { data: blockRows } = await sb
          .from("blocks")
          .select("*")
          .in("day_id", dayIds)
          .order("position", { ascending: true });
        const blockList = (blockRows ?? []) as Block[];
        setBlocks(blockList);

        if (blockList.length > 0) {
          const blockIds = blockList.map((b) => b.id);
          const { data: candRows } = await sb
            .from("candidates")
            .select("*")
            .in("block_id", blockIds)
            .order("position", { ascending: true });
          setCandidates((candRows ?? []) as Candidate[]);
        } else {
          setCandidates([]);
        }
      } else {
        setBlocks([]);
        setCandidates([]);
      }
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "데이터 로드 실패");
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refetch on any change to the trip's tables
  useEffect(() => {
    if (!trip) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`trip:${trip.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "days", filter: `trip_id=eq.${trip.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "blocks" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates" }, () => load())
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [trip, load]);

  return { trip, days, blocks, candidates, loading, error, reload: load };
}
