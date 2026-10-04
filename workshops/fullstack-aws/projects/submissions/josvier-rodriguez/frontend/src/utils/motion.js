export const motionTokens = Object.freeze({
  fast: 0.16,
  normal: 0.24,
  slow: 0.36,
  ease: [0.22, 1, 0.36, 1],
  spring: {
    type: "spring",
    stiffness: 420,
    damping: 35,
    mass: 0.8,
  },
});

export function getMotionTransition(reducedMotion, transition = {}) {
  if (reducedMotion) return { duration: 0.01 };
  return transition;
}
