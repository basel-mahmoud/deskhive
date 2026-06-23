"use client";

import { useEffect, useRef } from "react";

/**
 * The DeskHive mascot strolling back and forth along the top edge of the inbox
 * card, facing its direction of travel. The sprite sheet has 32 frames: 0–15
 * face right, 16–31 face left. A small ticker advances the character animation
 * and walks it across the card — moving right it plays the right-facing frames,
 * moving left the left-facing frames, with a brief turn-around pause at each end.
 * Anchored to the card-hugging wrapper, pointer-events-none, reduced-motion aware.
 */
const NF = 16; // frames per direction
const FW = 104; // displayed frame size (px)
const SHEET = 32 * FW; // displayed sheet width
const TICK = 140; // ms per animation frame
const CROSS_TICKS = 60; // ticks to cross the card (~8.4s)
const PAUSE_TICKS = 5; // brief idle/turn pause at each end

export function InboxWalker() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.left = "6px";
      el.style.backgroundPositionX = "0px"; // frame 0, facing right
      return;
    }

    let dir = 1; // 1 = walking right (frames 0–15), -1 = walking left (frames 16–31)
    let frame = 0;
    let pos = 6;
    let pause = 0;
    const minPos = 6;
    const maxPos = () =>
      Math.max(minPos, (el.parentElement?.clientWidth ?? 360) - FW - 6);

    const draw = () => {
      const off = dir === 1 ? 0 : NF;
      el.style.backgroundPositionX = `-${(off + frame) * FW}px`;
      el.style.left = `${pos}px`;
    };
    draw();

    const id = window.setInterval(() => {
      frame = (frame + 1) % NF;
      if (pause > 0) {
        pause--;
        draw();
        return;
      }
      const max = maxPos();
      pos += dir * ((max - minPos) / CROSS_TICKS);
      if (dir === 1 && pos >= max) {
        pos = max;
        dir = -1;
        pause = PAUSE_TICKS;
      } else if (dir === -1 && pos <= minPos) {
        pos = minPos;
        dir = 1;
        pause = PAUSE_TICKS;
      }
      draw();
    }, TICK);

    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <div ref={ref} aria-hidden className="dh-walk pointer-events-none" />
      <style>{`
        .dh-walk {
          position: absolute;
          z-index: 20;
          top: -97px;
          left: 6px;
          width: ${FW}px;
          height: ${FW}px;
          background: url(/brand/mascot-walk.png) 0 0 / ${SHEET}px ${FW}px no-repeat;
          filter: drop-shadow(0 8px 10px rgba(0,0,0,0.4));
        }
      `}</style>
    </>
  );
}
