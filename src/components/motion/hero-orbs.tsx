"use client";

import { motion } from "motion/react";

/**
 * Decorative, slowly drifting accent orbs behind the hero. Purely cosmetic and
 * pointer-events-none — if the animation never runs, they're just static blurs.
 */
const ORBS = [
  { x: "8%", y: "18%", size: 320, color: "var(--accent)", delay: 0, dur: 13 },
  { x: "70%", y: "8%", size: 260, color: "var(--info)", delay: 1.5, dur: 16 },
  { x: "55%", y: "55%", size: 200, color: "var(--success)", delay: 0.8, dur: 19 },
];

export function HeroOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          aria-hidden
          className="absolute rounded-full blur-[90px]"
          style={{
            left: o.x,
            top: o.y,
            width: o.size,
            height: o.size,
            background: o.color,
            opacity: 0.1,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 20, 0],
            scale: [1, 1.12, 0.95, 1],
          }}
          transition={{
            duration: o.dur,
            delay: o.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
