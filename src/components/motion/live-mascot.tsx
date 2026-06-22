"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/lib/utils";

/**
 * The DeskHive support-bee mascot, rendered as a transparent cutout and brought
 * to life with Motion: a continuous hover float, a cursor-reactive 3D tilt
 * (parallax), and a pulsing thruster/aura glow. Reduced-motion aware.
 */
export function LiveMascot({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0); // -0.5..0.5 cursor X
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-16, 16]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [12, -12]), {
    stiffness: 120,
    damping: 18,
  });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [px, py, reduce]);

  return (
    <div
      className={cn("relative select-none", className)}
      style={{ perspective: 900 }}
    >
      <motion.div
        className="relative"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={reduce ? undefined : { y: [0, -16, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* aura / thruster glow */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 -z-10 rounded-full bg-accent blur-3xl"
          style={{
            width: "78%",
            height: "70%",
            translateX: "-50%",
            translateY: "-42%",
          }}
          animate={
            reduce ? { opacity: 0.3 } : { opacity: [0.22, 0.4, 0.22], scale: [1, 1.08, 1] }
          }
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <Image
          src="/brand/mascot.png"
          alt="DeskHive support mascot"
          width={606}
          height={730}
          priority
          className="h-auto w-full drop-shadow-[0_24px_45px_rgba(0,0,0,0.55)]"
        />
      </motion.div>

      {/* soft contact shadow on the ground */}
      <motion.div
        aria-hidden
        className="mx-auto mt-1 h-3 rounded-[100%] bg-black/40 blur-md"
        style={{ width: "55%" }}
        animate={reduce ? undefined : { scaleX: [1, 0.86, 1], opacity: [0.4, 0.28, 0.4] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
