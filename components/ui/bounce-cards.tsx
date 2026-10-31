"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type BounceCardItem = {
  id?: string;
  /** Image URL, shown as a cover. */
  src?: string;
  alt?: string;
  /** Any card content. Takes priority over src. */
  content?: ReactNode;
  /** Accessible name of the card. */
  label?: string;
};

type BounceCardsProps = {
  items: BounceCardItem[];
  /** Degrees of rotation between neighboring cards. */
  spread?: number;
  /** Seconds between each card's entrance. */
  stagger?: number;
  cardWidth?: number;
  cardHeight?: number;
  /** How much each card hides under the next, 0 to 0.8. */
  overlap?: number;
  /** How far neighbors slide away from the hovered card, in pixels. */
  push?: number;
  /** How far the hovered card rises, in pixels. */
  lift?: number;
  /** Makes cards buttons and reports the chosen index. */
  onSelect?: (index: number) => void;
  /** Accessible name of the hand. */
  label?: string;
  className?: string;
};

function Media({ item }: { item: BounceCardItem }) {
  if (item.content !== undefined) return <>{item.content}</>;
  if (item.src) {
    return <span role="img" aria-label={item.alt ?? ""} className="block size-full bg-cover bg-center" style={{ backgroundImage: `url("${item.src}")` }} />;
  }
  return null;
}

export function BounceCards({
  items,
  spread = 7,
  stagger = 0.07,
  cardWidth = 140,
  cardHeight,
  overlap = 0.42,
  push = 36,
  lift = 26,
  onSelect,
  label = "Cards",
  className = "",
}: BounceCardsProps) {
  const reduce = Boolean(useReducedMotion());
  const count = items.length;
  const height = cardHeight ?? Math.round(cardWidth * 1.4);
  const stepX = cardWidth * (1 - Math.max(0, Math.min(0.8, overlap)));
  const mid = (count - 1) / 2;
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [entered, setEntered] = useState(reduce);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const active = hovered ?? focused;

  const arc = (d: number) => d * d * 3.2;
  const width = (count - 1) * stepX + cardWidth + push * 2 + 24;
  const boxHeight = height + lift + arc(mid) + 36;

  function pose(i: number) {
    const d = i - mid;
    let x = d * stepX;
    let y = arc(d);
    let rotate = d * spread;
    let scale = 1;
    if (active !== null) {
      const off = i - active;
      if (off === 0) {
        y -= lift;
        rotate *= 0.25;
        scale = 1.06;
      } else {
        const far = Math.abs(off);
        x += Math.sign(off) * push * (far === 1 ? 1 : far === 2 ? 0.55 : 0.3);
      }
    }
    return { x, y, rotate, scale };
  }

  function onKeyDown(i: number, e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = (i + (e.key === "ArrowRight" ? 1 : -1) + count) % count;
      refs.current[next]?.focus();
    } else if (onSelect && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onSelect(i);
    }
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative mx-auto max-w-full ${className}`}
      style={{ width, height: boxHeight }}
      onPointerLeave={() => setHovered(null)}
    >
      {items.map((item, i) => {
        const p = pose(i);
        const isActive = active === i;
        return (
          <motion.div
            key={item.id ?? i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role={onSelect ? "button" : "group"}
            aria-roledescription={onSelect ? undefined : "card"}
            aria-label={item.label ?? `Card ${i + 1} of ${count}`}
            tabIndex={0}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setHovered(i);
            }}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused((f) => (f === i ? null : f))}
            onClick={() => onSelect?.(i)}
            onKeyDown={(e) => onKeyDown(i, e)}
            className={`absolute left-1/2 overflow-hidden rounded-2xl bg-ink-800 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.9)] ring-1 ring-inset ring-white/10 focus-visible:outline-offset-4 ${
              onSelect ? "cursor-pointer" : ""
            }`}
            style={{
              top: lift + 12,
              width: cardWidth,
              height,
              marginLeft: -cardWidth / 2,
              zIndex: isActive ? count + 1 : i,
              originX: 0.5,
              originY: 1.15,
            }}
            initial={reduce ? false : { opacity: 0, x: 0, y: 140, rotate: 0, scale: 0.55 }}
            animate={{ opacity: 1, ...p }}
            transition={
              reduce
                ? { duration: 0.15 }
                : entered
                  ? { type: "spring", stiffness: 360, damping: 24 }
                  : { type: "spring", stiffness: 260, damping: 12, mass: 0.9, delay: i * stagger }
            }
            onAnimationComplete={() => {
              if (!entered && i === count - 1) setEntered(true);
            }}
          >
            <div className="size-full" inert={Boolean(onSelect)}>
              <Media item={item} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
