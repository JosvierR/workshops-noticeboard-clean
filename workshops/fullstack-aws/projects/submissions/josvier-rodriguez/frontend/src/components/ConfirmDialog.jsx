import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { getMotionTransition, motionTokens } from "../utils/motion";

export default function ConfirmDialog({ notice, busy, onCancel, onConfirm }) {
  const cancelRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const open = Boolean(notice);

  useEffect(() => {
    if (!open) return undefined;

    const focusTimer = window.setTimeout(() => cancelRef.current?.focus(), 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleEscape(event) {
      if (event.key === "Escape" && !busy) onCancel();
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [busy, onCancel, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="overlay-backdrop confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getMotionTransition(reducedMotion, { duration: motionTokens.normal })}
        >
          <motion.section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
            transition={getMotionTransition(reducedMotion, motionTokens.spring)}
          >
            <span className="confirm-icon" aria-hidden="true">
              <AlertTriangle size={20} />
            </span>
            <h2 id="confirm-title">Delete notice?</h2>
            <p id="confirm-description">
              “{notice.title}” will be permanently removed.
            </p>
            <div className="confirm-actions">
              <button ref={cancelRef} className="secondary-button" type="button" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
              <button className="danger-button" type="button" onClick={onConfirm} disabled={busy}>
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
