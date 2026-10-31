"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

export type ExpandItem = {
  id?: string;
  title: string;
  caption?: string;
  /** Small label above the title. */
  eyebrow?: string;
  /** Image URL, shown as the panel background. */
  src?: string;
  alt?: string;
  /** Any panel background. Takes priority over src. */
  content?: ReactNode;
};

type ExpandGalleryProps = {
  items: ExpandItem[];
  /** How many times wider the open panel is than a closed one. */
  expandedRatio?: number;
  /** Row height in pixels. The stacked layout on narrow containers is a bit taller. */
  height?: number;
  /** Panel that stays open while nothing is hovered or focused. */
  defaultIndex?: number;
  /** Called when a panel is clicked or chosen with Enter. */
  onSelect?: (index: number) => void;
  /** Accessible name of the gallery. */
  label?: string;
  className?: string;
};

function Media({ item }: { item: ExpandItem }) {
  if (item.content !== undefined) return <>{item.content}</>;
  if (item.src) {
    return <span role="img" aria-label={item.alt ?? ""} className="block size-full bg-cover bg-center" style={{ backgroundImage: `url("${item.src}")` }} />;
  }
  return null;
}

export function ExpandGallery({
  items,
  expandedRatio = 4,
  height = 380,
  defaultIndex = 0,
  onSelect,
  label = "Gallery",
  className = "",
}: ExpandGalleryProps) {
  const autoId = useId();
  const reduce = Boolean(useReducedMotion());
  const [pinned, setPinned] = useState(defaultIndex);
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const panels = useRef<(HTMLButtonElement | null)[]>([]);
  const open = hovered ?? focused ?? pinned;
  const ratio = Math.max(1.2, expandedRatio);

  function onKeyDown(i: number, e: KeyboardEvent<HTMLButtonElement>) {
    const last = items.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    panels.current[next]?.focus();
  }

  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 210, damping: 28, mass: 0.9 };

  return (
    <div className={`@container w-full ${className}`}>
      <div
        role="group"
        aria-label={label}
        onPointerLeave={() => setHovered(null)}
        className="flex h-[calc(var(--h)*1.35)] flex-col gap-2 @xl:h-[var(--h)] @xl:flex-row"
        style={{ "--h": `${height}px` } as CSSProperties}
      >
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <motion.button
              key={item.id ?? i}
              ref={(el) => {
                panels.current[i] = el;
              }}
              type="button"
              id={`${autoId}-${i}`}
              aria-expanded={isOpen}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") setHovered(i);
              }}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused((f) => (f === i ? null : f))}
              onClick={() => {
                setPinned(i);
                onSelect?.(i);
              }}
              onKeyDown={(e) => onKeyDown(i, e)}
              className="group relative min-h-0 min-w-0 overflow-hidden rounded-2xl bg-ink-800 text-left ring-1 ring-inset ring-white/5"
              style={{ flexBasis: 0 }}
              initial={false}
              animate={{ flexGrow: isOpen ? ratio : 1 }}
              transition={spring}
            >
              <span className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
                <Media item={item} />
              </span>
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-ink-950/10"
                initial={false}
                animate={{ opacity: isOpen ? 1 : 0.55 }}
                transition={{ duration: reduce ? 0 : 0.3 }}
              />
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-ink-950"
                initial={false}
                animate={{ opacity: isOpen ? 0 : 0.45 }}
                transition={{ duration: reduce ? 0 : 0.3 }}
              />

              {/* Closed panels show the title on its side; the open one shows everything. */}
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center px-4 @xl:items-end @xl:justify-center @xl:px-0 @xl:pb-5"
                initial={false}
                animate={{ opacity: isOpen ? 0 : 1 }}
                transition={{ duration: reduce ? 0 : 0.2, delay: isOpen || reduce ? 0 : 0.15 }}
              >
                <span className="flex items-center gap-2 whitespace-nowrap font-display text-sm font-bold text-bone @xl:rotate-180 @xl:[writing-mode:vertical-rl]">
                  <span className="font-display text-xs tabular-nums text-bone-dim">{String(i + 1).padStart(2, "0")}</span>
                  {item.title}
                </span>
              </motion.span>

              <motion.span
                className="absolute inset-x-0 bottom-0 block p-5 @xl:p-6"
                initial={false}
                animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : 14 }}
                transition={{ duration: reduce ? 0 : 0.3, delay: isOpen && !reduce ? 0.18 : 0 }}
              >
                {item.eyebrow ? (
                  <span className="mb-2 block text-[0.68rem] font-bold uppercase tracking-[0.24em] text-ember">{item.eyebrow}</span>
                ) : null}
                <span className="block font-display text-xl font-extrabold leading-tight text-bone @xl:text-2xl">{item.title}</span>
                {item.caption ? <span className="mt-1.5 block max-w-[40ch] text-sm leading-relaxed text-bone-muted">{item.caption}</span> : null}
              </motion.span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
