/**
 * The DeskHive mascot strolling back and forth along the top edge of the inbox
 * card. The character's own animation (a 16-frame sprite sheet) loops the whole
 * time, while a separate slow keyframe walks it right→left→right with a pause at
 * each end (where it just idles in place). Absolutely positioned against the
 * card-hugging wrapper, pointer-events-none, reduced-motion aware.
 */
export function InboxWalker() {
  return (
    <>
      <div aria-hidden className="dh-walk pointer-events-none" />
      <style>{`
        .dh-walk {
          position: absolute;
          z-index: 20;
          top: -90px;
          left: 6px;
          width: 104px;
          height: 104px;
          background: url(/brand/mascot-walk.png) 0 0 / 1664px 104px no-repeat;
          filter: drop-shadow(0 8px 10px rgba(0,0,0,0.4));
          animation: dhFrames 2.6s steps(16) infinite, dhWalk 16s ease-in-out infinite;
        }
        @keyframes dhFrames { from { background-position-x: 0; } to { background-position-x: -1664px; } }
        @keyframes dhWalk {
          0%, 7%    { left: calc(100% - 110px); }
          47%, 57%  { left: 6px; }
          97%, 100% { left: calc(100% - 110px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dh-walk { animation: dhFrames 3.2s steps(16) infinite; left: calc(100% - 110px); }
        }
      `}</style>
    </>
  );
}
