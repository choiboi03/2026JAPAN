"use client";

export const runtime = "edge";

import { use, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Pause, Play, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import TripHeader from "@/components/TripHeader";
import { getSupabase, PHOTO_BUCKET } from "@/lib/supabase";
import { formatDateKo, formatTime } from "@/lib/date";
import { CANDIDATE_TYPE_META } from "@/lib/types";
import type { Block, Candidate, Day, Photo, Trip } from "@/lib/types";

interface Slide {
  kind: "cover" | "day-intro" | "moment" | "outro";
  title?: string;
  subtitle?: string;
  body?: string;
  photoUrl?: string;
  badge?: string;
  color?: string;
}

const SLIDE_MS = 4500;

export default function SummaryPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      const { data: tripRow } = await sb.from("trips").select("*").eq("code", code).maybeSingle();
      if (!tripRow) return;
      setTrip(tripRow as Trip);
      const [dRes, pRes] = await Promise.all([
        sb.from("days").select("*").eq("trip_id", tripRow.id).order("position"),
        sb.from("photos").select("*").eq("trip_id", tripRow.id).order("taken_at")
      ]);
      const dayList = (dRes.data ?? []) as Day[];
      setDays(dayList);
      setPhotos((pRes.data ?? []) as Photo[]);
      if (dayList.length) {
        const dayIds = dayList.map((d) => d.id);
        const { data: bRows } = await sb.from("blocks").select("*").in("day_id", dayIds).order("position");
        const blockList = (bRows ?? []) as Block[];
        setBlocks(blockList);
        if (blockList.length) {
          const { data: cRows } = await sb
            .from("candidates")
            .select("*")
            .in("block_id", blockList.map((b) => b.id))
            .order("position");
          setCandidates((cRows ?? []) as Candidate[]);
        }
      }
      setLoading(false);
    })();
  }, [code]);

  const slides = useMemo<Slide[]>(() => {
    if (!trip) return [];
    const sb = getSupabase();
    const url = (path: string) => sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
    const out: Slide[] = [];

    out.push({
      kind: "cover",
      title: trip.title,
      subtitle: `${trip.start_date} ~ ${trip.end_date}`,
      photoUrl: photos[0] ? url(photos[0].storage_path) : undefined,
      color: trip.cover_color ?? "#f43f6a"
    });

    const photosByDay = new Map<string, Photo[]>();
    for (const p of photos) {
      const key = p.day_id ?? "unassigned";
      const arr = photosByDay.get(key) ?? [];
      arr.push(p);
      photosByDay.set(key, arr);
    }
    const candById = new Map(candidates.map((c) => [c.id, c] as const));

    days.forEach((day, i) => {
      out.push({
        kind: "day-intro",
        title: `DAY ${i + 1}`,
        subtitle: formatDateKo(day.date)
      });
      const dayBlocks = blocks.filter((b) => b.day_id === day.id);
      const dayPhotos = photosByDay.get(day.id) ?? [];
      const fallbackPhotoQueue = [...dayPhotos];

      dayBlocks.forEach((b) => {
        const sel = b.selected_candidate_id ? candById.get(b.selected_candidate_id) : null;
        if (!sel) return;
        const meta = CANDIDATE_TYPE_META[sel.type];
        const photo = fallbackPhotoQueue.shift();
        out.push({
          kind: "moment",
          title: sel.title || meta.label,
          subtitle:
            (sel.start_time ? formatTime(sel.start_time) : "") +
            (sel.end_time ? ` ~ ${formatTime(sel.end_time)}` : ""),
          body: sel.description ?? undefined,
          photoUrl: photo ? url(photo.storage_path) : undefined,
          badge: `${meta.emoji} ${meta.label}`
        });
      });

      // Any remaining photos for that day get their own slides
      fallbackPhotoQueue.forEach((p) => {
        out.push({
          kind: "moment",
          photoUrl: url(p.storage_path),
          subtitle: p.uploader ?? undefined,
          body: p.caption ?? undefined
        });
      });
    });

    // Photos with no day mapping
    (photosByDay.get("unassigned") ?? []).forEach((p) => {
      out.push({
        kind: "moment",
        photoUrl: url(p.storage_path),
        subtitle: p.uploader ?? undefined,
        body: p.caption ?? undefined
      });
    });

    out.push({
      kind: "outro",
      title: "수고했어요!",
      subtitle: `${days.length}일 · ${photos.length}장의 추억`,
      color: trip.cover_color ?? "#f43f6a"
    });
    return out;
  }, [trip, days, blocks, candidates, photos]);

  useEffect(() => {
    if (!playing || slides.length === 0) return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [idx, playing, slides.length]);

  function share() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: trip?.title ?? "여행 스토리", url }).catch(() => void 0);
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  if (loading || !trip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sakura-500" />
      </div>
    );
  }

  const slide = slides[idx];

  return (
    <>
      <TripHeader trip={trip} />
      <main className="mx-auto max-w-md px-4 pb-24 pt-4">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-3xl bg-neutral-900 shadow-xl">
          {/* Progress bars */}
          <div className="absolute inset-x-3 top-3 z-30 flex gap-1">
            {slides.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full bg-white transition-all"
                  style={{
                    width: i < idx ? "100%" : i === idx ? (playing ? "100%" : "0%") : "0%",
                    transitionDuration: i === idx && playing ? `${SLIDE_MS}ms` : "0ms",
                    transitionTimingFunction: "linear"
                  }}
                />
              </div>
            ))}
          </div>

          {/* Tap zones */}
          <button
            className="absolute inset-y-0 left-0 z-20 w-1/3"
            onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
            aria-label="이전"
          />
          <button
            className="absolute inset-y-0 right-0 z-20 w-1/3"
            onClick={() => setIdx((i) => (i + 1) % slides.length)}
            aria-label="다음"
          />
          <button
            className="absolute inset-y-0 left-1/3 right-1/3 z-20"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "일시정지" : "재생"}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              {slide.photoUrl ? (
                <motion.img
                  src={slide.photoUrl}
                  alt=""
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1.2 }}
                  transition={{ duration: SLIDE_MS / 1000, ease: "linear" }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{
                    background: `linear-gradient(135deg, ${slide.color ?? "#f43f6a"} 0%, #1a1a1a 100%)`
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

              <div className="absolute inset-x-0 bottom-0 z-10 p-6 text-white">
                {slide.badge && (
                  <span className="mb-2 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                    {slide.badge}
                  </span>
                )}
                {slide.kind === "day-intro" && (
                  <div className="text-sakura-300 text-sm font-bold tracking-widest">{slide.title}</div>
                )}
                {slide.title && slide.kind !== "day-intro" && (
                  <h2 className="text-2xl font-bold leading-tight drop-shadow">{slide.title}</h2>
                )}
                {slide.kind === "day-intro" && slide.subtitle && (
                  <h2 className="text-3xl font-bold leading-tight drop-shadow">{slide.subtitle}</h2>
                )}
                {slide.subtitle && slide.kind !== "day-intro" && (
                  <p className="mt-1 text-sm opacity-80">{slide.subtitle}</p>
                )}
                {slide.body && <p className="mt-2 line-clamp-3 text-sm opacity-90">{slide.body}</p>}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setIdx((i) => (i - 1 + slides.length) % slides.length)}
            className="rounded-full bg-white p-3 shadow-sm ring-1 ring-black/5"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="rounded-full bg-sakura-500 p-3 text-white shadow-md shadow-sakura-200"
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={share} className="rounded-full bg-white p-3 shadow-sm ring-1 ring-black/5">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => setIdx((i) => (i + 1) % slides.length)}
            className="rounded-full bg-white p-3 shadow-sm ring-1 ring-black/5"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          {idx + 1} / {slides.length} · 화면을 좌우로 탭하면 넘기고, 가운데를 탭하면 정지
        </p>
      </main>
    </>
  );
}
