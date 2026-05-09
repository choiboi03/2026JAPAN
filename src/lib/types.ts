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
    /** colored 3px left-edge stripe class */
    stripe: string;
    /** when the candidate is the chosen one for its block */
    selectedRing: string;
    /** the small type chip shown in the card header */
    chip: string;
    /** small pastel button used for "add candidate" */
    addButton: string;
  }
> = {
  move: {
    label: "이동",
    emoji: "🚆",
    stripe: "border-sky-400",
    selectedRing: "ring-2 ring-sky-400 shadow-md shadow-sky-200/40",
    chip: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    addButton: "bg-sky-50 text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100"
  },
  place: {
    label: "장소",
    emoji: "📍",
    stripe: "border-emerald-400",
    selectedRing: "ring-2 ring-emerald-400 shadow-md shadow-emerald-200/40",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    addButton: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
  },
  other: {
    label: "기타",
    emoji: "✨",
    stripe: "border-amber-400",
    selectedRing: "ring-2 ring-amber-400 shadow-md shadow-amber-200/40",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    addButton: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
  }
};
