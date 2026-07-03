import { useEffect, useRef } from 'react';

/* ============================================================================
 * ParticleField — free-floating "electron" particles with a magnetic cursor.
 *
 * Physics model (per-second units, dt-normalised so it is frame-rate safe):
 *   - Free drift: each particle wanders on smooth pseudo-noise, like charged
 *     dust floating in air.
 *   - Magnetic cursor: while the pointer is over the page it attracts every
 *     particle with a force that falls off with distance, so electrons drift
 *     slowly toward it from anywhere on screen.
 *   - Mutual repulsion: particles push each other apart (same-charge
 *     electrons), so they never clump — around the cursor they settle into a
 *     loose halo, and when the cursor leaves they spread back out.
 *   - Soft edges + damping + speed cap keep the motion calm and on-screen.
 *
 * Presentation: connective web between close particles, gold accent nodes with
 * a soft glow, depth (z) variation for parallax size/alpha. Theme-aware (ACCA
 * navy on cream / cream+gold on navy), responsive (ResizeObserver + DPR),
 * honours prefers-reduced-motion, pauses when the tab is hidden, and is
 * pointer-events:none so it never steals clicks.
 *
 * Original implementation — not a port of any third-party effect.
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

// Physics constants (px, seconds).
const FRICTION = 1.7;       // velocity damping, s⁻¹
const WANDER = 30;          // free-drift acceleration, px/s²
const ATTRACT = 16000;      // cursor magnet strength (falls off with distance)
const ATTRACT_CAP = 140;    // max pull acceleration, px/s²
const REPEL_RADIUS = 96;    // electrons repel inside this distance, px
const REPEL = 320;          // repulsion acceleration at zero distance, px/s²
const EDGE_MARGIN = 42;     // soft-wall thickness, px
const EDGE_PUSH = 5;        // soft-wall spring, s⁻²
const MAX_SPEED = 150;      // px/s, scaled by depth

// Shape-formation mode (hovering a service card): particles snap onto icon
// target points with a near-critically-damped spring, then burst free again.
const SHAPE_K = 42;          // spring stiffness toward target, s⁻²
const SHAPE_DAMP = 12;       // spring velocity damping, s⁻¹ (≈critical)
const SHAPE_MAX_SPEED = 950; // px/s while assembling, so it forms fast
const RELEASE_KICK = 340;    // px/s random impulse when the shape dissolves

// Icon outlines drawn on an offscreen canvas and sampled into target points.
// Path data mirrors the lucide icons used on the cards (24×24 viewBox):
// "smart" → bot, "transfer" → route.
const SHAPE_DEFS = {
  smart: (octx) => {
    octx.stroke(new Path2D('M12 8V4H8'));
    octx.stroke(new Path2D('M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z'));
    octx.stroke(new Path2D('M2 14h2'));
    octx.stroke(new Path2D('M20 14h2'));
    octx.stroke(new Path2D('M15 13v2'));
    octx.stroke(new Path2D('M9 13v2'));
  },
  transfer: (octx) => {
    octx.stroke(new Path2D('M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15'));
    octx.beginPath(); octx.arc(6, 19, 3, 0, Math.PI * 2); octx.stroke();
    octx.beginPath(); octx.arc(18, 5, 3, 0, Math.PI * 2); octx.stroke();
  },
};

function rgba([r, g, b], a) {
  return `rgba(${r},${g},${b},${a})`;
}

export default function ParticleField({ theme = 'dark', shape = null, className = '' }) {
  const canvasRef = useRef(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  // Which icon (if any) the swarm should currently assemble into.
  const shapeRef = useRef(shape);
  shapeRef.current = shape && SHAPE_DEFS[shape] ? shape : null;

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
    let lastT = 0;

    // Raw pointer target (canvas-local) + eased magnet position.
    const pointer = { tx: 0, ty: 0, active: false };
    const magnet = { x: 0, y: 0 };

    // ── Shape formation ────────────────────────────────────────────────────
    let activeShape = null; // currently assembled icon kind
    let shapeKey = '';      // kind + canvas size the assignment was built for
    const shapeCandidates = {}; // kind -> normalised [0..1] outline points

    function getShapeCandidates(kind) {
      if (shapeCandidates[kind]) return shapeCandidates[kind];
      const S = 340;
      const off = document.createElement('canvas');
      off.width = S; off.height = S;
      const octx = off.getContext('2d');
      if (!octx) return (shapeCandidates[kind] = []);
      octx.strokeStyle = '#fff';
      octx.lineWidth = 2.1;
      octx.lineCap = 'round';
      octx.lineJoin = 'round';
      octx.setTransform(S / 24, 0, 0, S / 24, 0, 0);
      SHAPE_DEFS[kind](octx);
      octx.setTransform(1, 0, 0, 1, 0, 0);
      const img = octx.getImageData(0, 0, S, S).data;
      const pts = [];
      for (let y = 0; y < S; y += 2) {
        for (let x = 0; x < S; x += 2) {
          if (img[(y * S + x) * 4 + 3] > 40) pts.push({ x: x / S, y: y / S });
        }
      }
      // Shuffle once so stepping through them samples the outline evenly.
      for (let i = pts.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      shapeCandidates[kind] = pts;
      return pts;
    }

    function assignShape(kind) {
      const cand = getShapeCandidates(kind);
      if (!cand.length || !particles.length) return;
      // Assemble in the open hero area (upper-centre), above the card glass.
      const box = Math.min(width, height) * 0.42;
      const ox = width / 2 - box / 2;
      const oy = height * 0.34 - box / 2;
      const stride = Math.max(1, Math.floor(cand.length / particles.length));
      const targets = [];
      for (let i = 0; i < cand.length && targets.length < particles.length; i += stride) {
        targets.push({ x: ox + cand[i].x * box, y: oy + cand[i].y * box });
      }
      // Greedy nearest-particle per target keeps flight paths short.
      const free = particles.slice();
      for (const t of targets) {
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < free.length; i++) {
          const p = free[i];
          const d = (p.x - t.x) * (p.x - t.x) + (p.y - t.y) * (p.y - t.y);
          if (d < bestD) { bestD = d; best = i; }
        }
        const p = free.splice(best, 1)[0];
        p.tx = t.x; p.ty = t.y;
      }
      for (const p of free) { p.tx = null; p.ty = null; }
      activeShape = kind;
      shapeKey = `${kind}:${width}x${height}`;
    }

    function releaseShape() {
      for (const p of particles) {
        if (p.tx != null) {
          // A small burst so the icon visibly dissolves back into free dust.
          p.vx += (Math.random() - 0.5) * RELEASE_KICK * 2;
          p.vy += (Math.random() - 0.5) * RELEASE_KICK * 2;
        }
        p.tx = null; p.ty = null;
      }
      activeShape = null;
      shapeKey = '';
    }

    function buildParticles() {
      const area = width * height;
      let count = Math.round(area / 12000);
      count = Math.max(34, Math.min(coarse ? 60 : 104, count));
      particles = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.55 + Math.random() * 0.9, // depth: parallax size/alpha/response
        vx: (Math.random() - 0.5) * 24,
        vy: (Math.random() - 0.5) * 24,
        size: 0.7 + Math.random() * 1.7,
        phase: Math.random() * Math.PI * 2,
        fA: 0.6 + Math.random() * 0.9, // wander frequencies
        fB: 0.6 + Math.random() * 0.9,
        accent: i % 8 === 0, // ~12% gold accents
      }));
    }

    function resize() {
      // The <canvas> is sized by CSS (100% of the ambient layer). Read that
      // computed size back for the backing store instead of writing inline
      // width/height — an early/zero inline value would lock the element's box.
      const w = canvas.clientWidth || parent.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || parent.clientHeight || window.innerHeight;
      if (w < 2 || h < 2) return;
      const prevW = width;
      const prevH = height;
      width = w;
      height = h;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!particles.length) {
        buildParticles();
      } else if (prevW > 1 && prevH > 1) {
        // Keep the swarm continuous across resizes instead of resetting it.
        const sx = width / prevW;
        const sy = height / prevH;
        for (const p of particles) { p.x *= sx; p.y *= sy; }
      }
    }

    function step(dt, t) {
      // Sync shape mode with the hovered card (and rebuild after resizes).
      const wantShape = shapeRef.current;
      if (wantShape !== activeShape || (wantShape && shapeKey !== `${wantShape}:${width}x${height}`)) {
        if (wantShape) assignShape(wantShape);
        else releaseShape();
      }

      // Ease the magnet toward the raw pointer for a smooth, weighty pull.
      if (pointer.active) {
        const k = Math.min(1, 6 * dt);
        magnet.x += (pointer.tx - magnet.x) * k;
        magnet.y += (pointer.ty - magnet.y) * k;
      }

      // Individual forces: spring-to-target while a shape is assembling,
      // otherwise wander + cursor magnet.
      for (const p of particles) {
        let ax;
        let ay;
        if (activeShape && p.tx != null) {
          // Near-critically damped spring: fast snap, no endless wobble.
          ax = (p.tx - p.x) * SHAPE_K - p.vx * SHAPE_DAMP;
          ay = (p.ty - p.y) * SHAPE_K - p.vy * SHAPE_DAMP;
        } else {
          ax = Math.sin(t * 0.00033 * p.fA + p.phase) * WANDER;
          ay = Math.cos(t * 0.00041 * p.fB + p.phase * 1.9) * WANDER;

          if (!activeShape && pointer.active) {
            const dx = magnet.x - p.x;
            const dy = magnet.y - p.y;
            const d = Math.max(Math.hypot(dx, dy), 26);
            const f = Math.min((ATTRACT * p.z) / (d + 130), ATTRACT_CAP);
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }

        p.vx += ax * dt;
        p.vy += ay * dt;
      }

      // Pairwise repulsion — same-charge electrons keep their distance, so the
      // swarm forms a halo around the magnet instead of a clump. O(n²) with
      // n ≤ 104 is well within a 60fps frame budget. Suspended while an icon is
      // assembling: its target points sit far closer than the repel radius.
      if (!activeShape) {
        const rr = REPEL_RADIUS * REPEL_RADIUS;
        for (let i = 0; i < particles.length; i++) {
          const a = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j];
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 >= rr || d2 === 0) continue;
            const d = Math.sqrt(d2);
            const push = REPEL * (1 - d / REPEL_RADIUS) * dt;
            const nx = dx / d;
            const ny = dy / d;
            a.vx += nx * push; a.vy += ny * push;
            b.vx -= nx * push; b.vy -= ny * push;
          }
        }
      }

      // Soft walls, damping, speed cap, integration. Clamp the wall thickness
      // to a quarter of the smaller dimension so the two walls can never
      // overlap on unusually small canvases.
      const damp = Math.max(0, 1 - FRICTION * dt);
      const margin = Math.min(EDGE_MARGIN, Math.min(width, height) * 0.25);
      for (const p of particles) {
        if (p.x < margin) p.vx += (margin - p.x) * EDGE_PUSH * dt;
        else if (p.x > width - margin) p.vx -= (p.x - (width - margin)) * EDGE_PUSH * dt;
        if (p.y < margin) p.vy += (margin - p.y) * EDGE_PUSH * dt;
        else if (p.y > height - margin) p.vy -= (p.y - (height - margin)) * EDGE_PUSH * dt;

        p.vx *= damp;
        p.vy *= damp;

        const sp = Math.hypot(p.vx, p.vy);
        // While assembling an icon the particles may cross the whole canvas,
        // so they get a much higher ceiling — that's what makes it feel snappy.
        const cap = activeShape && p.tx != null ? SHAPE_MAX_SPEED : MAX_SPEED * p.z;
        if (sp > cap) {
          p.vx = (p.vx / sp) * cap;
          p.vy = (p.vy / sp) * cap;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    function renderFrame() {
      const palette = THEMES[themeRef.current] || THEMES.dark;
      ctx.clearRect(0, 0, width, height);

      // Connective web.
      const maxDist = Math.min(width, height) * 0.14;
      const maxDistSq = maxDist * maxDist;
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        let links = 0;
        for (let j = i + 1; j < particles.length && links < 5; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dsq = dx * dx + dy * dy;
          if (dsq > maxDistSq) continue;
          links++;
          const closeness = 1 - Math.sqrt(dsq) / maxDist;
          const depth = (a.z + b.z) * 0.5;
          const alpha = closeness * palette.lineAlpha * Math.max(0.15, depth - 0.35);
          if (alpha <= 0.008) continue;
          const gold = a.accent || b.accent;
          ctx.strokeStyle = rgba(gold ? palette.lineAccent : palette.line, alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Nodes (gold accents get a soft glow).
      for (const p of particles) {
        const depth = Math.max(0.35, Math.min(1, (p.z - 0.3) * 0.95));
        const r = p.size * (0.55 + p.z * 0.6);
        const base = p.accent ? palette.accent : palette.node;
        if (p.accent) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 5);
          glow.addColorStop(0, rgba(base, 0.32 * depth));
          glow.addColorStop(1, rgba(base, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = rgba(base, palette.nodeAlpha * depth);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function tick(t) {
      // Clamp dt so background-tab gaps or hitches don't explode the physics.
      const dt = lastT ? Math.min(Math.max((t - lastT) / 1000, 0.001), 0.05) : 0.016;
      lastT = t;
      step(dt, t);
      renderFrame();
      raf = window.requestAnimationFrame(tick);
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = e.clientX - rect.left;
      pointer.ty = e.clientY - rect.top;
      if (!pointer.active) {
        // First contact: snap the magnet to the cursor so there is no fly-in
        // from a stale position.
        magnet.x = pointer.tx;
        magnet.y = pointer.ty;
      }
      pointer.active = true;
    }
    function onPointerOut(e) {
      // relatedTarget === null → the pointer actually left the window.
      if (!e.relatedTarget) pointer.active = false;
    }
    function onBlur() {
      pointer.active = false;
    }
    function onVisibility() {
      if (document.hidden) {
        if (raf) { window.cancelAnimationFrame(raf); raf = 0; }
        lastT = 0; // avoid a huge dt on resume
      } else if (!raf && !reduceMotion) {
        raf = window.requestAnimationFrame(tick);
      }
    }

    const draw = () => {
      renderFrame(); // immediate static frame (works even when throttled)
      if (!reduceMotion && !document.hidden && !raf) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    resize();
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => { resize(); renderFrame(); })
      : null;
    ro?.observe(parent);
    ro?.observe(canvas);
    // Repaint after window resizes too: reassigning canvas.width clears the
    // bitmap, and under prefers-reduced-motion there is no rAF loop to redraw.
    const onWindowResize = () => { resize(); renderFrame(); };
    window.addEventListener('resize', onWindowResize);
    // Re-measure once after first paint in case layout wasn't ready on mount.
    const initRaf = window.requestAnimationFrame(() => { resize(); draw(); });

    if (!coarse) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerout', onPointerOut);
      window.addEventListener('blur', onBlur);
    }
    document.addEventListener('visibilitychange', onVisibility);

    draw();

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.cancelAnimationFrame(initRaf);
      ro?.disconnect();
      window.removeEventListener('resize', onWindowResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerOut);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={`gateway-particles ${className}`} aria-hidden="true" />;
}
