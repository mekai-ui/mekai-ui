"use client";

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type CarouselItem = {
  id?: string;
  /** Image URL, shown as a cover. */
  src?: string;
  alt?: string;
  /** Any slide content. Takes priority over src. */
  content?: ReactNode;
  /** Short name used in the slide's accessible label and announcements. */
  label?: string;
};

type CarouselProps = {
  items: CarouselItem[];
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Slide width as a fraction of the viewport, 0.4 to 1. Neighbors peek in the rest. */
  slideWidth?: number;
  gap?: number;
  aspectRatio?: string;
  /** Wraps from the last slide back to the first, and the other way round. */
  loop?: boolean;
  /** Milliseconds per slide. Pauses on hover, focus and drag. */
  autoplay?: number | false;
  showArrows?: boolean;
  showDots?: boolean;
  /** Scales the active slide up and fades its neighbors. */
  focusEffect?: boolean;
  /** Accessible name of the carousel. */
  label?: string;
  /** Color of the active dot. */
  color?: string;
  className?: string;
};

const SPRING = { type: "spring" as const, stiffness: 300, damping: 34, mass: 0.9 };

function Media({ item }: { item: CarouselItem }) {
  if (item.content !== undefined) return <>{item.content}</>;
  if (item.src) {
    return (
      <span
        role="img"
        aria-label={item.alt ?? ""}
        className="block size-full bg-cover bg-center"
        style={{ backgroundImage: `url("${item.src}")` }}
      />
    );
  }
  return null;
}

function Slide({
  item,
  i,
  count,
  x,
  step,
  active,
  aspectRatio,
  focusEffect,
  reduce,
  onPick,
}: {
  item: CarouselItem;
  i: number;
  count: number;
  x: MotionValue<number>;
  step: number;
  active: number;
  aspectRatio: string;
  focusEffect: boolean;
  reduce: boolean;
  onPick: (i: number) => void;
}) {
  // 0 when this slide sits in the center, 1 once it is a full slide away.
  const distance = useTransform(x, (v) => (step > 0 ? Math.min(1, Math.abs(-v / step - i)) : i === active ? 0 : 1));
  const scale = useTransform(distance, [0, 1], [1, focusEffect && !reduce ? 0.86 : 1]);
  const opacity = useTransform(distance, [0, 1], [1, focusEffect ? 0.42 : 1]);
  const isActive = i === active;

  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={`${i + 1} of ${count}${item.label ? `: ${item.label}` : ""}`}
      onClick={() => onPick(i)}
      className={`relative shrink-0 overflow-hidden rounded-3xl bg-ink-800 ring-1 ring-inset ring-white/5 ${isActive ? "" : "cursor-pointer"}`}
      // The track is padded to the slide width, so 100% of its content box is exactly one slide.
      style={{ flexBasis: "100%", aspectRatio, scale, opacity }}
    >
      <div className="size-full" inert={!isActive}>
        <Media item={item} />
      </div>
    </motion.div>
  );
}

