"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent } from "react";

type StarRatingProps = {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Number of stars. */
  max?: number;
  /** Star size in pixels. */
  size?: number;
  color?: string;
  /** Display only. Accepts fractions, like 4.5. */
  readOnly?: boolean;
  /** Accessible name of the group. */
  label?: string;
  name?: string;
  id?: string;
  className?: string;
};

const STAR =
  "M12 2.5 14.53 9.02 21.51 9.41 16.09 13.83 17.88 20.59 12 16.8 6.12 20.59 7.91 13.83 2.49 9.41 9.47 9.02Z";
const STAGGER = 0.035;

function Star({ fill, size, color, delay, reduce }: { fill: number; size: number; color: string; delay: number; reduce: boolean }) {
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0" aria-hidden="true">
        <path d={STAR} fill="#171412" stroke="#3d3631" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
      <motion.span
        className="absolute inset-y-0 left-0 overflow-hidden"
        initial={false}
        animate={{ width: `${fill * 100}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.18, ease: "easeOut", delay }}
      >
        <svg viewBox="0 0 24 24" width={size} height={size} className="max-w-none" aria-hidden="true">
          <path d={STAR} fill={color} stroke={color} strokeWidth={1.4} strokeLinejoin="round" />
        </svg>
      </motion.span>
    </span>
  );
}

export function StarRating({
  value,
  defaultValue = 0,
  onChange,
  max = 5,
  size = 28,
  color = "#ffc24a",
  readOnly = false,
  label = "Rating",
  name,
  id,
  className = "",
}: StarRatingProps) {
  const autoId = useId();
  const groupId = id ?? autoId;
  const reduce = Boolean(useReducedMotion());
  const [inner, setInner] = useState(defaultValue);
  const current = Math.max(0, Math.min(max, value ?? inner));
  const [preview, setPreview] = useState<number | null>(null);
  // The value shown before the last change, so the stagger runs outward from it.
  const [from, setFrom] = useState(current);
  const [pop, setPop] = useState({ index: -1, n: 0 });
  const stars = useRef<(HTMLButtonElement | null)[]>([]);

  const shown = preview ?? current;
  const rounded = Math.round(current);
  const tabbable = rounded > 0 ? rounded - 1 : 0;

  function show(next: number | null) {
    if (next === preview) return;
    setFrom(shown);
    setPreview(next);
  }

  function commit(next: number) {
    setFrom(shown);
    setPreview(null);
    setPop((p) => ({ index: next - 1, n: p.n + 1 }));
    if (value === undefined) setInner(next);
    onChange?.(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(max, rounded + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(1, rounded - 1);
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = max;
    else if (/^[1-9]$/.test(e.key) && Number(e.key) <= max) next = Number(e.key);
    if (next === null) return;
    e.preventDefault();
    if (next !== rounded) commit(next);
    stars.current[next - 1]?.focus();
  }

  function delayFor(i: number) {
    if (reduce) return 0;
    return shown >= from ? Math.max(0, i - Math.floor(from)) * STAGGER : Math.max(0, Math.ceil(from) - 1 - i) * STAGGER;
  }

  const hidden = name ? <input type="hidden" name={name} value={current} /> : null;

  if (readOnly) {
    return (
      <div id={groupId} role="img" aria-label={`${label}: ${current} out of ${max}`} className={`inline-flex gap-1 ${className}`}>
        {Array.from({ length: max }, (_, i) => (
          <Star key={i} fill={Math.max(0, Math.min(1, current - i))} size={size} color={color} delay={0} reduce />
        ))}
        {hidden}
      </div>
    );
  }

  return (
    <div
      id={groupId}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerLeave={() => show(null)}
      className={`inline-flex ${className}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const popping = pop.index === i && !reduce;
        return (
          <motion.button
            key={i}
            ref={(el) => {
              stars.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={rounded === i + 1}
            aria-label={`${i + 1} ${i === 0 ? "star" : "stars"}`}
            tabIndex={i === tabbable ? 0 : -1}
            onClick={() => commit(i + 1)}
            onPointerMove={(e) => {
              if (e.pointerType === "mouse") show(i + 1);
            }}
            whileHover={reduce ? undefined : { scale: 1.14 }}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            className="cursor-pointer rounded-md p-0.5"
          >
            <motion.span
              key={popping ? `pop-${pop.n}` : "still"}
              className="block"
              initial={popping ? { scale: 0.55, rotate: -24 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 520, damping: 12 }}
            >
              <Star fill={Math.max(0, Math.min(1, shown - i))} size={size} color={color} delay={delayFor(i)} reduce={reduce} />
            </motion.span>
          </motion.button>
        );
      })}
      {hidden}
    </div>
  );
}
