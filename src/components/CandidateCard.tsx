"use client";

import { useState } from "react";
import { Check, Trash2, Pencil } from "lucide-react";
import { CANDIDATE_TYPE_META, type Candidate, type CandidateType } from "@/lib/types";
import { formatTime } from "@/lib/date";
import { getSupabase } from "@/lib/supabase";

interface Props {
  candidate: Candidate;
  selected: boolean;
  onSelect: () => void;
  onChanged: () => void;
}

export default function CandidateCard({ candidate, selected, onSelect, onChanged }: Props) {
  const meta = CANDIDATE_TYPE_META[candidate.type];
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(candidate.title);
  const [desc, setDesc] = useState(candidate.description ?? "");
  const [type, setType] = useState<CandidateType>(candidate.type);
  const [start, setStart] = useState(candidate.start_time ?? "");
  const [end, setEnd] = useState(candidate.end_time ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const sb = getSupabase();
    await sb
      .from("candidates")
      .update({
        type,
        title: title.trim(),
        description: desc.trim() || null,
        start_time: start || null,
        end_time: end || null
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

  if (editing) {
    return (
      <div className={`relative rounded-2xl border-2 ${meta.color} p-4`}>
        <div className="mb-2 flex gap-1">
          {(["move", "place", "other"] as CandidateType[]).map((t) => {
            const m = CANDIDATE_TYPE_META[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  type === t ? `${m.chip} font-bold` : "bg-white/60 text-neutral-500"
                }`}
              >
                {m.emoji} {m.label}
              </button>
            );
          })}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="mb-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none"
        />
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            type="time"
            value={start ? start.slice(0, 5) : ""}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm outline-none"
          />
          <input
            type="time"
            value={end ? end.slice(0, 5) : ""}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm outline-none"
          />
        </div>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="메모 (주소, 비용, 링크 등)"
          className="mb-3 w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            저장
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg bg-white px-4 py-2 text-sm text-neutral-600 ring-1 ring-neutral-200"
          >
            취소
          </button>
          <button onClick={remove} className="rounded-lg bg-red-50 px-3 py-2 text-red-600 ring-1 ring-red-200">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl border-2 ${meta.color} p-4 transition ${
        selected ? `ring-2 ${meta.ring}` : "opacity-90"
      }`}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
          {meta.emoji} {meta.label}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)} className="rounded-full p-1.5 text-neutral-400 hover:bg-white/70">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onSelect}
            className={`rounded-full p-1.5 transition ${
              selected ? "bg-neutral-900 text-white" : "bg-white/60 text-neutral-400 hover:text-neutral-900"
            }`}
            title="이 후보를 확정"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mb-1 text-base font-semibold leading-snug">{candidate.title || "(제목 없음)"}</div>
      {(candidate.start_time || candidate.end_time) && (
        <div className="mb-1 text-xs text-neutral-500">
          {formatTime(candidate.start_time)}
          {candidate.end_time ? ` ~ ${formatTime(candidate.end_time)}` : ""}
        </div>
      )}
      {candidate.description && (
        <p className="whitespace-pre-wrap text-sm text-neutral-600">{candidate.description}</p>
      )}
      {candidate.created_by && (
        <div className="mt-2 text-[10px] uppercase tracking-wider text-neutral-400">by {candidate.created_by}</div>
      )}
    </div>
  );
}
