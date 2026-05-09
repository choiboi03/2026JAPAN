export type CandidateType = "move" | "place" | "other";

export interface Trip {
  id: string;
  code: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  cover_color: string | null;
  created_at: string;
}

export interface Day {
  id: string;
  trip_id: string;
  date: string;
  position: number;
  title: string | null;
  created_at: string;
}

export interface Block {
  id: string;
  day_id: string;
  position: number;
  selected_candidate_id: string | null;
  created_at: string;
}

export interface Candidate {
  id: string;
  block_id: string;
  position: number;
  type: CandidateType;
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  meta: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  trip_id: string;
  day_id: string | null;
  block_id: string | null;
  storage_path: string;
  caption: string | null;
  uploader: string | null;
  taken_at: string;
  created_at: string;
}

export interface Participant {
  id: string;
  trip_id: string;
  name: string;
  color: string;
  joined_at: string;
}

export const CANDIDATE_TYPE_META: Record<
  CandidateType,
  {
    label: string;
    emoji: string;
    /** outer card surface: gradient + subtle ring + colored glow */
    card: string;
    /** when the candidate is the chosen one for its block */
    cardSelected: string;
    /** the type chip shown in the card header */
    chip: string;
    /** soft blurred blob in the card corner */
    blob: string;
    /** small pastel button used for "add candidate" */
    addButton: string;
  }
> = {
  move: {
    label: "이동",
    emoji: "🚆",
    card: "bg-gradient-to-br from-sky-100/85 via-white/80 to-white/70 ring-1 ring-sky-200/70 shadow-[0_14px_36px_-14px_rgba(14,165,233,0.45)]",
    cardSelected: "ring-2 ring-sky-400 shadow-[0_18px_40px_-12px_rgba(14,165,233,0.55)]",
    chip: "bg-white/70 text-sky-700 ring-1 ring-sky-200/80 backdrop-blur-sm",
    blob: "bg-sky-300",
    addButton: "bg-gradient-to-br from-sky-50 to-sky-100 text-sky-700 ring-1 ring-sky-200/80"
  },
  place: {
    label: "장소",
    emoji: "📍",
    card: "bg-gradient-to-br from-emerald-100/85 via-white/80 to-white/70 ring-1 ring-emerald-200/70 shadow-[0_14px_36px_-14px_rgba(16,185,129,0.45)]",
    cardSelected: "ring-2 ring-emerald-400 shadow-[0_18px_40px_-12px_rgba(16,185,129,0.55)]",
    chip: "bg-white/70 text-emerald-700 ring-1 ring-emerald-200/80 backdrop-blur-sm",
    blob: "bg-emerald-300",
    addButton: "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80"
  },
  other: {
    label: "기타",
    emoji: "✨",
    card: "bg-gradient-to-br from-amber-100/85 via-white/80 to-white/70 ring-1 ring-amber-200/70 shadow-[0_14px_36px_-14px_rgba(245,158,11,0.45)]",
    cardSelected: "ring-2 ring-amber-400 shadow-[0_18px_40px_-12px_rgba(245,158,11,0.55)]",
    chip: "bg-white/70 text-amber-700 ring-1 ring-amber-200/80 backdrop-blur-sm",
    blob: "bg-amber-300",
    addButton: "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 ring-1 ring-amber-200/80"
  }
};
