import { Activity, CalendarDays, CheckCircle2, Clock3, Pin } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { getMotionTransition, motionTokens } from "../utils/motion";
import { getNoticePriority, isAttentionPriority, PRIORITY } from "../utils/noticePriority";
import NoticeCard from "./NoticeCard";

function PulseGroup({ title, description, icon: Icon, notices, busy, handlers, offset }) {
  const reducedMotion = useReducedMotion();
  if (!notices.length) return null;

  return (
    <motion.section
      className="pulse-group"
      layout={reducedMotion ? false : true}
      transition={getMotionTransition(reducedMotion, motionTokens.spring)}
    >
      <div className="pulse-group-heading">
        <span className="pulse-group-icon" aria-hidden="true"><Icon size={17} /></span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className="group-count">{notices.length}</span>
      </div>
      <div className="notice-grid">
        <AnimatePresence mode="popLayout" initial>
          {notices.map((notice, index) => (
            <NoticeCard
              key={notice._id}
              notice={notice}
              busy={busy}
              index={offset + index}
              onEdit={handlers.onEdit}
              onDelete={handlers.onDelete}
              onTogglePin={handlers.onTogglePin}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

export default function TrainingPulse({ notices, counts, busy, handlers }) {
  const pinned = [];
  const attention = [];
  const upcoming = [];
  const noDate = [];

  for (const notice of notices) {
    const priority = getNoticePriority(notice);
    if (notice.pinned) pinned.push(notice);
    else if (isAttentionPriority(priority)) attention.push(notice);
    else if (priority === PRIORITY.UPCOMING) upcoming.push(notice);
    else noDate.push(notice);
  }

  return (
    <div className="training-pulse">
      <section className="pulse-summary" aria-labelledby="pulse-title">
        <div className="pulse-summary-copy">
          <span className="pulse-symbol" aria-hidden="true"><Activity size={19} /></span>
          <div>
            <p className="context-label">Training Pulse</p>
            <h2 id="pulse-title">
              {counts.attention
                ? `${counts.attention} ${counts.attention === 1 ? "thing needs" : "things need"} attention`
                : "You’re all caught up."}
            </h2>
            <p>
              {counts.attention
                ? "The most time-sensitive updates are ready for review."
                : "No urgent notices right now."}
            </p>
          </div>
        </div>
        <div className="pulse-breakdown" role="group" aria-label="Attention breakdown">
          <span><strong>{counts[PRIORITY.OVERDUE]}</strong> overdue</span>
          <span><strong>{counts[PRIORITY.TODAY]}</strong> today</span>
          <span><strong>{counts[PRIORITY.SOON]}</strong> soon</span>
        </div>
      </section>

      <div className="pulse-groups">
        <PulseGroup
          title="Pinned"
          description="Kept at the top for quick access."
          icon={Pin}
          notices={pinned}
          busy={busy}
          handlers={handlers}
          offset={0}
        />
        <PulseGroup
          title="Needs attention"
          description="Overdue or due within three days."
          icon={Clock3}
          notices={attention}
          busy={busy}
          handlers={handlers}
          offset={pinned.length}
        />
        <PulseGroup
          title="Upcoming"
          description="Deadlines beyond the immediate window."
          icon={CalendarDays}
          notices={upcoming}
          busy={busy}
          handlers={handlers}
          offset={pinned.length + attention.length}
        />
        <PulseGroup
          title="No deadline"
          description="Useful updates without a calendar date."
          icon={CheckCircle2}
          notices={noDate}
          busy={busy}
          handlers={handlers}
          offset={pinned.length + attention.length + upcoming.length}
        />
      </div>
    </div>
  );
}
