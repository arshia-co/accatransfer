import { useEffect, useRef, useState } from "react";

/**
 * Click ripple accent. The native OS cursor is the pointer (hardware-drawn,
 * can never lag) and, per design feedback, no ring trails it any more — the
 * only remaining flourish is a short gold ripple on click.
 * Disabled on touch devices and when prefers-reduced-motion is set.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
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
    const layer = layerRef.current;
    if (!layer) return;

    const onDown = (e: MouseEvent) => {
      const ripple = document.createElement("span");
      ripple.className = "acca-cursor-ripple";
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      layer.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    };

    window.addEventListener("mousedown", onDown, { passive: true });
    return () => window.removeEventListener("mousedown", onDown);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="acca-cursor-layer pointer-events-none fixed top-0 left-0 z-[9999]"
    />
  );
}

export default CustomCursor;
