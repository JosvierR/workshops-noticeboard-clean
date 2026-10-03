function displayDate(value) {
  if (!value) return "No due date";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function NoticeCard({ notice, busy, onDelete, onEdit }) {
  return (
    <article className="notice-card">
      <div className="notice-card-top">
        <div>
          <span className="cohort-pill">{notice.cohort || "All trainees"}</span>
          <h3>{notice.title}</h3>
        </div>
        <span className="due-date">{displayDate(notice.dueDate)}</span>
      </div>

      <p>{notice.content}</p>

      <div className="notice-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={() => onEdit(notice)}
          disabled={busy}
        >
          Edit
        </button>
        <button
          className="danger-button"
          type="button"
          onClick={() => onDelete(notice)}
          disabled={busy}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