export function Carousel({
  items,
  index,
  defaultIndex = 0,
  onIndexChange,
  slideWidth = 0.78,
  gap = 16,
  aspectRatio = "16 / 10",
  loop = false,
  autoplay = false,
  showArrows = true,
  showDots = true,
  focusEffect = true,
  label = "Gallery",
  color = "#ff784f",
  className = "",
}: CarouselProps) {
  const autoId = useId();
  const reduce = Boolean(useReducedMotion());
  const count = items.length;
  const ratio = Math.max(0.4, Math.min(1, slideWidth));
  const [inner, setInner] = useState(defaultIndex);
  const active = Math.max(0, Math.min(count - 1, index ?? inner));

  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const step = width > 0 ? width * ratio + gap : 0;
  const x = useMotionValue(0);
  const fling = useRef(0);
  const lastStep = useRef(0);
  const dragged = useRef(false);

  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const playing = Boolean(autoplay) && !paused && !hovered && !focused && !dragging && count > 1;

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Glide to the active slide. A resize jumps there instead of animating.
  useEffect(() => {
    const target = -active * step;
    if (step !== lastStep.current || reduce) {
      lastStep.current = step;
      x.jump(target);
      return;
    }
    const controls = animate(x, target, { ...SPRING, velocity: fling.current });
    fling.current = 0;
    return () => controls.stop();
  }, [active, step, reduce, x]);

  function go(i: number) {
    const next = loop ? (i + count) % count : Math.max(0, Math.min(count - 1, i));
    if (next === active) return;
    if (index === undefined) setInner(next);
    onIndexChange?.(next);
  }

  useEffect(() => {
    if (!playing || !autoplay) return;
    const timer = window.setTimeout(() => {
      const next = active + 1 >= count ? 0 : active + 1;
      if (index === undefined) setInner(next);
      onIndexChange?.(next);
    }, autoplay);
    return () => window.clearTimeout(timer);
  }, [playing, autoplay, active, count, index, onIndexChange]);

  function onDragEnd(_: unknown, info: PanInfo) {
    setDragging(false);
    if (step <= 0) return;
    const projected = x.get() + info.velocity.x * 0.22;
    let target = Math.round(-projected / step);
    // A short, deliberate swipe still moves one slide.
    if (target === active && Math.abs(info.offset.x) > step * 0.12) target = active + (info.offset.x < 0 ? 1 : -1);
    const wrapped = loop && (target > count - 1 || target < 0) ? (target < 0 ? count - 1 : 0) : Math.max(0, Math.min(count - 1, target));
    if (wrapped === active) {
      animate(x, -active * step, reduce ? { duration: 0 } : { ...SPRING, velocity: info.velocity.x });
      return;
    }
    fling.current = wrapped === target ? info.velocity.x : 0;
    go(wrapped);
  }

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(active - 1);
    }
  }

  const canPrev = loop || active > 0;
  const canNext = loop || active < count - 1;
  const current = items[active];
  const arrow =
    "grid size-10 place-items-center rounded-full border border-ink-600 bg-ink-900/80 text-bone backdrop-blur transition-colors hover:border-ember/60 disabled:pointer-events-none disabled:opacity-30";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      className={`relative w-full ${className}`}
    >
      <div ref={viewport} className="overflow-hidden">
        <motion.div
          id={`${autoId}-track`}
          className="flex cursor-grab touch-pan-y select-none active:cursor-grabbing"
          style={{ x, gap, paddingInline: `${((1 - ratio) / 2) * 100}%` }}
          drag={count > 1 ? "x" : false}
          dragConstraints={{ left: -(count - 1) * step, right: 0 }}
          dragElastic={0.14}
          dragMomentum={false}
          onPointerDownCapture={() => {
            dragged.current = false;
          }}
          onDragStart={() => {
            dragged.current = true;
            setDragging(true);
          }}
          onDragEnd={onDragEnd}
        >
          {items.map((item, i) => (
            <Slide
              key={item.id ?? i}
              item={item}
              i={i}
              count={count}
              x={x}
              step={step}
              active={active}
              aspectRatio={aspectRatio}
              focusEffect={focusEffect}
              reduce={reduce}
              onPick={(n) => {
                if (!dragged.current) go(n);
              }}
            />
          ))}
        </motion.div>
      </div>

      {showArrows || showDots || autoplay ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          {showArrows ? (
            <button type="button" className={arrow} onClick={() => go(active - 1)} disabled={!canPrev} aria-controls={`${autoId}-track`} aria-label="Previous slide">
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 3.5 5.5 8l4.5 4.5" />
              </svg>
            </button>
          ) : null}
          {showDots ? (
            <div className="flex items-center gap-1.5">
              {items.map((item, i) => (
                <button
                  key={item.id ?? i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}${item.label ? `: ${item.label}` : ""}`}
                  aria-current={i === active ? "true" : undefined}
                  className="grid h-6 place-items-center px-0.5"
                >
                  <motion.span
                    className="block h-1.5 rounded-full"
                    initial={false}
                    animate={{ width: i === active ? 22 : 6, backgroundColor: i === active ? color : "#3d3631" }}
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
                  />
                </button>
              ))}
            </div>
          ) : null}
          {showArrows ? (
            <button type="button" className={arrow} onClick={() => go(active + 1)} disabled={!canNext} aria-controls={`${autoId}-track`} aria-label="Next slide">
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </button>
          ) : null}
          {autoplay ? (
            <button
              type="button"
              className={`${arrow} ml-1 size-8`}
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Start automatic slide show" : "Stop automatic slide show"}
            >
              {paused ? (
                <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M5 3.5v9l7.5-4.5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" className="size-3.5" fill="currentColor" aria-hidden="true">
                  <rect x="4" y="3.5" width="2.6" height="9" rx="0.8" />
                  <rect x="9.4" y="3.5" width="2.6" height="9" rx="0.8" />
                </svg>
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Announce slide changes, but stay quiet while the slide show runs on its own. */}
      <div className="sr-only" aria-live={playing ? "off" : "polite"} aria-atomic="true">
        {count ? `Slide ${active + 1} of ${count}${current?.label ? `: ${current.label}` : ""}` : ""}
      </div>
    </section>
  );
}
