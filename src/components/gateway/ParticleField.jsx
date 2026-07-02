import { useEffect, useRef } from 'react';

/* ============================================================================
 * ParticleField — an original, brand-aligned 3D particle constellation.
 *
 * A rotating point-cloud is projected to 2D on a canvas, linked by a faint
 * "web", and gently follows the pointer (eased) for a premium, futuristic feel.
 * Fully responsive (ResizeObserver + DPR), theme-aware (ACCA navy / cream /
 * gold), cheap enough for mobile (particle count scales down, motion honours
 * prefers-reduced-motion), and non-interactive (pointer-events: none) so it
 * never steals clicks from the gateway.
 *
 * This is a from-scratch implementation — not a port of any third-party code.
 * ========================================================================== */

const THEMES = {
  dark: {
    node: [238, 245, 255],
    accent: [206, 174, 108],
    line: [188, 210, 245],
    lineAccent: [206, 174, 108],
    lineAlpha: 0.5,
    nodeAlpha: 0.9,
  },
  light: {
    node: [14, 34, 68],
    accent: [150, 108, 46],
    line: [30, 54, 96],
    lineAccent: [168, 122, 52],
    lineAlpha: 0.32,
    nodeAlpha: 0.85,
  },
};

function rgba([r, g, b], a) {
  return `rgba(${r},${g},${b},${a})`;
}

export default function ParticleField({ theme = 'dark', className = '' }) {
  const canvasRef = useRef(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return undefined;

    const parent = canvas.parentElement || canvas;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const coarse =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let raf = 0;

    // Eased rotation + pointer state.
    const rot = { x: -0.12, y: 0, tx: -0.12, ty: 0 };
    const pointer = { x: 0, y: 0, active: false };

    function buildParticles() {
      const area = width * height;
      // ~1 particle / 12k px², clamped; fewer on small / touch screens.
      let count = Math.round(area / 12000);
      count = Math.max(34, Math.min(coarse ? 60 : 104, count));
      particles = Array.from({ length: count }, (_, i) => {
        // Flattened ellipsoid cloud (wider than tall) for a "sculpture" read.
        const u = Math.random();
        const v = Math.random();
        const azim = u * Math.PI * 2;
        const polar = Math.acos(2 * v - 1);
        const rad = 0.55 + Math.random() * 0.45; // shell + fill
        return {
          x: Math.cos(azim) * Math.sin(polar) * rad * 1.32,
          y: Math.cos(polar) * rad * 0.72,
          z: Math.sin(azim) * Math.sin(polar) * rad * 1.05,
          size: 0.6 + Math.random() * 1.7,
          phase: Math.random() * Math.PI * 2,
          drift: 0.4 + Math.random() * 0.8,
          accent: i % 8 === 0, // ~12% gold accents
        };
      });
    }

    function resize() {
      // The <canvas> element is sized by CSS (100% of the ambient layer). Read
      // that computed size back for the backing store instead of writing inline
      // width/height — writing an early/zero value would otherwise lock the
      // element's box and CSS could not recover it.
      width = canvas.clientWidth || parent.clientWidth || window.innerWidth;
      height = canvas.clientHeight || parent.clientHeight || window.innerHeight;
      if (width < 2 || height < 2) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
    }

    function projectAll(t) {
      const cx = width / 2;
      const cy = height * 0.46;
      const spread = Math.min(width, height) * 0.46;
      const focal = 2.35;
      const cosY = Math.cos(rot.y);
      const sinY = Math.sin(rot.y);
      const cosX = Math.cos(rot.x);
      const sinX = Math.sin(rot.x);
      const out = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const bob = reduceMotion ? 0 : Math.sin(t * 0.0006 * p.drift + p.phase) * 0.04;
        let x = p.x;
        let y = p.y + bob;
        let z = p.z;
        // Rotate around Y then X.
        let x1 = x * cosY - z * sinY;
        let z1 = x * sinY + z * cosY;
        let y1 = y * cosX - z1 * sinX;
        let z2 = y * sinX + z1 * cosX;
        const scale = focal / (focal - z2);
        out.push({
          sx: cx + x1 * scale * spread,
          sy: cy + y1 * scale * spread,
          depth: scale, // ~[0.7 .. 1.4]
          size: p.size,
          accent: p.accent,
        });
      }
      return out;
    }

    function renderFrame(t) {
      const palette = THEMES[themeRef.current] || THEMES.dark;

      // Ease rotation toward auto-spin + pointer target.
      if (!reduceMotion) rot.ty += 0.0016;
      const targetY = rot.ty + (pointer.active ? pointer.x * 0.5 : 0);
      const targetX = -0.12 + (pointer.active ? -pointer.y * 0.32 : 0);
      rot.y += (targetY - rot.y) * 0.055;
      rot.x += (targetX - rot.x) * 0.055;

      const pts = projectAll(t);
      ctx.clearRect(0, 0, width, height);

      // Connective web.
      const maxDist = Math.min(width, height) * 0.15;
      const maxDistSq = maxDist * maxDist;
      ctx.lineWidth = 1;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        let links = 0;
        for (let j = i + 1; j < pts.length && links < 6; j++) {
          const b = pts[j];
          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const dsq = dx * dx + dy * dy;
          if (dsq > maxDistSq) continue;
          links++;
          const closeness = 1 - Math.sqrt(dsq) / maxDist;
          const depth = (a.depth + b.depth) * 0.5;
          const alpha = closeness * palette.lineAlpha * (depth - 0.55);
          if (alpha <= 0.008) continue;
          const gold = a.accent || b.accent;
          ctx.strokeStyle = rgba(gold ? palette.lineAccent : palette.line, alpha);
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        }
      }

      // Nodes (back-to-front-ish; small glow on accents).
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const depth = Math.max(0.4, (p.depth - 0.6) * 1.6);
        const r = p.size * p.depth;
        const base = p.accent ? palette.accent : palette.node;
        if (p.accent) {
          const glow = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 5);
          glow.addColorStop(0, rgba(base, 0.32 * depth));
          glow.addColorStop(1, rgba(base, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba(base, palette.nodeAlpha * depth);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick(t) {
      renderFrame(t);
      raf = window.requestAnimationFrame(tick);
    }

    function onPointerMove(e) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.active = true;
    }
    function onPointerLeave() {
      pointer.active = false;
    }
    function onVisibility() {
      if (document.hidden) {
        if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
      } else if (!raf && !reduceMotion) {
        raf = window.requestAnimationFrame(tick);
      }
    }

    const draw = () => {
      renderFrame(performance.now()); // immediate static frame (works even when throttled)
      if (!reduceMotion && !document.hidden && !raf) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => { resize(); renderFrame(performance.now()); })
      : null;
    ro?.observe(parent);
    ro?.observe(canvas);
    window.addEventListener('resize', resize);
    // Re-measure once after first paint in case layout wasn't ready on mount.
    const initRaf = window.requestAnimationFrame(() => { resize(); draw(); });

    if (!coarse) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerout', onPointerLeave);
    }
    document.addEventListener('visibilitychange', onVisibility);

    draw();

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.cancelAnimationFrame(initRaf);
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={`gateway-particles ${className}`} aria-hidden="true" />;
}
