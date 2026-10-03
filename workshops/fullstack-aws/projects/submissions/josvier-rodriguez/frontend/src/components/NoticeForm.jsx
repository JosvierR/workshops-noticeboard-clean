import { useEffect, useState } from "react";

const EMPTY_FORM = {
  title: "",
  content: "",
  cohort: "",
  dueDate: "",
};

export default function NoticeForm({ notice, busy, onCancel, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(
      notice
        ? {
            title: notice.title || "",
            content: notice.content || "",
            cohort: notice.cohort || "",
            dueDate: notice.dueDate || "",
          }
        : EMPTY_FORM,
    );
    setError("");
  }, [notice]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      cohort: form.cohort.trim(),
      dueDate: form.dueDate,
    };

    if (!payload.title || !payload.content) {
      setError("Title and content are required.");
      return;
    }

    setError("");

    try {
      await onSubmit(payload);
      if (!notice) setForm(EMPTY_FORM);
    } catch {
      // Parent owns request errors; preserve user input for retry.
    }
  }

  return (
    <form className="notice-form" onSubmit={submit}>
      <div className="form-heading">
        <div>
          <p className="eyebrow">{notice ? "Edit notice" : "New notice"}</p>
          <h2>{notice ? "Update announcement" : "Publish an announcement"}</h2>
        </div>

        {notice ? (
          <button className="text-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>

      <label>
        <span>Title</span>
        <input
          maxLength={120}
          placeholder="Example: Week 2 AWS workshop"
          value={form.title}
          onChange={(event) => update("title", event.target.value)}
          disabled={busy}
        />
      </label>

      <label>
        <span>Message</span>
        <textarea
          maxLength={5000}
          rows={6}
          placeholder="Share the update, task, or training plan..."
          value={form.content}
          onChange={(event) => update("content", event.target.value)}
          disabled={busy}
        />
      </label>

      <div className="form-grid">
        <label>
          <span>Cohort</span>
          <input
            maxLength={120}
            placeholder="Full-Stack AWS"
            value={form.cohort}
            onChange={(event) => update("cohort", event.target.value)}
            disabled={busy}
          />
        </label>

        <label>
          <span>Due date</span>
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) => update("dueDate", event.target.value)}
            disabled={busy}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-button" type="submit" disabled={busy}>
        {busy ? "Saving..." : notice ? "Save changes" : "Publish notice"}
      </button>
    </form>
  );
}
