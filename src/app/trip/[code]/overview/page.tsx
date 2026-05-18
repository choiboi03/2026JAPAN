"use client";

export const runtime = "edge";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import TripHeader from "@/components/TripHeader";
import NamePrompt from "@/components/NamePrompt";
import { useTripData } from "@/lib/useTripData";
import { CANDIDATE_TYPE_META, type Candidate } from "@/lib/types";
import { formatTime } from "@/lib/date";

const HOUR_HEIGHT = 56;
const COL_WIDTH = 150;
const TIME_COL = 42;
const HEADER_ROW = 52;
const UNTIMED_ROW = 60;

function parseHHMM(t: string | null): number | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function dayLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  if (isNaN(d.getTime())) return date;
  const wd = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}/${d.getDate()} (${wd[d.getDay()]})`;
}

export default function OverviewPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const { trip, days, blocks, candidates, loading, error } = useTripData(code);

  const candidateById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

  const { startHour, endHour } = useMemo(() => {
    let minH = 7;
    let maxH = 22;
    for (const b of blocks) {
      const sel = b.selected_candidate_id ? candidateById.get(b.selected_candidate_id) : null;
      if (!sel) continue;
      const s = parseHHMM(sel.start_time);
      const e = parseHHMM(sel.end_time);
      if (s !== null) minH = Math.min(minH, Math.floor(s));
      if (e !== null) maxH = Math.max(maxH, Math.ceil(e));
      else if (s !== null) maxH = Math.max(maxH, Math.ceil(s + 1));
    }
    return { startHour: Math.max(0, minH), endHour: Math.min(24, maxH) };
  }, [blocks, candidateById]);

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = startHour; h <= endHour; h++) out.push(h);
    return out;
  }, [startHour, endHour]);

  // Untimed (no start_time) selected candidates per day
  const untimedByDay = useMemo(() => {
    const m = new Map<string, Candidate[]>();
    for (const b of blocks) {
      if (!b.selected_candidate_id) continue;
      const c = candidateById.get(b.selected_candidate_id);
      if (!c || c.start_time) continue;
      const arr = m.get(b.day_id) ?? [];
      arr.push(c);
      m.set(b.day_id, arr);
    }
    return m;
  }, [blocks, candidateById]);

  const hasUntimed = useMemo(() => {
    for (const arr of untimedByDay.values()) if (arr.length > 0) return true;
    return false;
  }, [untimedByDay]);

  const canvasWidth = TIME_COL + COL_WIDTH * Math.max(days.length, 1);
  const gridHeight = (endHour - startHour) * HOUR_HEIGHT;

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

  return (
    <>
      <TripHeader trip={trip} />
      <NamePrompt tripId={trip.id} tripCode={trip.code}>
        {days.length === 0 ? (
          <main className="mx-auto max-w-md px-4 pb-24 pt-12">
            <p className="text-center text-sm text-neutral-400">아직 일정이 비어있어요.</p>
          </main>
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-12">
            <div className="relative" style={{ width: canvasWidth }}>
              {/* ── Day header row: sticks under the trip header */}
              <div
                className="sticky z-30 flex border-b border-neutral-200 bg-white"
                style={{ top: "var(--trip-header-h, 86px)", height: HEADER_ROW }}
              >
                <div
                  className="sticky left-0 z-40 shrink-0 border-r border-neutral-200 bg-white"
                  style={{ width: TIME_COL }}
                />
                {days.map((d, i) => (
                  <div
                    key={d.id}
                    className="flex shrink-0 flex-col items-center justify-center border-r border-neutral-100 px-2 text-center"
                    style={{ width: COL_WIDTH }}
                  >
                    <div className="text-[10px] font-bold tracking-wider text-ocean-700">
                      DAY {i + 1}
                    </div>
                    <div className="text-xs font-semibold text-neutral-800">{dayLabel(d.date)}</div>
                  </div>
                ))}
              </div>

              {/* ── Untimed row (only shown if any day has untimed selected candidates) */}
              {hasUntimed && (
                <div className="flex border-b border-neutral-200 bg-neutral-50" style={{ minHeight: UNTIMED_ROW }}>
                  <div
                    className="sticky left-0 z-20 flex shrink-0 items-start justify-end border-r border-neutral-200 bg-neutral-50 pr-1 pt-2 text-[9px] uppercase tracking-wider text-neutral-400"
                    style={{ width: TIME_COL }}
                  >
                    종일
                  </div>
                  {days.map((d) => {
                    const items = untimedByDay.get(d.id) ?? [];
                    return (
                      <div
                        key={d.id}
                        className="shrink-0 space-y-1 border-r border-neutral-100 p-1.5"
                        style={{ width: COL_WIDTH }}
                      >
                        {items.map((c) => {
                          const m = CANDIDATE_TYPE_META[c.type];
                          return (
                            <div
                              key={c.id}
                              className={`overflow-hidden rounded-md border-l-[3px] bg-white px-1.5 py-1 ring-1 ring-black/5 ${m.stripe}`}
                            >
                              <div className="break-words text-[10px] font-semibold leading-tight text-neutral-900">
                                <span className="mr-1">{m.emoji}</span>
                                {c.title || "(제목 없음)"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Time grid */}
              <div className="relative flex" style={{ height: gridHeight }}>
                {/* Time labels (sticky left) */}
                <div
                  className="sticky left-0 z-20 shrink-0 border-r border-neutral-200 bg-white"
                  style={{ width: TIME_COL }}
                >
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className="relative border-b border-neutral-100"
                      style={{ height: HOUR_HEIGHT }}
                    >
                      {i > 0 && (
                        <span className="absolute -top-2 right-1 font-mono text-[10px] text-neutral-400">
                          {String(h).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {days.map((d) => {
                  const dayBlocks = blocks
                    .filter((b) => b.day_id === d.id)
                    .map((b) => ({
                      block: b,
                      sel: b.selected_candidate_id ? candidateById.get(b.selected_candidate_id) : null
                    }))
                    .filter(
                      (x): x is { block: typeof blocks[number]; sel: Candidate } =>
                        Boolean(x.sel && x.sel.start_time)
                    );
                  return (
                    <div
                      key={d.id}
                      className="relative shrink-0 border-r border-neutral-100"
                      style={{ width: COL_WIDTH }}
                    >
                      {hours.map((h) => (
                        <div
                          key={h}
                          className="border-b border-neutral-100"
                          style={{ height: HOUR_HEIGHT }}
                        />
                      ))}
                      {dayBlocks.map(({ block, sel }) => {
                        const s = parseHHMM(sel.start_time)!;
                        const e = parseHHMM(sel.end_time) ?? s + 1;
                        const top = (s - startHour) * HOUR_HEIGHT;
                        const height = Math.max(32, (e - s) * HOUR_HEIGHT - 2);
                        const m = CANDIDATE_TYPE_META[sel.type];
                        return (
                          <div
                            key={block.id}
                            className={`absolute left-1 right-1 overflow-hidden rounded-md border-l-[3px] bg-white px-1.5 py-1 text-[10px] shadow-sm ring-1 ring-black/5 ${m.stripe}`}
                            style={{ top, height }}
                          >
                            <div className="flex items-center gap-1 leading-tight">
                              <span className="text-[10px]">{m.emoji}</span>
                              <span className="font-mono text-[9px] text-neutral-500">
                                {formatTime(sel.start_time)}
                              </span>
                            </div>
                            <div className="line-clamp-3 break-words text-[11px] font-semibold leading-tight text-neutral-900">
                              {sel.title || "(제목 없음)"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </NamePrompt>
    </>
  );
}
