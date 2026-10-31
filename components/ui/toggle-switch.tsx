"use client";

import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform, useVelocity } from "motion/react";
import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from "react";

type ToggleSize = "sm" | "md" | "lg";

type ToggleSwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  /** Puts the label before the switch, as in a settings row. */
  labelPosition?: "start" | "end";
  size?: ToggleSize;
  color?: string;
  /** Shows a check and a cross inside the knob. */
  showIcons?: boolean;
  disabled?: boolean;
  name?: string;
  value?: string;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

const SIZES: Record<ToggleSize, { w: number; h: number; pad: number; icon: number }> = {
  sm: { w: 36, h: 20, pad: 2, icon: 9 },
  md: { w: 46, h: 26, pad: 3, icon: 11 },
  lg: { w: 58, h: 32, pad: 3, icon: 13 },
};

const TRACK_OFF = "#2d2824";

export function ToggleSwitch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  labelPosition = "end",
  size = "md",
  color = "#ff784f",
  showIcons = false,
  disabled = false,
  name,
  value = "on",
  id,
  "aria-label": ariaLabel,
  className = "",
}: ToggleSwitchProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-switch`;
  const descId = `${inputId}-description`;
  const reduce = useReducedMotion();
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;

  const s = SIZES[size];
  const knob = s.h - s.pad * 2;
  const travel = s.w - s.pad * 2 - knob;

  // The knob rides a spring; its speed stretches it, so it squashes back as it lands.
  const x = useSpring(on ? travel : 0, { stiffness: 520, damping: 30, mass: 0.7 });
  const speed = useVelocity(x);
  const vMax = travel * 11;
  const stretch = useTransform(speed, [-vMax, 0, vMax], [1.42, 1, 1.42]);
  const squash = useTransform(speed, [-vMax, 0, vMax], [0.86, 1, 0.86]);

  useEffect(() => {
    const target = on ? travel : 0;
    if (reduce) x.jump(target);
    else x.set(target);
  }, [on, travel, reduce, x]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    if (checked === undefined) setInner(next);
    onCheckedChange?.(next);
  }

  const control = (
    <span className={`relative inline-flex shrink-0 ${description ? "mt-0.5" : ""}`} style={{ width: s.w, height: s.h }}>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        name={name}
        value={value}
        checked={on}
        disabled={disabled}
        onChange={handleChange}
        aria-label={label ? undefined : ariaLabel}
        aria-describedby={description ? descId : undefined}
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
      />
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 rounded-full shadow-[inset_0_1px_3px_rgb(0_0_0/0.45)] ring-1 ring-inset ring-white/10 peer-hover:ring-white/20 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember"
        initial={false}
        animate={{ backgroundColor: on ? color : TRACK_OFF }}
        transition={{ duration: reduce ? 0 : 0.22 }}
      />
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute grid place-items-center"
        style={{ x, left: s.pad, top: s.pad, width: knob, height: knob }}
      >
        <motion.span
          className="absolute inset-0 rounded-full bg-bone shadow-[0_2px_6px_rgb(0_0_0/0.45)]"
          style={{ scaleX: stretch, scaleY: squash }}
        />
        {showIcons ? (
          <AnimatePresence initial={false} mode="wait">
            <motion.svg
              key={on ? "on" : "off"}
              viewBox="0 0 12 12"
              width={s.icon}
              height={s.icon}
              fill="none"
              stroke={on ? color : "#857c71"}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3, rotate: on ? -60 : 60 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3 }}
              transition={{ duration: reduce ? 0 : 0.16 }}
            >
              {on ? <path d="M2.5 6.4 5 8.8l4.5-5.3" /> : <path d="M3.2 3.2l5.6 5.6M8.8 3.2 3.2 8.8" />}
            </motion.svg>
          </AnimatePresence>
        ) : null}
      </motion.span>
    </span>
  );

  if (!label && !description) {
    return <span className={`inline-flex ${disabled ? "opacity-50" : ""} ${className}`}>{control}</span>;
  }

  return (
    <div
      className={`inline-flex gap-3 ${description ? "items-start" : "items-center"} ${
        labelPosition === "start" ? "flex-row-reverse justify-between" : ""
      } ${disabled ? "opacity-50" : ""} ${className}`}
    >
      {control}
      <span className="grid min-w-0 gap-0.5">
        {label ? (
          <label
            htmlFor={inputId}
            className={`select-none text-sm font-medium text-bone ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
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
    </div>
  );
}
