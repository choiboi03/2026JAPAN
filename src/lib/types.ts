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
  { label: string; emoji: string; color: string; ring: string; chip: string }
> = {
  move: {
    label: "이동",
    emoji: "🚆",
    color: "bg-sky-50 border-sky-200",
    ring: "ring-sky-300",
    chip: "bg-sky-100 text-sky-700"
  },
  place: {
    label: "장소",
    emoji: "📍",
    color: "bg-emerald-50 border-emerald-200",
    ring: "ring-emerald-300",
    chip: "bg-emerald-100 text-emerald-700"
  },
  other: {
    label: "기타",
    emoji: "✨",
    color: "bg-amber-50 border-amber-200",
    ring: "ring-amber-300",
    chip: "bg-amber-100 text-amber-700"
  }
};
