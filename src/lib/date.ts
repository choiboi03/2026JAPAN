export function formatDateKo(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input + (input.length === 10 ? "T00:00:00" : "")) : input;
  if (isNaN(d.getTime())) return String(input);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function eachDay(startISO: string, endISO: string): string[] {
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function formatTime(t: string | null): string {
  if (!t) return "";
  // Postgres time may be HH:MM:SS
  return t.length >= 5 ? t.slice(0, 5) : t;
}
