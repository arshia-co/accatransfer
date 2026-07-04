import { useEffect, useRef, useState } from "react";

/**
 * Premium ACCA gold/champagne cursor — tuned for high-refresh displays.
 *
 * Performance model (the previous version felt laggy, this one must not):
 * - The DOT is written synchronously inside pointermove (zero added latency,
 *   no lerp) — it IS the pointer. Only the ring trails.
 * - The ring uses an exponential-decay lerp corrected by frame delta-time, so
 *   trailing feel is identical at 60Hz and 120Hz+.
 * - Hover grow/shrink is part of the same composited transform (scale), never
 *   width/height, so nothing ever touches layout.
 * - The rAF loop parks itself when the ring has converged and nothing is
 *   animating; any pointer event wakes it. Zero idle cost.
 * - No backdrop-filter anywhere in the cursor (see transfer.css).
 * - Disabled on touch devices and when prefers-reduced-motion is set.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

  // Decide once whether to mount visuals at all
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch =
      window.matchMedia("(hover: none), (pointer: coarse)").matches ||
      "ontouchstart" in window;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(!isTouch && !reduced);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const layer = layerRef.current;
    if (!dot || !ring || !layer) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    // Hover scale targets (ring grows, dot shrinks) — composited, not layout.
    let ringScale = 1;
    let dotScale = 1;
    let ringScaleT = 1;
    let dotScaleT = 1;
    let hovered = false;
    let visible = false;
    let raf = 0;
    let lastT = 0;

    const interactiveSelector =
      'a, button, [role="button"], [data-cursor="hover"], summary, label, input[type="checkbox"], input[type="radio"], input[type="file"], input[type="submit"], input[type="button"], select';

    const drawDot = () => {
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%) scale(${dotScale})`;
    };
    const drawRing = () => {
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${ringScale})`;
    };

    const tick = (t: number) => {
      const dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 1 / 60;
      lastT = t;

      // Exponential decay, frame-rate independent (~same feel at 60/120/144Hz).
      const ringK = 1 - Math.pow(1 - 0.16, dt * 60);
      const scaleK = 1 - Math.pow(1 - 0.2, dt * 60);
      rx += (mx - rx) * ringK;
      ry += (my - ry) * ringK;
      ringScale += (ringScaleT - ringScale) * scaleK;
      dotScale += (dotScaleT - dotScale) * scaleK;

      drawRing();
      drawDot();

      // Park the loop once everything has converged — pointer events wake it.
      const converged =
        Math.abs(mx - rx) < 0.15 &&
        Math.abs(my - ry) < 0.15 &&
        Math.abs(ringScaleT - ringScale) < 0.005 &&
        Math.abs(dotScaleT - dotScale) < 0.005;
      if (converged) {
        rx = mx; ry = my;
        ringScale = ringScaleT; dotScale = dotScaleT;
        drawRing(); drawDot();
        raf = 0;
        lastT = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        layer.style.opacity = "1";
      }
      // The dot IS the pointer: paint it right here, in the input event,
      // instead of waiting for the next animation frame.
      drawDot();
      wake();
    };

    const setHover = (on: boolean) => {
      if (hovered === on) return; // skip redundant class churn on boundary spam
      hovered = on;
      ringScaleT = on ? 56 / 38 : 1;
      dotScaleT = on ? 5 / 9 : 1;
      ring.classList.toggle("acca-cursor--hover", on);
      wake();
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as Element | null;
      setHover(!!t && !!t.closest(interactiveSelector));
    };

    const onLeave = () => {
      visible = false;
      layer.style.opacity = "0";
    };
    const onEnter = () => {
      visible = true;
      layer.style.opacity = "1";
    };

    const onDown = (e: MouseEvent) => {
      const ripple = document.createElement("span");
      ripple.className = "acca-cursor-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      layer.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.documentElement.classList.add("acca-cursor-active");
    drawDot();
    drawRing();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("acca-cursor-active");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    // Zero-size layer: fading its opacity composites only the tiny cursor
    // nodes, not a viewport-sized surface (the old `inset-0` did the latter).
    <div
      ref={layerRef}
      aria-hidden="true"
      className="acca-cursor-layer pointer-events-none fixed top-0 left-0 z-[9999] opacity-0 transition-opacity duration-200"
    >
      <div ref={ringRef} className="acca-cursor-ring" />
      <div ref={dotRef} className="acca-cursor-dot" />
    </div>
  );
}

export default CustomCursor;
