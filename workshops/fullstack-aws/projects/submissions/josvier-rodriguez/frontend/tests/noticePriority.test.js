import assert from "node:assert/strict";
import test from "node:test";

import { calendarDayDifference, humanizeDueDate, parseLocalDate } from "../src/utils/dates.js";
import {
  getNoticePriority,
  isDueThisWeek,
  PRIORITY,
  sortNotices,
} from "../src/utils/noticePriority.js";

const TODAY = new Date(2026, 9, 4, 23, 30);

test("classifies overdue, today, soon, upcoming, no date, and invalid dates", () => {
  assert.equal(getNoticePriority({ dueDate: "2026-10-03" }, TODAY), PRIORITY.OVERDUE);
  assert.equal(getNoticePriority({ dueDate: "2026-10-04" }, TODAY), PRIORITY.TODAY);
  assert.equal(getNoticePriority({ dueDate: "2026-10-07" }, TODAY), PRIORITY.SOON);
  assert.equal(getNoticePriority({ dueDate: "2026-10-08" }, TODAY), PRIORITY.UPCOMING);
  assert.equal(getNoticePriority({}, TODAY), PRIORITY.NO_DATE);
  assert.equal(getNoticePriority({ dueDate: "2026-02-30" }, TODAY), PRIORITY.NO_DATE);
});

test("pinned notices sort first, followed by priority and earliest due date", () => {
  const notices = [
    { _id: "upcoming", dueDate: "2026-10-12", pinned: false },
    { _id: "soon-later", dueDate: "2026-10-07", pinned: false },
    { _id: "overdue", dueDate: "2026-10-03", pinned: false },
    { _id: "pinned", dueDate: "2026-11-01", pinned: true },
    { _id: "soon-earlier", dueDate: "2026-10-05", pinned: false },
  ];

  assert.deepEqual(
    sortNotices(notices, TODAY).map((notice) => notice._id),
    ["pinned", "overdue", "soon-earlier", "soon-later", "upcoming"],
  );
});

test("no-date notices use newest createdAt first", () => {
  const notices = [
    { _id: "older", createdAt: "2026-10-01T10:00:00Z" },
    { _id: "newer", createdAt: "2026-10-03T10:00:00Z" },
  ];

  assert.deepEqual(
    sortNotices(notices, TODAY).map((notice) => notice._id),
    ["newer", "older"],
  );
});

test("calendar math is local-date based and unaffected by time of day", () => {
  assert.equal(calendarDayDifference("2026-10-05", TODAY), 1);
  assert.equal(getNoticePriority({ dueDate: "2026-10-04" }, TODAY), PRIORITY.TODAY);
  assert.equal(humanizeDueDate("2026-10-03", TODAY), "Overdue by 1 day");
});

test("this week includes today through seven days and excludes overdue", () => {
  assert.equal(isDueThisWeek({ dueDate: "2026-10-03" }, TODAY), false);
  assert.equal(isDueThisWeek({ dueDate: "2026-10-04" }, TODAY), true);
  assert.equal(isDueThisWeek({ dueDate: "2026-10-11" }, TODAY), true);
  assert.equal(isDueThisWeek({ dueDate: "2026-10-12" }, TODAY), false);
});

test("local parser rejects impossible dates instead of rolling them forward", () => {
  assert.equal(parseLocalDate("2026-02-30"), null);
  assert.equal(parseLocalDate("2026-10-04")?.getDate(), 4);
});
