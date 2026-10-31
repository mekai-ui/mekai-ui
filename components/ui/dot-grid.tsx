"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type DotGridProps = {
  /** Resting dot color. */
  color?: string;
  /** Color dots reach at the crest of a ripple. */
  activeColor?: string;
  /** Distance between dots, in pixels. */
  gap?: number;
  /** Dot radius at rest, in pixels. */
  dotSize?: number;
  /** Radius of the glow that follows the pointer, in pixels. */
  radius?: number;
  className?: string;
};

type Ripple = { x: number; y: number; born: number; strength: number };

const RING_SPEED = 0.3; // px per ms
const RING_LIFE = 2600; // ms
const POINTER_EVERY = 900; // ms between waves while the pointer is over the grid
const IDLE_EVERY = 2200; // ms between automatic waves
const LEVELS = 8; // brightness steps, so dots can be drawn in a few batched paths

function hexToRgb(hex: string) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A canvas dot grid where ripples travel out from the pointer, or from random spots when idle. */
export function DotGrid({
  color = "#3d3631",
  activeColor = "#ff784f",
  gap = 24,
  dotSize = 1.6,
  radius = 120,
  className = "",
}: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const base = hexToRgb(color);
    const hot = hexToRgb(activeColor);
    const step = Math.max(6, gap);
    const size = Math.max(0.5, dotSize);
    const ringW = Math.max(step * 0.9, 18);

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let level = new Int8Array(0);
    let frame = 0;
    let visible = true;
    let pointer: { x: number; y: number } | null = null;
    let lastEmit = -Infinity;
    let lastPointer = -Infinity;
    const ripples: Ripple[] = [];

    const lerp = (k: number) =>
      `rgb(${Math.round(base[0] + (hot[0] - base[0]) * k)},${Math.round(base[1] + (hot[1] - base[1]) * k)},${Math.round(
        base[2] + (hot[2] - base[2]) * k,
      )})`;
    const palette = Array.from({ length: LEVELS }, (_, i) => lerp((i + 1) / LEVELS));

    const draw = (t: number) => {
      if (!reduce) {
        if (pointer && t - lastEmit > POINTER_EVERY) {
          ripples.push({ x: pointer.x, y: pointer.y, born: t, strength: 1 });
          lastEmit = t;
        } else if (!pointer && t - lastPointer > 1500 && t - lastEmit > IDLE_EVERY) {
          ripples.push({ x: Math.random() * width, y: Math.random() * height, born: t, strength: 0.85 });
          lastEmit = t;
        }
      }
      for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].born > RING_LIFE) ripples.splice(i, 1);

      const offX = (width - (cols - 1) * step) / 2;
      const offY = (height - (rows - 1) * step) / 2;
      let idx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, idx++) {
          const x = offX + c * step;
          const y = offY + r * step;
          let k = 0;
          let dx = 0;
          let dy = 0;
          if (pointer && !reduce) {
            const d = Math.hypot(x - pointer.x, y - pointer.y);
            if (d < radius) k += (1 - d / radius) ** 2;
          }
          for (const rp of ripples) {
            const age = t - rp.born;
            const ox = x - rp.x;
            const oy = y - rp.y;
            const d = Math.sqrt(ox * ox + oy * oy);
            const off = d - age * RING_SPEED;
            if (off > ringW * 2.5 || off < -ringW * 2.5) continue;
            const wave = Math.exp(-(off * off) / (2 * ringW * ringW)) * (1 - age / RING_LIFE) * rp.strength;
            k += wave;
            if (d > 0.001) {
              const push = wave * step * 0.2;
              dx += (ox / d) * push;
              dy += (oy / d) * push;
            }
          }
          px[idx] = x + dx;
          py[idx] = y + dy;
          level[idx] = k < 0.04 ? -1 : Math.min(LEVELS - 1, Math.floor(Math.min(1, k) * LEVELS));
        }
      }

      ctx.clearRect(0, 0, width, height);
      const total = cols * rows;
      for (let l = -1; l < LEVELS; l++) {
        const kl = l < 0 ? 0 : (l + 1) / LEVELS;
        const rad = size * (1 + kl * 1.4);
        let any = false;
        ctx.beginPath();
        for (let i = 0; i < total; i++) {
          if (level[i] !== l) continue;
          any = true;
          ctx.moveTo(px[i] + rad, py[i]);
          ctx.arc(px[i], py[i], rad, 0, Math.PI * 2);
        }
        if (!any) continue;
        ctx.fillStyle = l < 0 ? `rgb(${base[0]},${base[1]},${base[2]})` : palette[l];
        ctx.fill();
      }

      if (!reduce && visible) frame = requestAnimationFrame(draw);
      else frame = 0;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.max(1, Math.floor(width / step) + 1);
      rows = Math.max(1, Math.floor(height / step) + 1);
      px = new Float32Array(cols * rows);
      py = new Float32Array(cols * rows);
      level = new Int8Array(cols * rows);
      if (reduce) draw(performance.now());
    };

    // Listen on the window so the grid still reacts when content sits on top of it.
    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      return x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? { x, y } : null;
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (p && !pointer) lastEmit = -Infinity; // a wave right away on enter
      pointer = p;
      if (p) lastPointer = performance.now();
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      if (!p) return;
      const now = performance.now();
      ripples.push({ x: p.x, y: p.y, born: now, strength: 1.5 });
      lastEmit = now;
      lastPointer = now;
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) pointer = null;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduce && !frame) frame = requestAnimationFrame(draw);
    });
    io.observe(canvas);
    if (!reduce) {
      frame = requestAnimationFrame(draw);
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      document.addEventListener("pointerout", onOut);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerout", onOut);
    };
  }, [color, activeColor, gap, dotSize, radius, reduce]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 block size-full ${className}`}
      aria-hidden="true"
    />
  );
}
