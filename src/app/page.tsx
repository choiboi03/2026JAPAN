"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plane, Users, ArrowRight, Loader2 } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { generateTripCode, normalizeCode } from "@/lib/code";
import { eachDay, toISODate } from "@/lib/date";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"join" | "create">("join");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("2026 일본 여행");
  const today = toISODate(new Date());
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const c = normalizeCode(code);
    if (c.length < 4) {
      setErr("코드를 정확히 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabase();
      const { data, error } = await sb.from("trips").select("code").eq("code", c).maybeSingle();
      if (error) throw error;
      if (!data) {
        setErr("그런 코드의 여행을 찾을 수 없어요.");
        return;
      }
      router.push(`/trip/${c}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) {
      setErr("여행 이름을 적어주세요.");
      return;
    }
    if (!start || !end || new Date(end) < new Date(start)) {
      setErr("출발일/도착일을 확인해주세요.");
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabase();
      // Try a few times in case of code collision
      let createdCode: string | null = null;
      let tripId: string | null = null;
      for (let i = 0; i < 5 && !createdCode; i++) {
        const c = generateTripCode(6);
        const { data, error } = await sb
          .from("trips")
          .insert({ code: c, title: title.trim(), start_date: start, end_date: end })
          .select("id, code")
          .single();
        if (!error && data) {
          createdCode = data.code;
          tripId = data.id;
        }
      }
      if (!createdCode || !tripId) throw new Error("여행 생성에 실패했어요.");

      const dates = eachDay(start, end);
      if (dates.length) {
        const rows = dates.map((date, i) => ({ trip_id: tripId, date, position: i }));
        await sb.from("days").insert(rows);
      }
      router.push(`/trip/${createdCode}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-16 pt-12">
      <header className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sakura-500 text-white shadow-lg shadow-sakura-200">
          <Plane className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">2026 일본 여행</h1>
        <p className="mt-1 text-sm text-neutral-500">친구들과 함께 짜는 블록 플래너</p>
      </header>

      {!isSupabaseConfigured && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Supabase가 아직 연결되지 않았어요.</b>
          <br />
          <code>.env.local</code>에 <code>NEXT_PUBLIC_SUPABASE_URL</code>과{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>를 채워주세요. (자세한 내용은 README 참고)
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 rounded-2xl bg-white/70 p-1 shadow-sm ring-1 ring-black/5">
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`rounded-xl py-2.5 text-sm font-medium transition ${
            mode === "join" ? "bg-sakura-500 text-white shadow" : "text-neutral-600"
          }`}
        >
          코드로 참여
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`rounded-xl py-2.5 text-sm font-medium transition ${
            mode === "create" ? "bg-sakura-500 text-white shadow" : "text-neutral-600"
          }`}
        >
          새 여행 만들기
        </button>
      </div>

      {mode === "join" ? (
        <form onSubmit={onJoin} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <label className="block">
            <span className="text-xs font-semibold text-neutral-500">여행 코드</span>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: K8M2X7"
              maxLength={12}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-2xl font-mono tracking-[0.4em] outline-none focus:border-sakura-400 focus:bg-white"
            />
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sakura-500 py-3 font-semibold text-white shadow-md shadow-sakura-200 transition active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Users className="h-5 w-5" />}
            합류하기
          </button>
          <p className="text-center text-xs text-neutral-400">친구가 만든 코드를 입력하면 같은 여행으로 들어가요.</p>
        </form>
      ) : (
        <form onSubmit={onCreate} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <label className="block">
            <span className="text-xs font-semibold text-neutral-500">여행 이름</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 outline-none focus:border-sakura-400 focus:bg-white"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-neutral-500">출발일</span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 outline-none focus:border-sakura-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-neutral-500">도착일</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 outline-none focus:border-sakura-400 focus:bg-white"
              />
            </label>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sakura-500 py-3 font-semibold text-white shadow-md shadow-sakura-200 transition active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            만들기
          </button>
          <p className="text-center text-xs text-neutral-400">
            만들면 6자리 코드가 나와요. 친구들에게 공유해서 같이 편집!
          </p>
        </form>
      )}
    </main>
  );
}
