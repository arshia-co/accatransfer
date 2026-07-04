import { useEffect, useRef, useState } from "react";

/**
 * ACCA gold cursor accent — a decorative ring that trails the pointer, plus a
 * click ripple.
 *
 * Design decision after real-device lag reports: the NATIVE cursor stays
 * visible. Any JS-drawn replacement is repainted on the main thread, so it
 * inevitably falls behind the OS-composited hardware cursor whenever the page
 * is busy (modal opening, OCR, dev-mode overhead). By keeping the real cursor
 * as the pointer and demoting the gold visuals to a trailing accent, input
 * precision is hardware-guaranteed and the ring is free to lag gracefully.
 *
 * Perf model: ring position/scale ride one composited transform written from
 * a rAF loop with frame-rate-independent smoothing; the loop parks itself
 * when converged and wakes on pointer events. Disabled on touch devices and
 * when prefers-reduced-motion is set.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

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
    const ring = ringRef.current;
    const layer = layerRef.current;
    if (!ring || !layer) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let ringScale = 1;
    let ringScaleT = 1;
    let hovered = false;
    let visible = false;
    let raf = 0;
    let lastT = 0;

    const interactiveSelector =
      'a, button, [role="button"], [data-cursor="hover"], summary, label, input[type="checkbox"], input[type="radio"], input[type="file"], input[type="submit"], input[type="button"], select';

    const drawRing = () => {
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${ringScale})`;
    };

    const tick = (t: number) => {
      const dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 1 / 60;
      lastT = t;

      // Exponential decay, frame-rate independent (same feel at 60/120/144Hz).
      const ringK = 1 - Math.pow(1 - 0.22, dt * 60);
      const scaleK = 1 - Math.pow(1 - 0.2, dt * 60);
      rx += (mx - rx) * ringK;
      ry += (my - ry) * ringK;
      ringScale += (ringScaleT - ringScale) * scaleK;

      drawRing();

      // Park the loop once converged — pointer events wake it.
      const converged =
        Math.abs(mx - rx) < 0.15 &&
        Math.abs(my - ry) < 0.15 &&
        Math.abs(ringScaleT - ringScale) < 0.005;
      if (converged) {
        rx = mx; ry = my;
        ringScale = ringScaleT;
        drawRing();
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
      wake();
    };

    const setHover = (on: boolean) => {
      if (hovered === on) return;
      hovered = on;
      ringScaleT = on ? 56 / 38 : 1;
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
    drawRing();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    // Zero-size layer: fading its opacity composites only the small ring and
    // ripples, not a viewport-sized surface.
    <div
      ref={layerRef}
      aria-hidden="true"
      className="acca-cursor-layer pointer-events-none fixed top-0 left-0 z-[9999] opacity-0 transition-opacity duration-200"
    >
      <div ref={ringRef} className="acca-cursor-ring" />
    </div>
  );
}

export default CustomCursor;
