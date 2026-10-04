import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { formatExactDate, humanizeDueDate } from "../utils/dates";
import { getMotionTransition, motionTokens } from "../utils/motion";
import { getNoticePriority, PRIORITY } from "../utils/noticePriority";

const PRIORITY_LABELS = {
  [PRIORITY.OVERDUE]: "Overdue",
  [PRIORITY.TODAY]: "Today",
  [PRIORITY.SOON]: "Due soon",
  [PRIORITY.UPCOMING]: "Upcoming",
  [PRIORITY.NO_DATE]: "No deadline",
};

export default function NoticeCard({
  notice,
  busy,
  index = 0,
  onDelete,
  onEdit,
  onTogglePin,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const priority = getNoticePriority(notice);
  const dueLabel = humanizeDueDate(notice.dueDate);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function dismissMenu(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }

      if (event.type === "pointerdown" && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", dismissMenu);
    document.addEventListener("keydown", dismissMenu);
    return () => {
      document.removeEventListener("pointerdown", dismissMenu);
      document.removeEventListener("keydown", dismissMenu);
    };
  }, [menuOpen]);

  function chooseAction(action) {
    setMenuOpen(false);
    action();
  }

  return (
    <motion.article
      layout={reducedMotion ? false : "position"}
      className={`notice-card priority-${priority.toLowerCase()}`}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
      transition={getMotionTransition(reducedMotion, {
        ...motionTokens.spring,
        delay: Math.min(index, 6) * 0.055,
      })}
    >
      <div className="notice-card-header">
        <div className="notice-badges">
          {notice.pinned ? <span className="status-badge badge-pinned">Pinned</span> : null}
          {priority !== PRIORITY.UPCOMING && priority !== PRIORITY.NO_DATE ? (
            <span className={`status-badge badge-${priority.toLowerCase()}`}>
              {priority === PRIORITY.SOON ? dueLabel : PRIORITY_LABELS[priority]}
            </span>
          ) : null}
        </div>
        <span className="cohort-label">{notice.cohort || "All cohorts"}</span>
      </div>

      <div className="notice-card-body">
        <h3>{notice.title}</h3>
        <p className={expanded ? "notice-content is-expanded" : "notice-content"}>
          {notice.content}
        </p>
        {notice.content?.length > 260 ? (
          <button
            className="show-more-button"
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </div>

      <div className="notice-card-footer">
        <span
          className="due-metadata"
          title={notice.dueDate ? `Due ${formatExactDate(notice.dueDate)}` : "No deadline"}
        >
          <CalendarDays aria-hidden="true" size={15} strokeWidth={1.8} />
          {dueLabel}
        </span>

        <div className="notice-menu-wrap" ref={menuRef}>
          <button
            className="icon-button notice-menu-trigger"
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            disabled={busy}
            aria-label={`Actions for ${notice.title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal aria-hidden="true" size={19} />
          </button>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                className="notice-menu"
                role="menu"
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -2 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -2 }}
                transition={getMotionTransition(reducedMotion, {
                  duration: motionTokens.fast,
                  ease: motionTokens.ease,
                })}
              >
                <button role="menuitem" type="button" onClick={() => chooseAction(() => onEdit(notice))}>
                  <Pencil aria-hidden="true" size={16} />
                  Edit
                </button>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => chooseAction(() => onTogglePin(notice))}
                >
                  {notice.pinned ? (
                    <PinOff aria-hidden="true" size={16} />
                  ) : (
                    <Pin aria-hidden="true" size={16} />
                  )}
                  {notice.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  className="menu-danger"
                  role="menuitem"
                  type="button"
                  onClick={() => chooseAction(() => onDelete(notice))}
                >
                  <Trash2 aria-hidden="true" size={16} />
                  Delete
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
