"use client";

export const runtime = "edge";

import { useMemo } from "react";
import { Loader2, Clock, ExternalLink } from "lucide-react";
import TripHeader from "@/components/TripHeader";
import NamePrompt from "@/components/NamePrompt";
import { useTripData } from "@/lib/useTripData";
import { CANDIDATE_TYPE_META } from "@/lib/types";
import { formatDateKo, formatTime } from "@/lib/date";

function getLink(meta: Record<string, unknown>): { label: string; url: string } | null {
  const raw = meta.link;
  if (raw && typeof raw === "object") {
    const l = raw as Record<string, unknown>;
    if (typeof l.url === "string" && l.url) {
      return {
        label: typeof l.label === "string" && l.label ? l.label : "링크",
        url: l.url
      };
    }
  }
  return null;
}

function normalizeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function OverviewPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const { trip, days, blocks, candidates, loading, error } = useTripData(code);

  const candidateById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

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
        <main className="mx-auto max-w-md px-4 pb-24 pt-4">
          {days.length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-400">아직 일정이 비어있어요.</p>
          ) : (
            <div className="space-y-6">
              {days.map((day, i) => {
                const dayBlocks = blocks
                  .filter((b) => b.day_id === day.id)
                  .sort((a, b) => a.position - b.position);
                return (
                  <section key={day.id} className="space-y-2">
                    <div className="flex items-baseline gap-2 border-b border-neutral-200 pb-2">
                      <span className="rounded-full bg-ocean-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-ocean-700">
                        DAY {i + 1}
                      </span>
                      <h2 className="text-base font-bold tracking-tight">{formatDateKo(day.date)}</h2>
                    </div>

                    {dayBlocks.length === 0 ? (
                      <p className="py-3 text-center text-xs text-neutral-400">일정 없음</p>
                    ) : (
                      <div className="space-y-2">
                        {dayBlocks.map((b) => {
                          const sel = b.selected_candidate_id
                            ? candidateById.get(b.selected_candidate_id)
                            : null;
                          if (!sel) {
                            return (
                              <div
                                key={b.id}
                                className="rounded-xl border border-dashed border-neutral-200 px-3 py-2 text-center text-[11px] text-neutral-400"
                              >
                                확정된 후보 없음
                              </div>
                            );
                          }
                          const m = CANDIDATE_TYPE_META[sel.type];
                          const link = getLink(sel.meta);
                          const hasTimeOrLink = sel.start_time || sel.end_time || link;
                          return (
                            <div
                              key={b.id}
                              className={`rounded-xl border-l-[3px] bg-white px-3 py-2.5 ring-1 ring-black/5 ${m.stripe}`}
                            >
                              <div className="mb-1 flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${m.chip}`}
                                >
                                  <span className="text-xs leading-none">{m.emoji}</span>
                                  {m.label}
                                </span>
                              </div>
                              <div className="break-words text-sm font-semibold leading-snug text-neutral-900">
                                {sel.title || <span className="text-neutral-400">(제목 없음)</span>}
                              </div>
                              {hasTimeOrLink && (
                                <div className="mt-1 flex items-center gap-2">
                                  {(sel.start_time || sel.end_time) && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-500">
                                      <Clock className="h-3 w-3" />
                                      {formatTime(sel.start_time)}
                                      {sel.end_time ? ` ~ ${formatTime(sel.end_time)}` : ""}
                                    </span>
                                  )}
                                  {link && (
                                    <a
                                      href={normalizeHref(link.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-auto inline-flex max-w-[60%] items-center gap-1 truncate rounded-md bg-ocean-50 px-2 py-0.5 text-[11px] font-semibold text-ocean-700 ring-1 ring-ocean-200"
                                    >
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{link.label}</span>
                                    </a>
                                  )}
                                </div>
                              )}
                              {sel.description && (
                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                                  {sel.description}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </NamePrompt>
    </>
  );
}
