"use client";

import { motion } from "motion/react";

/**
 * Feature card with a spring hover lift + icon nudge. The card is fully visible
 * by default (no entrance opacity here — the surrounding CSS `.rise` handles
 * entrance), so Motion only enhances the hover interaction. `icon` is a rendered
 * element (not a component) so it serialises across the RSC boundary.
 */
export function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className="group h-full bg-surface p-7 transition-colors hover:bg-surface-2"
    >
      <motion.div
        whileHover={{ rotate: -8, scale: 1.08 }}
        transition={{ type: "spring", stiffness: 350, damping: 18 }}
        className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-line-strong bg-bg text-accent"
      >
        {icon}
      </motion.div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-dim">{body}</p>
    </motion.div>
  );
}
