import { RefreshCw } from "lucide-react";

const FILTERS = [
  ["all", "All"],
  ["attention", "Needs attention"],
  ["week", "This week"],
  ["pinned", "Pinned"],
];

export default function NoticeFilters({
  statusFilter,
  onStatusChange,
  cohortFilter,
  onCohortChange,
  cohorts,
  onRefresh,
  refreshing,
}) {
  return (
    <div className="filter-bar" role="group" aria-label="Notice filters">
      <div className="filter-chips" role="group" aria-label="Status filter">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={statusFilter === value ? "filter-chip is-active" : "filter-chip"}
            aria-pressed={statusFilter === value}
            onClick={() => onStatusChange(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="filter-controls">
        <label className="cohort-filter">
          <span className="sr-only">Filter by cohort</span>
          <select
            value={cohortFilter}
            onChange={(event) => onCohortChange(event.target.value)}
          >
            <option value="all">All cohorts</option>
            {cohorts.map((cohort) => (
              <option key={cohort} value={cohort}>
                {cohort}
              </option>
            ))}
          </select>
        </label>
        <button
          className="icon-button refresh-button"
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label={refreshing ? "Refreshing notices" : "Refresh notices"}
        >
          <RefreshCw
            aria-hidden="true"
            className={refreshing ? "is-spinning" : ""}
            size={17}
          />
        </button>
      </div>
    </div>
  );
}
