import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { getMotionTransition, motionTokens } from "../utils/motion";

const EMPTY_FORM = {
  title: "",
  content: "",
  cohort: "",
  dueDate: "",
  pinned: false,
};

export default function NoticeComposer({ open, notice, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [mobileSheet, setMobileSheet] = useState(() =>
    window.matchMedia("(max-width: 700px)").matches,
  );
  const titleRef = useRef(null);
  const contentRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const updateMobileSheet = (event) => setMobileSheet(event.matches);
    query.addEventListener("change", updateMobileSheet);
    return () => query.removeEventListener("change", updateMobileSheet);
  }, []);

  useEffect(() => {
    if (!open) return;

    setForm(
      notice
        ? {
            title: notice.title || "",
            content: notice.content || "",
            cohort: notice.cohort || "",
            dueDate: notice.dueDate || "",
            pinned: Boolean(notice.pinned),
          }
        : EMPTY_FORM,
    );
    setErrors({});

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [notice, open]);

  useEffect(() => {
    if (!open) return undefined;

    function handleEscape(event) {
      if (event.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [busy, onClose, open]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: "" }));
    }
  }

  async function submit(event) {
    event.preventDefault();
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = "Add a title.";
    if (!form.content.trim()) nextErrors.content = "Add a message.";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      if (nextErrors.title) titleRef.current?.focus();
      else contentRef.current?.focus();
      return;
    }

    try {
      await onSubmit({
        title: form.title.trim(),
        content: form.content.trim(),
        cohort: form.cohort.trim(),
        dueDate: form.dueDate,
        pinned: form.pinned,
      });
    } catch {
      // The parent shows request feedback; form values stay available to retry.
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="overlay-backdrop composer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getMotionTransition(reducedMotion, {
            duration: motionTokens.normal,
          })}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !busy) onClose();
          }}
        >
          <motion.section
            className="composer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-title"
            initial={
              reducedMotion
                ? { opacity: 0 }
                : mobileSheet
                  ? { opacity: 1, y: "100%" }
                  : { opacity: 0, scale: 0.98, y: 8 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              reducedMotion
                ? { opacity: 0 }
                : mobileSheet
                  ? { opacity: 1, y: "100%" }
                  : { opacity: 0, scale: 0.98, y: 8 }
            }
            transition={getMotionTransition(reducedMotion, motionTokens.spring)}
          >
            <div className="composer-header">
              <div>
                <p className="context-label">{notice ? "Edit notice" : "New notice"}</p>
                <h2 id="composer-title">
                  {notice ? "Keep everyone aligned." : "Share what matters next."}
                </h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close composer"
              >
                <X size={19} />
              </button>
            </div>

            <form className="composer-form" onSubmit={submit} noValidate>
              <label className="form-field">
                <span>Title</span>
                <input
                  ref={titleRef}
                  maxLength={120}
                  placeholder="AWS architecture workshop"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  disabled={busy}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "title-error" : undefined}
                  autoFocus
                />
                <span className="field-feedback">
                  {errors.title ? <span id="title-error" className="field-error">{errors.title}</span> : <span />}
                  {form.title.length >= 100 ? <span>{form.title.length}/120</span> : null}
                </span>
              </label>

              <label className="form-field">
                <span>Message</span>
                <textarea
                  ref={contentRef}
                  maxLength={5000}
                  rows={6}
                  placeholder="Add the update, deadline, or next step."
                  value={form.content}
                  onChange={(event) => update("content", event.target.value)}
                  disabled={busy}
                  aria-invalid={Boolean(errors.content)}
                  aria-describedby={errors.content ? "content-error" : undefined}
                />
                <span className="field-feedback">
                  {errors.content ? <span id="content-error" className="field-error">{errors.content}</span> : <span />}
                  {form.content.length >= 4500 ? <span>{form.content.length}/5000</span> : null}
                </span>
              </label>

              <div className="form-grid">
                <label className="form-field">
                  <span>Cohort</span>
                  <input
                    maxLength={120}
                    placeholder="Full-Stack AWS"
                    value={form.cohort}
                    onChange={(event) => update("cohort", event.target.value)}
                    disabled={busy}
                  />
                </label>
                <label className="form-field">
                  <span>Due date</span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => update("dueDate", event.target.value)}
                    disabled={busy}
                  />
                </label>
              </div>

              <label className="pin-control">
                <span className="pin-control-copy">
                  <strong>Pin this update</strong>
                  <small>Keep it at the top of the board.</small>
                </span>
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(event) => update("pinned", event.target.checked)}
                  disabled={busy}
                />
                <span className="switch-track" aria-hidden="true">
                  <span className="switch-thumb">
                    {form.pinned ? <Check size={11} strokeWidth={2.5} /> : null}
                  </span>
                </span>
              </label>

              <div className="composer-actions">
                <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>
                  Cancel
                </button>
                <button className="primary-button" type="submit" disabled={busy}>
                  {busy ? "Saving…" : notice ? "Save changes" : "Publish notice"}
                </button>
              </div>
            </form>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
