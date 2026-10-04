import { SearchX } from "lucide-react";

export default function EmptyState({ type, onAction }) {
  const content = {
    data: {
      title: "Your board is clear.",
      message: "Create the first update for your cohort.",
      action: "Create notice",
    },
    search: {
      title: "No notices match your search.",
      message: "Try a different phrase or clear the current search.",
      action: "Clear search",
    },
    filter: {
      title: "Nothing needs attention right now.",
      message: "Your current view has no matching notices.",
      action: "Show all",
    },
  }[type];

  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <SearchX size={21} strokeWidth={1.7} />
      </span>
      <h3>{content.title}</h3>
      <p>{content.message}</p>
      <button className="secondary-button" type="button" onClick={onAction}>
        {content.action}
      </button>
    </div>
  );
}
