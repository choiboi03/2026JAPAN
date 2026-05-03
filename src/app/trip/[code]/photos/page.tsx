"use client";

export const runtime = "edge";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload, X } from "lucide-react";
import TripHeader from "@/components/TripHeader";
import NamePrompt from "@/components/NamePrompt";
import { getSupabase, PHOTO_BUCKET } from "@/lib/supabase";
import { useMe } from "@/lib/me";
import type { Photo, Trip } from "@/lib/types";

export default function PhotosPage({ params }: { params: { code: string } }) {
  const { code } = params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<Photo | null>(null);
  const [me] = useMe(code);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const { data: tripRow } = await sb.from("trips").select("*").eq("code", code).maybeSingle();
    if (!tripRow) return;
    setTrip(tripRow as Trip);
    const { data: ps } = await sb
      .from("photos")
      .select("*")
      .eq("trip_id", tripRow.id)
      .order("taken_at", { ascending: false });
    setPhotos((ps ?? []) as Photo[]);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!trip) return;
    const sb = getSupabase();
    const ch = sb
      .channel(`photos:${trip.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos", filter: `trip_id=eq.${trip.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [trip, load]);

  function publicUrl(path: string): string {
    const sb = getSupabase();
    const { data } = sb.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !trip) return;
    setUploading(true);
    setProgress(0);
    const sb = getSupabase();
    const arr = Array.from(files);
    let done = 0;
    for (const f of arr) {
      const ext = f.name.split(".").pop() ?? "jpg";
      const key = `${trip.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await sb.storage.from(PHOTO_BUCKET).upload(key, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || "image/jpeg"
      });
      if (!upErr) {
        await sb.from("photos").insert({
          trip_id: trip.id,
          storage_path: key,
          uploader: me?.name ?? null,
          taken_at: new Date(f.lastModified || Date.now()).toISOString()
        });
      }
      done++;
      setProgress(Math.round((done / arr.length) * 100));
    }
    setUploading(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
    load();
  }

  async function deletePhoto(p: Photo) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    const sb = getSupabase();
    await sb.storage.from(PHOTO_BUCKET).remove([p.storage_path]);
    await sb.from("photos").delete().eq("id", p.id);
    setPreview(null);
    load();
  }

  if (loading || !trip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-sakura-500" />
      </div>
    );
  }

  return (
    <>
      <TripHeader trip={trip} />
      <NamePrompt tripId={trip.id} tripCode={trip.code}>
        <main className="mx-auto max-w-md px-4 pb-24 pt-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.removeAttribute("capture");
                  inputRef.current.click();
                }
              }}
              disabled={uploading}
              className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-neutral-700 shadow-sm ring-1 ring-black/5 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              사진 선택
            </button>
            <button
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.setAttribute("capture", "environment");
                  inputRef.current.click();
                }
              }}
              disabled={uploading}
              className="flex items-center justify-center gap-2 rounded-xl bg-sakura-500 py-3 font-semibold text-white shadow-md shadow-sakura-200 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              지금 촬영
            </button>
          </div>

          {uploading && (
            <div className="mb-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-neutral-500">업로드 중...</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full bg-sakura-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {photos.length === 0 ? (
            <div className="mt-12 text-center text-sm text-neutral-400">
              아직 사진이 없어요. 여행 중에 찍은 순간을 올려보세요.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreview(p)}
                  className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicUrl(p.storage_path)}
                    alt={p.caption ?? ""}
                    loading="lazy"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}
        </main>
      </NamePrompt>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setPreview(null)}
        >
          <div className="flex items-center justify-between p-4 text-white">
            <div className="text-xs">
              {preview.uploader && <span className="opacity-80">{preview.uploader} · </span>}
              <span className="opacity-60">{new Date(preview.taken_at).toLocaleString("ko-KR")}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePhoto(preview);
                }}
                className="rounded-full bg-white/10 p-2"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreview(null);
                }}
                className="rounded-full bg-white/10 p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicUrl(preview.storage_path)}
              alt=""
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
