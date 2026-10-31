"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type MeteorsProps = {
  /** Meteors that can be in the sky at once. */
  count?: number;
  /** Meteor color as a hex value. */
  color?: string;
  /** Fall angle in degrees from vertical. Positive values slant to the left, negative to the right. */
  angle?: number;
  /** Fall speed multiplier. */
  speed?: number;
  /** Draw a few faint, twinkling stars behind the meteors. */
  stars?: boolean;
  className?: string;
};

type Meteor = { x: number; y: number; len: number; v: number; w: number; wait: number; age: number };
type Star = { x: number; y: number; r: number; phase: number };

function hexToRgb(hex: string) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Diagonal meteor streaks with glowing heads, launched at random intervals. */
export function Meteors({ count = 10, color = "#ffa585", angle = 35, speed = 1, stars = true, className = "" }: MeteorsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const [r, g, b] = hexToRgb(color);
    const rgb = `${r},${g},${b}`;
    // The head is a whiter version of the color, like a hot core.
    const core = `rgb(${Math.round(r + (255 - r) * 0.7)},${Math.round(g + (255 - g) * 0.7)},${Math.round(b + (255 - b) * 0.7)})`;
    const rad = (Math.max(-75, Math.min(75, angle)) * Math.PI) / 180;
    const dx = -Math.sin(rad);
    const dy = Math.cos(rad);
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let last = 0;
    let sky: Star[] = [];

    const launch = (m: Meteor, wait: number) => {
      // Start anywhere along the top edge, widened so slanted meteors still cover the whole area.
      const drift = (height * dx) / dy;
      const minX = Math.min(0, -drift);
      const maxX = Math.max(width, width - drift);
      m.x = minX + Math.random() * (maxX - minX);
      m.y = -10 - Math.random() * height * 0.25;
      m.len = 80 + Math.random() * 170;
      m.v = (0.45 + Math.random() * 0.55) * speed;
      m.w = 1 + Math.random() * 1.1;
      m.wait = wait;
      m.age = 0;
    };
    const meteors: Meteor[] = Array.from({ length: Math.max(1, Math.round(count)) }, () => ({
      x: 0,
      y: 0,
      len: 0,
      v: 0,
      w: 1,
      wait: 0,
      age: 0,
    }));

    const draw = (t: number) => {
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      ctx.clearRect(0, 0, width, height);

      for (const s of sky) {
        const tw = reduce ? 0.6 : 0.55 + 0.45 * Math.sin(t * 0.0012 + s.phase);
        ctx.fillStyle = `rgba(244,237,227,${0.12 + tw * 0.28})`;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (const m of meteors) {
        if (!reduce) {
          if (m.wait > 0) {
            m.wait -= dt;
            continue;
          }
          m.age += dt;
          m.x += dx * m.v * dt;
          m.y += dy * m.v * dt;
          const tailX = m.x - dx * m.len;
          const tailY = m.y - dy * m.len;
          if (tailY > height + 10 || tailX < -m.len - 10 || tailX > width + m.len + 10) {
            launch(m, 300 + Math.random() * 3200);
            continue;
          }
        }
        const fadeIn = reduce ? 1 : Math.min(1, m.age / 180);
        const tx = m.x - dx * m.len;
        const ty = m.y - dy * m.len;
        const tail = ctx.createLinearGradient(m.x, m.y, tx, ty);
        tail.addColorStop(0, `rgba(${rgb},${0.9 * fadeIn})`);
        tail.addColorStop(0.3, `rgba(${rgb},${0.35 * fadeIn})`);
        tail.addColorStop(1, `rgba(${rgb},0)`);
        ctx.strokeStyle = tail;
        ctx.lineWidth = m.w;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        const glowR = m.w * 7;
        const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, glowR);
        glow.addColorStop(0, `rgba(${rgb},${0.75 * fadeIn})`);
        glow.addColorStop(0.35, `rgba(${rgb},${0.2 * fadeIn})`);
        glow.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(m.x, m.y, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fadeIn;
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.w * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = "source-over";

      if (!reduce && visible) frame = requestAnimationFrame(draw);
      else frame = 0;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const first = width === 0;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sky = stars
        ? Array.from({ length: Math.round(Math.min(160, (width * height) / 9000)) }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() < 0.2 ? 1.6 : 1,
            phase: Math.random() * Math.PI * 2,
          }))
        : [];
      if (first) {
        for (const m of meteors) {
          launch(m, Math.random() * 2600);
          // With reduced motion, freeze a few meteors mid-flight instead of animating them.
          if (reduce) {
            const along = (0.25 + Math.random() * 0.6) * (height / dy);
            m.x += dx * along;
            m.y += dy * along;
          }
        }
      }
      if (reduce) draw(0);
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
    if (!reduce) frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      io.disconnect();
    };
  }, [count, color, angle, speed, stars, reduce]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 block size-full ${className}`}
      aria-hidden="true"
    />
  );
}
