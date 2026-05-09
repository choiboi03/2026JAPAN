"use client";

import { useState } from "react";
import { Check, Trash2, Pencil, Clock } from "lucide-react";
import { CANDIDATE_TYPE_META, type Candidate, type CandidateType } from "@/lib/types";
import { formatTime } from "@/lib/date";
import { getSupabase } from "@/lib/supabase";

interface Props {
  candidate: Candidate;
  selected: boolean;
  onSelect: () => void;
  onChanged: () => void;
}

interface MoveMeta {
  from?: string;
  to?: string;
}

function getMove(meta: Record<string, unknown>): MoveMeta {
  return {
    from: typeof meta.from === "string" ? meta.from : "",
    to: typeof meta.to === "string" ? meta.to : ""
  };
}

export default function CandidateCard({ candidate, selected, onSelect, onChanged }: Props) {
  const meta = CANDIDATE_TYPE_META[candidate.type];
  const initialMove = getMove(candidate.meta);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(candidate.title);
  const [fromLoc, setFromLoc] = useState(initialMove.from ?? "");
  const [toLoc, setToLoc] = useState(initialMove.to ?? "");
  const [desc, setDesc] = useState(candidate.description ?? "");
  const [type, setType] = useState<CandidateType>(candidate.type);
  const [start, setStart] = useState(candidate.start_time ?? "");
  const [end, setEnd] = useState(candidate.end_time ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const sb = getSupabase();
    const isMove = type === "move";
    const computedTitle = isMove
      ? [fromLoc.trim(), toLoc.trim()].filter(Boolean).join(" ➡️ ")
      : title.trim();
    const nextMeta: Record<string, unknown> = { ...candidate.meta };
    if (isMove) {
      nextMeta.from = fromLoc.trim();
      nextMeta.to = toLoc.trim();
    }
    await sb
      .from("candidates")
      .update({
        type,
        title: computedTitle,
        description: desc.trim() || null,
        start_time: start || null,
        end_time: end || null,
        meta: nextMeta
      })
      .eq("id", candidate.id);
    setBusy(false);
    setEditing(false);
    onChanged();
  }

  async function remove() {
    if (!confirm("이 후보를 삭제할까요?")) return;
    const sb = getSupabase();
    await sb.from("candidates").delete().eq("id", candidate.id);
    onChanged();
  }

  // ────────────────────────────────────────────────────────────────────
  // EDIT MODE
  // ────────────────────────────────────────────────────────────────────
  if (editing) {
    const editMeta = CANDIDATE_TYPE_META[type];
    return (
      <div
        className={`relative w-full rounded-2xl border-l-[3px] bg-white px-4 pb-4 pt-4 ring-1 ring-black/5 shadow-sm ${editMeta.stripe}`}
      >
        <div className="mb-3 flex gap-1.5">
          {(["move", "place", "other"] as CandidateType[]).map((t) => {
            const m = CANDIDATE_TYPE_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  type === t ? `${m.chip} font-bold` : "bg-neutral-50 text-neutral-500 ring-1 ring-neutral-200"
                }`}
              >
                {m.emoji} {m.label}
              </button>
            );
          })}
        </div>

        {type === "move" ? (
          <div className="mb-3 space-y-2">
            <label className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs font-semibold text-neutral-500">출발</span>
              <input
                value={fromLoc}
                onChange={(e) => setFromLoc(e.target.value)}
                placeholder="예: 인천공항"
                className="w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-xs font-semibold text-neutral-500">도착</span>
              <input
                value={toLoc}
                onChange={(e) => setToLoc(e.target.value)}
                placeholder="예: 나리타공항"
                className="w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
              />
            </label>
          </div>
        ) : (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="mb-3 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
        )}

        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            type="time"
            value={start ? start.slice(0, 5) : ""}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 font-mono text-sm text-neutral-700 outline-none focus:border-neutral-400"
          />
          <input
            type="time"
            value={end ? end.slice(0, 5) : ""}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 font-mono text-sm text-neutral-700 outline-none focus:border-neutral-400"
          />
        </div>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="메모 (주소, 비용, 링크 등)"
          className="mb-3 w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
        />

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            저장
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg bg-white px-4 py-2.5 text-sm text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50"
          >
            취소
          </button>
          <button
            onClick={remove}
            className="rounded-lg bg-white px-3 py-2.5 text-red-600 ring-1 ring-red-200 hover:bg-red-50"
            aria-label="후보 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // DISPLAY MODE
  // ────────────────────────────────────────────────────────────────────
  return (
    <div
      className={`relative w-full rounded-2xl border-l-[3px] bg-white px-4 pb-5 pt-4 ring-1 ring-black/5 transition ${meta.stripe} ${
        selected ? meta.selectedRing : "shadow-sm"
      }`}
    >
      {/* Header: type chip + actions */}
      <div className="mb-2 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
          <span className="text-sm leading-none">{meta.emoji}</span>
          {meta.label}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setEditing(true)}
            aria-label="편집"
            className="rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onSelect}
            aria-label="이 후보로 확정"
            className={`rounded-full p-1.5 transition ${
              selected
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-400 hover:text-neutral-900"
            }`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mb-2 break-words text-base font-semibold leading-snug text-neutral-900">
        {candidate.title || <span className="text-neutral-400">(제목 없음)</span>}
      </div>

      {/* Time pill */}
      {(candidate.start_time || candidate.end_time) && (
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-mono text-neutral-700">
          <Clock className="h-3 w-3" />
          {formatTime(candidate.start_time)}
          {candidate.end_time ? ` ~ ${formatTime(candidate.end_time)}` : ""}
        </div>
      )}

      {/* Description */}
      {candidate.description && (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-600 [overflow-wrap:anywhere]">
          {candidate.description}
        </p>
      )}

      {/* Footer */}
      {candidate.created_by && (
        <div className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-neutral-400">
          <span className="h-1 w-1 rounded-full bg-neutral-300" />
          by {candidate.created_by}
        </div>
      )}
    </div>
  );
}
