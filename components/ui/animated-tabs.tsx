"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export type AnimatedTab = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

type AnimatedTabsProps = {
  tabs: AnimatedTab[];
  /** Tab shown first when uncontrolled. Defaults to the first enabled tab. */
  defaultTab?: string;
  /** Active tab id, for controlled use. */
  value?: string;
  onChange?: (id: string) => void;
  variant?: "pill" | "underline";
  /** Color of the sliding indicator. */
  color?: string;
  /** Accessible name of the tab list. */
  label?: string;
  className?: string;
  panelClassName?: string;
};

/** Tabs with a sliding indicator, direction-aware panels and the full ARIA keyboard model. */
export function AnimatedTabs({
  tabs,
  defaultTab,
  value,
  onChange,
  variant = "pill",
  color = "#ff784f",
  label = "Tabs",
  className = "",
  panelClassName = "",
}: AnimatedTabsProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const firstEnabled = tabs.find((t) => !t.disabled)?.id ?? "";
  const [internal, setInternal] = useState(defaultTab ?? firstEnabled);
  // Direction of the last switch, so the panel slides the same way as the indicator.
  const [direction, setDirection] = useState(1);
  const active = value ?? internal;
  const activeIndex = tabs.findIndex((t) => t.id === active);
  const activeTab = tabs[activeIndex];
  const pill = variant === "pill";

  const tabId = (id: string) => `${uid}-tab-${id}`;
  const panelId = (id: string) => `${uid}-panel-${id}`;

  function select(id: string) {
    if (id === active) return;
    setDirection(tabs.findIndex((t) => t.id === id) > activeIndex ? 1 : -1);
    if (value === undefined) setInternal(id);
    onChange?.(id);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const enabled = tabs.filter((t) => !t.disabled);
    if (enabled.length === 0) return;
    const current = enabled.findIndex((t) => tabId(t.id) === (e.target as HTMLElement).id);
    let next: AnimatedTab | undefined;
    if (e.key === "ArrowRight") next = enabled[(current + 1) % enabled.length];
    else if (e.key === "ArrowLeft") next = enabled[(current - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") next = enabled[0];
    else if (e.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    select(next.id);
    document.getElementById(tabId(next.id))?.focus();
  }

  const distance = reduce ? 0 : 14;
  const blur = reduce ? "blur(0px)" : "blur(4px)";
  const panel: Variants = {
    enter: (d: number) => ({ opacity: 0, x: d * distance, filter: blur }),
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (d: number) => ({ opacity: 0, x: d * -distance, filter: blur }),
  };

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className={
          pill
            ? "inline-flex max-w-full gap-1 rounded-full border border-ink-600 bg-ink-900 p-1"
            : "flex max-w-full gap-1 border-b border-ink-600"
        }
      >
        {tabs.map((t) => {
          const selected = t.id === active;
          const focusable = selected || (activeIndex === -1 && t.id === firstEnabled);
          return (
            <button
              key={t.id}
              id={tabId(t.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(t.id)}
              tabIndex={focusable ? 0 : -1}
              disabled={t.disabled}
              onClick={() => select(t.id)}
              className={`relative whitespace-nowrap px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                pill ? "rounded-full py-1.5" : "py-2.5"
              } ${selected ? (pill ? "text-ink-950" : "text-bone") : "text-bone-dim hover:text-bone"}`}
            >
              {selected ? (
                <motion.span
                  layoutId={`${uid}-indicator`}
                  aria-hidden="true"
                  className={pill ? "absolute inset-0 rounded-full" : "absolute inset-x-2 -bottom-px h-0.5 rounded-full"}
                  style={{ backgroundColor: color }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className={`relative mt-4 ${panelClassName}`}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {activeTab ? (
            <motion.div
              key={activeTab.id}
              id={panelId(activeTab.id)}
              role="tabpanel"
              aria-labelledby={tabId(activeTab.id)}
              tabIndex={0}
              custom={direction}
              variants={panel}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl"
            >
              {activeTab.content}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
