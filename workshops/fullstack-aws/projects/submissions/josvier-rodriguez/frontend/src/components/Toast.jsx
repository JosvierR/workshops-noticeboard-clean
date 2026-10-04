import { AlertCircle, Check, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { getMotionTransition, motionTokens } from "../utils/motion";

export default function Toast({ toast, onDismiss }) {
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          className={`toast toast-${toast.type || "success"}`}
          role={toast.type === "error" ? "alert" : "status"}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={getMotionTransition(reducedMotion, {
            duration: motionTokens.normal,
            ease: motionTokens.ease,
          })}
        >
          <span className="toast-icon" aria-hidden="true">
            {toast.type === "error" ? <AlertCircle size={17} /> : <Check size={17} />}
          </span>
          <span>{toast.message}</span>
          <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
            <X size={15} />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
