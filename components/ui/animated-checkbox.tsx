"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";

type AnimatedCheckboxProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  /** Shows a dash instead of the tick, as in a "select all" box that is partly checked. */
  indeterminate?: boolean;
  color?: string;
  /** Box size in pixels. */
  size?: number;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  value?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

const INK = "#070606";
const EASE = [0.65, 0, 0.35, 1] as const;

export function AnimatedCheckbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  indeterminate = false,
  color = "#ff784f",
  size = 20,
  disabled = false,
  required,
  name,
  value = "on",
  id,
  "aria-label": ariaLabel,
  className = "",
}: AnimatedCheckboxProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-checkbox`;
  const descId = `${inputId}-description`;
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const tick = on && !indeterminate;
  const filled = on || indeterminate;

  // `indeterminate` only exists as a DOM property, and a click clears it, so re-apply it after every render.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  });

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (checked === undefined) setInner(next);
    onCheckedChange?.(next);
  }

  const draw = (visible: boolean) => ({
    pathLength: { duration: reduce ? 0 : visible ? 0.3 : 0.16, delay: visible && !reduce ? 0.08 : 0, ease: EASE },
    opacity: { duration: 0, delay: visible || reduce ? 0 : 0.16 },
  });

  return (
    <div className={`inline-flex gap-3 ${description ? "items-start" : "items-center"} ${disabled ? "opacity-50" : ""} ${className}`}>
      <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size, marginTop: description ? 1 : 0 }}>
        <input
          ref={inputRef}
          id={inputId}
          type="checkbox"
          name={name}
          value={value}
          checked={on}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          aria-label={label ? undefined : ariaLabel}
          aria-describedby={description ? descId : undefined}
          className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-[30%] border-[1.5px] border-ink-500 bg-ink-900 transition-colors peer-hover:border-bone-dim peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember"
        />
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-[30%]"
          style={{ backgroundColor: color }}
          initial={false}
          animate={filled ? { scale: 1, opacity: 1 } : { scale: 0.35, opacity: 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 620, damping: filled ? 15 : 30 }}
        />
        <AnimatePresence initial={false}>
          {tick && !reduce ? (
            <motion.span
              key="ring"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[30%] border-2"
              style={{ borderColor: color }}
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.9, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ) : null}
        </AnimatePresence>
        <svg
          viewBox="0 0 20 20"
          width={size}
          height={size}
          fill="none"
          stroke={INK}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none relative"
          aria-hidden="true"
        >
          <motion.path
            d="M5.2 10.4 8.5 13.6 14.8 6.8"
            initial={false}
            animate={{ pathLength: tick ? 1 : 0, opacity: tick ? 1 : 0 }}
            transition={draw(tick)}
          />
          <motion.path
            d="M6 10h8"
            initial={false}
            animate={{ pathLength: indeterminate ? 1 : 0, opacity: indeterminate ? 1 : 0 }}
            transition={draw(indeterminate)}
          />
        </svg>
      </span>
      {label || description ? (
        <span className="grid min-w-0 gap-0.5">
          {label ? (
            <label
              htmlFor={inputId}
              className={`select-none text-sm text-bone ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              {label}
            </label>
          ) : null}
          {description ? (
            <span id={descId} className="text-xs leading-relaxed text-bone-dim">
              {description}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
