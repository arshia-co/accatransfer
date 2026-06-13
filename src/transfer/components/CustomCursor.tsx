import { useEffect, useRef, useState } from "react";

/**
 * Premium ACCA gold/champagne cursor.
 * - precise dot + soft trailing ring (lerp + rAF)
 * - magnetic-feel hover state on interactive elements
 * - quick gold ripple on click
 * - disabled on touch devices and when prefers-reduced-motion is set
 * - never blocks pointer events / native cursor on text inputs
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
    let dx = mx;
    let dy = my;
    let visible = false;
    let raf = 0;

    const interactiveSelector =
      'a, button, [role="button"], [data-cursor="hover"], summary, label, input[type="checkbox"], input[type="radio"], input[type="file"], input[type="submit"], input[type="button"], select';

    const setHover = (on: boolean) => {
      ring.classList.toggle("acca-cursor--hover", on);
      dot.classList.toggle("acca-cursor--hover", on);
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        layer.style.opacity = "1";
      }
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t) return setHover(false);
      const isInteractive = !!t.closest(interactiveSelector);
      setHover(isInteractive);
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

    const tick = () => {
      // Ring lerps softly behind, dot snaps closer to cursor
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dx += (mx - dx) * 0.5;
      dy += (my - dy) * 0.5;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.documentElement.classList.add("acca-cursor-active");
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.documentElement.classList.remove("acca-cursor-active");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="acca-cursor-layer pointer-events-none fixed inset-0 z-[9999] opacity-0 transition-opacity duration-200"
    >
      <div ref={ringRef} className="acca-cursor-ring" />
      <div ref={dotRef} className="acca-cursor-dot" />
    </div>
  );
}

export default CustomCursor;
