import { motion, useReducedMotion } from "motion/react";

import { getMotionTransition, motionTokens } from "../utils/motion";

export default function OverviewStats({ stats }) {
  const reducedMotion = useReducedMotion();
  const items = [
    [stats.active, "Active"],
    [stats.attention, "Needs attention"],
    [stats.cohorts, "Cohorts"],
    [stats.pinned, "Pinned"],
  ];

  return (
    <dl className="overview-stats" aria-label="Notice overview">
      {items.map(([value, label], index) => (
        <motion.div
          key={label}
          initial={reducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={getMotionTransition(reducedMotion, {
            duration: motionTokens.normal,
            delay: Math.min(index * 0.055, 0.18),
            ease: motionTokens.ease,
          })}
        >
          <dd>{value}</dd>
          <dt>{label}</dt>
        </motion.div>
      ))}
    </dl>
  );
}
