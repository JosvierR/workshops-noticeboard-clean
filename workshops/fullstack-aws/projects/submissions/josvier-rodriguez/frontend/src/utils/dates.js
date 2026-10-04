const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function parseLocalDate(value) {
  if (typeof value !== "string") return null;

  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function startOfLocalDay(value = new Date()) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function calendarSerial(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calendarDayDifference(value, from = new Date()) {
  const date = value instanceof Date ? value : parseLocalDate(value);
  if (!date || Number.isNaN(date.getTime())) return null;

  return Math.round(
    (calendarSerial(date) - calendarSerial(startOfLocalDay(from))) / DAY_MS,
  );
}

export function formatExactDate(value) {
  const date = parseLocalDate(value);
  if (!date) return "No deadline";

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function humanizeDueDate(value, today = new Date()) {
  const date = parseLocalDate(value);
  const difference = calendarDayDifference(date, today);

  if (difference === null) return "No deadline";
  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  if (difference > 1 && difference <= 3) return `In ${difference} days`;
  if (difference === -1) return "Overdue by 1 day";
  if (difference < -1) return `Overdue by ${Math.abs(difference)} days`;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getTimeGreeting(value = new Date()) {
  const hour = value.getHours();
  if (hour < 12) return "Good morning.";
  if (hour < 18) return "Good afternoon.";
  return "Good evening.";
}
