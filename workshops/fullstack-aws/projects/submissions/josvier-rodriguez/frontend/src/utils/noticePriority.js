import { calendarDayDifference, parseLocalDate } from "./dates.js";

export const PRIORITY = Object.freeze({
  OVERDUE: "OVERDUE",
  TODAY: "TODAY",
  SOON: "SOON",
  UPCOMING: "UPCOMING",
  NO_DATE: "NO_DATE",
});

const PRIORITY_RANK = {
  [PRIORITY.OVERDUE]: 0,
  [PRIORITY.TODAY]: 1,
  [PRIORITY.SOON]: 2,
  [PRIORITY.UPCOMING]: 3,
  [PRIORITY.NO_DATE]: 4,
};

export function getNoticePriority(notice, today = new Date()) {
  const dueDate = parseLocalDate(notice?.dueDate);
  const difference = dueDate
    ? calendarDayDifference(dueDate, today)
    : null;

  if (difference === null) return PRIORITY.NO_DATE;
  if (difference < 0) return PRIORITY.OVERDUE;
  if (difference === 0) return PRIORITY.TODAY;
  if (difference <= 3) return PRIORITY.SOON;
  return PRIORITY.UPCOMING;
}

export function isAttentionPriority(priority) {
  return (
    priority === PRIORITY.OVERDUE ||
    priority === PRIORITY.TODAY ||
    priority === PRIORITY.SOON
  );
}

// "This week" intentionally means today through the next seven local
// calendar days. Overdue notices are excluded from this filter.
export function isDueThisWeek(notice, today = new Date()) {
  const difference = calendarDayDifference(notice?.dueDate, today);
  return difference !== null && difference >= 0 && difference <= 7;
}

export function sortNotices(notices, today = new Date()) {
  return [...notices].sort((left, right) => {
    const pinDifference = Number(Boolean(right.pinned)) - Number(Boolean(left.pinned));
    if (pinDifference) return pinDifference;

    const leftPriority = getNoticePriority(left, today);
    const rightPriority = getNoticePriority(right, today);
    const rankDifference = PRIORITY_RANK[leftPriority] - PRIORITY_RANK[rightPriority];
    if (rankDifference) return rankDifference;

    if (leftPriority === PRIORITY.NO_DATE) {
      const leftCreated = Date.parse(left.createdAt || "") || 0;
      const rightCreated = Date.parse(right.createdAt || "") || 0;
      return rightCreated - leftCreated;
    }

    return (
      parseLocalDate(left.dueDate).getTime() -
      parseLocalDate(right.dueDate).getTime()
    );
  });
}

export function getPulseCounts(notices, today = new Date()) {
  return notices.reduce(
    (counts, notice) => {
      const priority = getNoticePriority(notice, today);
      counts[priority] += 1;
      if (isAttentionPriority(priority)) counts.attention += 1;
      if (notice.pinned) counts.pinned += 1;
      return counts;
    },
    {
      [PRIORITY.OVERDUE]: 0,
      [PRIORITY.TODAY]: 0,
      [PRIORITY.SOON]: 0,
      [PRIORITY.UPCOMING]: 0,
      [PRIORITY.NO_DATE]: 0,
      attention: 0,
      pinned: 0,
    },
  );
}
