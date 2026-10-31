"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type MagnetLinesProps = {
  rows?: number;
  columns?: number;
  /** Line color as a hex value. */
  color?: string;
  /** Line thickness in pixels. */
  lineWidth?: number;
  /** Line length in pixels. */
  lineHeight?: number;
  className?: string;
};

function hexToRgb(hex: string) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16) || 0;
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** Shortest turn between two line angles. A line looks the same after half a turn, so this works modulo pi. */
function turn(from: number, to: number) {
  let d = (to - from) % Math.PI;
  if (d > Math.PI / 2) d -= Math.PI;
  if (d < -Math.PI / 2) d += Math.PI;
  return d;
}

/** A grid of short lines that all turn to face the pointer, and sway in a slow wave when it is away. */
export function MagnetLines({
  rows = 9,
  columns = 14,
  color = "#ff784f",
  lineWidth = 2,
  lineHeight = 22,
  className = "",
}: MagnetLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rgb = hexToRgb(color);
    const nr = Math.max(1, Math.round(rows));
    const nc = Math.max(1, Math.round(columns));
    const angles = new Float32Array(nr * nc).fill(-Math.PI / 4);
    const glow = new Float32Array(nr * nc);
    const pointer = { x: 0, y: 0, inside: false };
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let last = 0;

    const draw = (t: number) => {
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      const cellW = width / nc;
      const cellH = height / nr;
      const reach = Math.max(cellW, cellH) * 3.5;
      const ease = reduce ? 1 : Math.min(1, dt * 0.009);

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineWidth = Math.max(0.5, lineWidth);
      for (let r = 0; r < nr; r++) {
        for (let c = 0; c < nc; c++) {
          const i = r * nc + c;
          const x = (c + 0.5) * cellW;
          const y = (r + 0.5) * cellH;
          let target: number;
          let near = 0;
          if (pointer.inside) {
            target = Math.atan2(pointer.y - y, pointer.x - x);
            near = Math.max(0, 1 - Math.hypot(pointer.x - x, pointer.y - y) / reach);
          } else {
            // Idle: a slow diagonal wave rolls across the grid.
            target = -Math.PI / 4 + Math.sin(t * 0.0009 + c * 0.42 + r * 0.3) * 0.75;
          }
          angles[i] += turn(angles[i], target) * ease;
          glow[i] += (near - glow[i]) * ease;
          const len = lineHeight * (1 + glow[i] * 0.25);
          const dx = (Math.cos(angles[i]) * len) / 2;
          const dy = (Math.sin(angles[i]) * len) / 2;
          ctx.strokeStyle = `rgba(${rgb},${0.38 + glow[i] * 0.62})`;
          ctx.beginPath();
          ctx.moveTo(x - dx, y - dy);
          ctx.lineTo(x + dx, y + dy);
          ctx.stroke();
        }
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
      if (reduce) draw(0);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= rect.width && pointer.y <= rect.height;
      // With reduced motion the lines snap to the pointer instead of animating.
      if (reduce) draw(performance.now());
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        pointer.inside = false;
        if (reduce) draw(performance.now());
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduce && !frame) {
        last = 0;
        frame = requestAnimationFrame(draw);
      }
    });
    io.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onOut);
    if (!reduce) frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, [rows, columns, color, lineWidth, lineHeight, reduce]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 block size-full ${className}`}
      aria-hidden="true"
    />
  );
}
