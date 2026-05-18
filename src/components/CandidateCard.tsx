"use client";

import { useState } from "react";
import { Check, Trash2, Pencil, Clock, ExternalLink } from "lucide-react";
import { CANDIDATE_TYPE_META, type Candidate, type CandidateType } from "@/lib/types";
import { formatTime } from "@/lib/date";
import { getSupabase } from "@/lib/supabase";

// Inline helper: convert raw http(s) URLs in text into clickable <a> tags.
// Trailing punctuation like '.', ',', ')' is peeled off so it doesn't end up
// inside the link.
const URL_RE = /(https?:\/\/[^\s<>"'`]+)/g;
function linkify(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let lastIdx = 0;
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > lastIdx) out.push(text.slice(lastIdx, m.index));
    let url = m[0];
    let trailing = "";
    const trailMatch = url.match(/([.,;:!?)\]}>]+)$/);
    if (trailMatch) {
      trailing = trailMatch[1];
      url = url.slice(0, -trailing.length);
    }
    out.push(
      <a
        key={`${m.index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="break-all text-ocean-600 underline decoration-ocean-300 underline-offset-2 hover:decoration-ocean-500"
      >
        {url}
      </a>
    );
    if (trailing) out.push(trailing);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) out.push(text.slice(lastIdx));
  return out;
}

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

interface LinkMeta {
  label?: string;
  url?: string;
}

function getMove(meta: Record<string, unknown>): MoveMeta {
  return {
    from: typeof meta.from === "string" ? meta.from : "",
    to: typeof meta.to === "string" ? meta.to : ""
  };
}

function getLink(meta: Record<string, unknown>): LinkMeta {
  const raw = meta.link;
  if (raw && typeof raw === "object") {
    const l = raw as Record<string, unknown>;
    return {
      label: typeof l.label === "string" ? l.label : "",
      url: typeof l.url === "string" ? l.url : ""
    };
  }
  return { label: "", url: "" };
}

function normalizeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function CandidateCard({ candidate, selected, onSelect, onChanged }: Props) {
  const meta = CANDIDATE_TYPE_META[candidate.type];
  const initialMove = getMove(candidate.meta);
  const initialLink = getLink(candidate.meta);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(candidate.title);
  const [fromLoc, setFromLoc] = useState(initialMove.from ?? "");
  const [toLoc, setToLoc] = useState(initialMove.to ?? "");
  const [linkLabel, setLinkLabel] = useState(initialLink.label ?? "");
  const [linkUrl, setLinkUrl] = useState(initialLink.url ?? "");
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
    const trimmedLabel = linkLabel.trim();
    const trimmedUrl = linkUrl.trim();
    if (trimmedUrl) {
      nextMeta.link = { label: trimmedLabel || "링크", url: trimmedUrl };
    } else {
      delete nextMeta.link;
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

        <div className="mb-2 grid grid-cols-2 gap-2">
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
        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="링크 이름"
            maxLength={20}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          />
        </div>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder="메모"
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

      {/* Time + Link row: time on the left, link button on the right */}
      {(() => {
        const hasTime = candidate.start_time || candidate.end_time;
        const link = getLink(candidate.meta);
        const hasLink = Boolean(link.url);
        if (!hasTime && !hasLink) return null;
        return (
          <div className="mb-2 flex items-center gap-2">
            {hasTime && (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-mono text-neutral-700">
                <Clock className="h-3 w-3" />
                {formatTime(candidate.start_time)}
                {candidate.end_time ? ` ~ ${formatTime(candidate.end_time)}` : ""}
              </div>
            )}
            {hasLink && link.url && (
              <a
                href={normalizeHref(link.url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto inline-flex max-w-[60%] items-center gap-1 truncate rounded-md bg-ocean-50 px-2 py-1 text-[11px] font-semibold text-ocean-700 ring-1 ring-ocean-200 transition hover:bg-ocean-100"
                title={link.url}
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{link.label || "링크"}</span>
              </a>
            )}
          </div>
        );
      })()}

      {/* Description */}
      {candidate.description && (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-600 [overflow-wrap:anywhere]">
          {linkify(candidate.description)}
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
