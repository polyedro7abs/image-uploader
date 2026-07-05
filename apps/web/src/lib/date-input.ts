export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export function defaultScheduleTime(day: Date): Date {
  const now = new Date();
  const isToday =
    day.getFullYear() === now.getFullYear() &&
    day.getMonth() === now.getMonth() &&
    day.getDate() === now.getDate();

  if (isToday) {
    const next = new Date(now.getTime() + 5 * 60 * 1000);
    next.setSeconds(0, 0);
    return next;
  }

  const atNine = new Date(day);
  atNine.setHours(9, 0, 0, 0);
  return atNine;
}
