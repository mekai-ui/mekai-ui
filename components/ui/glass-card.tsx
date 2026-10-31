"use client";

import { useRef, useSyncExternalStore, type HTMLAttributes, type PointerEvent, type ReactNode } from "react";

type GlassCardProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  children?: ReactNode;
  /** Background blur in pixels. */
  blur?: number;
  /** Color boost for what shows through, 1 is unchanged. */
  saturation?: number;
  /** Glass tint color, as hex. */
  tint?: string;
  /** Tint strength, 0 to 1. */
  opacity?: number;
  /** Border highlight strength, 0 to 1. */
  borderOpacity?: number;
  /** A soft light that follows the pointer inside the glass. */
  shine?: boolean;
  /** Corner radius in pixels. */
  radius?: number;
};

const noSubscribe = () => () => {};

function supportsBackdrop() {
  return typeof CSS !== "undefined" && (CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)"));
}

function rgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(255,255,255,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function GlassCard({
  children,
  blur = 18,
  saturation = 1.6,
  tint = "#ffffff",
  opacity = 0.08,
  borderOpacity = 0.18,
  shine = true,
  radius = 28,
  className = "",
  style,
  onPointerMove,
  onPointerLeave,
  ...rest
}: GlassCardProps) {
  const card = useRef<HTMLDivElement>(null);
  // Checked once on the client; the server assumes support and the client corrects it.
  const glass = useSyncExternalStore(noSubscribe, supportsBackdrop, () => true);
  const a = Math.max(0, Math.min(1, opacity));
  const b = Math.max(0, Math.min(1, borderOpacity));
  const filter = `blur(${blur}px) saturate(${saturation})`;

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    onPointerMove?.(e);
    const el = card.current;
    if (!el || !shine) return;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - box.left}px`);
    el.style.setProperty("--sy", `${e.clientY - box.top}px`);
    el.style.setProperty("--shine", "1");
  }

  function handleLeave(e: PointerEvent<HTMLDivElement>) {
    onPointerLeave?.(e);
    card.current?.style.setProperty("--shine", "0");
  }

  return (
    <div
      {...rest}
      ref={card}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`relative isolate overflow-hidden ${className}`}
      style={{
        borderRadius: radius,
        // Without backdrop-filter the glass turns into a frosted, mostly opaque panel so text stays readable.
        background: glass ? rgba(tint, a) : `linear-gradient(${rgba(tint, Math.min(1, a + 0.1))}, ${rgba(tint, Math.min(1, a + 0.1))}), rgba(23,20,18,0.92)`,
        backdropFilter: glass ? filter : undefined,
        WebkitBackdropFilter: glass ? filter : undefined,
        boxShadow: `inset 0 1px 0 ${rgba("#ffffff", Math.min(1, b + 0.12))}, inset 0 0 0 1px ${rgba("#ffffff", b)}, 0 24px 60px -24px rgba(0,0,0,0.65)`,
        ...style,
      }}
    >
      {/* Top-left edge highlight, like light catching the rim of the glass. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
        style={{ background: `linear-gradient(135deg, ${rgba("#ffffff", b * 0.9)} 0%, transparent 38%)` }}
      />
      {shine ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] transition-opacity duration-500"
          style={{
            opacity: "var(--shine, 0)",
            background: `radial-gradient(360px circle at var(--sx, 50%) var(--sy, 0%), ${rgba("#ffffff", 0.16)}, transparent 55%)`,
          }}
        />
      ) : null}
      {children}
    </div>
  );
}
