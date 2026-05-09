"use client";

import { useEffect, useState } from "react";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { eachDay, formatDateKo } from "@/lib/date";
import type { Trip } from "@/lib/types";

interface Props {
  trip: Trip;
  onClose: () => void;
  onSaved: () => void;
}

export default function TripSettingsModal({ trip, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(trip.title);
  const [start, setStart] = useState(trip.start_date ?? "");
  const [end, setEnd] = useState(trip.end_date ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Holds dates that are about to lose data, awaiting user confirmation.
  const [pendingDeleteDates, setPendingDeleteDates] = useState<string[] | null>(null);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function commit() {
    setBusy(true);
    setErr(null);
    try {
      const sb = getSupabase();
      const oldStart = trip.start_date ?? start;
      const oldEnd = trip.end_date ?? end;
      const oldDates = eachDay(oldStart, oldEnd);
      const newDates = eachDay(start, end);
      const oldSet = new Set(oldDates);
      const newSet = new Set(newDates);
      const toRemove = oldDates.filter((d) => !newSet.has(d));
      const toAdd = newDates.filter((d) => !oldSet.has(d));

      // 1. Update trip metadata
      const { error: tripErr } = await sb
        .from("trips")
        .update({ title: title.trim(), start_date: start, end_date: end })
        .eq("id", trip.id);
      if (tripErr) throw tripErr;

      // 2. Delete days outside new range (cascade deletes blocks + candidates;
      //    photos.day_id is set null because of ON DELETE SET NULL).
      if (toRemove.length > 0) {
        const { error: delErr } = await sb
          .from("days")
          .delete()
          .eq("trip_id", trip.id)
          .in("date", toRemove);
        if (delErr) throw delErr;
      }

      // 3. Insert any newly-added days (UNIQUE on (trip_id, date) protects us)
      if (toAdd.length > 0) {
        const rows = toAdd.map((date) => ({ trip_id: trip.id, date, position: 0 }));
        const { error: insErr } = await sb.from("days").insert(rows);
        if (insErr) throw insErr;
      }

      // 4. Re-position all remaining days by date so the planner stays in order
      if (toAdd.length > 0 || toRemove.length > 0) {
        const { data: allDays } = await sb
          .from("days")
          .select("id, date")
          .eq("trip_id", trip.id)
          .order("date", { ascending: true });
        if (allDays) {
          await Promise.all(
            allDays.map((d, i) => sb.from("days").update({ position: i }).eq("id", d.id))
          );
        }
      }

      onSaved();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "저장 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) return setErr("여행 이름을 적어주세요.");
    if (!start || !end || new Date(end) < new Date(start)) {
      return setErr("출발일이 도착일보다 늦을 수 없어요.");
    }

    setBusy(true);
    try {
      const sb = getSupabase();
      const oldDates = eachDay(trip.start_date ?? start, trip.end_date ?? end);
      const newSet = new Set(eachDay(start, end));
      const toRemove = oldDates.filter((d) => !newSet.has(d));

      if (toRemove.length === 0) {
        await commit();
        return;
      }

      // Find which removed dates actually have blocks (data we'd lose)
      const { data: dayRows } = await sb
        .from("days")
        .select("id, date")
        .eq("trip_id", trip.id)
        .in("date", toRemove);
      const dateById = new Map((dayRows ?? []).map((d) => [d.id as string, d.date as string]));
      const dayIds = Array.from(dateById.keys());

      if (dayIds.length === 0) {
        await commit();
        return;
      }

      const { data: blockRows } = await sb
        .from("blocks")
        .select("day_id")
        .in("day_id", dayIds);
      const datesWithData = Array.from(
        new Set((blockRows ?? []).map((b) => dateById.get(b.day_id as string)).filter(Boolean) as string[])
      ).sort();

      if (datesWithData.length === 0) {
        await commit();
        return;
      }

      setPendingDeleteDates(datesWithData);
      setBusy(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "확인 중 오류가 발생했어요.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">여행 설정</h2>
          <button onClick={onClose} className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {pendingDeleteDates ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" /> 삭제될 일정이 있어요
              </div>
              <p className="mb-2 text-xs">
                아래 날짜의 블록과 후보가 영구 삭제됩니다. (그 날 찍은 사진은 사진 탭에 그대로 남아요.)
              </p>
              <ul className="list-disc space-y-0.5 pl-5 text-xs">
                {pendingDeleteDates.map((d) => (
                  <li key={d}>{formatDateKo(d)}</li>
                ))}
              </ul>
            </div>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setPendingDeleteDates(null)}
                className="flex-1 rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-700"
              >
                돌아가기
              </button>
              <button
                onClick={commit}
                disabled={busy}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "삭제하고 저장"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-neutral-500">여행 이름</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-ocean-400 focus:bg-white"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">출발일</span>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 block h-12 w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-left text-base outline-none focus:border-ocean-400 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">도착일</span>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1 block h-12 w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-left text-base outline-none focus:border-ocean-400 focus:bg-white"
                />
              </label>
            </div>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              날짜를 바꾸면 같은 날짜의 일정은 그대로 남고, 새 날짜는 빈 일자로 생성돼요.
              범위에서 빠지는 날짜에 블록이 있으면 저장 전에 다시 확인할게요.
            </p>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-ocean-500 py-3 font-semibold text-white shadow-md shadow-ocean-200 disabled:opacity-50"
            >
              {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "저장"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
