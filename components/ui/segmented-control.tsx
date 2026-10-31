"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export type SegmentOption = string | { value: string; label: ReactNode; disabled?: boolean };

type SegmentedControlProps = {
  options: SegmentOption[];
  /** Selected value, for controlled use. */
  value?: string;
  /** Selected value when uncontrolled. Defaults to the first option. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md" | "lg";
  /** "ink" is a raised neutral thumb, "accent" fills it with the brand color. */
  tone?: "ink" | "accent";
  /** Accessible name of the group. */
  label?: string;
  className?: string;
};

const SIZES = {
  sm: "h-7 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

/** A compact single-choice control with a thumb that slides to the selected segment. */
export function SegmentedControl({
  options,
  value,
  defaultValue,
  onChange,
  size = "md",
  tone = "ink",
  label = "Options",
  className = "",
}: SegmentedControlProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o, disabled: false } : o));
  const [internal, setInternal] = useState(defaultValue ?? items.find((i) => !i.disabled)?.value ?? "");
  const selected = value ?? internal;
  const hasSelection = items.some((i) => i.value === selected);

  function choose(next: string) {
    if (next === selected) return;
    if (value === undefined) setInternal(next);
    onChange?.(next);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.filter((i) => !i.disabled);
    if (enabled.length === 0) return;
    const current = enabled.findIndex((i) => i.value === selected);
    let next: (typeof items)[number] | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = enabled[(current + 1) % enabled.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = enabled[(current - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    choose(next.value);
    const index = items.indexOf(next);
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index]?.focus();
  }

  const thumb =
    tone === "accent"
      ? "bg-ember shadow-[0_6px_18px_-8px_rgb(255_120_79/0.8)]"
      : "bg-ink-600 shadow-[inset_0_1px_0_rgb(255_255_255/0.07),0_6px_16px_-6px_rgb(0_0_0/0.9)]";
  const activeText = tone === "accent" ? "text-ink-950" : "text-bone";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={`inline-grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-ink-600 bg-ink-900 p-1 ${className}`}
    >
      {items.map((item, i) => {
        const checked = item.value === selected;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (!hasSelection && i === 0) ? 0 : -1}
            disabled={item.disabled}
            onClick={() => choose(item.value)}
            className={`relative whitespace-nowrap rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${SIZES[size]} ${
              checked ? activeText : "text-bone-dim hover:text-bone"
            }`}
          >
            {checked ? (
              <motion.span
                layoutId={`${uid}-thumb`}
                aria-hidden="true"
                className={`absolute inset-0 rounded-lg ${thumb}`}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
              />
            ) : null}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
