/**
 * Intro-call slot generation (PRD W-B: B3, W1a slice) — four concrete
 * options over the next two business days. W1b replaces this with real
 * facilitator availability; the shape (slot-pick, not a calendar widget)
 * is the durable UX decision. Pure logic for testability.
 */

export interface IntroSlot {
  /** ISO start time */
  startIso: string;
  /** e.g. "Tue 26" */
  dayLabel: string;
  /** e.g. "10:00 AM" */
  timeLabel: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function labelFor(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}`;
}

function at(d: Date, hours: number, minutes: number): Date {
  const copy = new Date(d);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

/** The next N business days (Mon–Fri), starting tomorrow. */
function nextBusinessDays(now: Date, count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date(now);
  while (days.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cursor));
  }
  return days;
}

/** Four slots: 10:00 AM and 2:30 PM on the next two business days. */
export function nextIntroSlots(now = new Date()): IntroSlot[] {
  const slots: IntroSlot[] = [];
  for (const day of nextBusinessDays(now, 2)) {
    for (const [h, m] of [
      [10, 0],
      [14, 30],
    ] as const) {
      const start = at(day, h, m);
      slots.push({
        startIso: start.toISOString(),
        dayLabel: labelFor(start),
        timeLabel: fmtTime(start),
      });
    }
  }
  return slots;
}
