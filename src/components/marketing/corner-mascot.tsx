/**
 * A small idle "companion" mascot that rests in the bottom-right corner of the
 * viewport and loops its own pixel-art idle animation — similar to the Claude
 * Code mascot. Fixed and pointer-events-none so it never blocks clicks or
 * disrupts page layout/scroll. The looping motion lives in the GIF itself.
 */
export function CornerMascot() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-3 right-3 z-40 sm:bottom-5 sm:right-5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF; next/image would freeze it */}
      <img
        src="/brand/mascot.gif"
        alt=""
        width={112}
        height={112}
        className="h-auto w-24 drop-shadow-[0_12px_22px_rgba(0,0,0,0.45)] sm:w-28"
      />
    </div>
  );
}
