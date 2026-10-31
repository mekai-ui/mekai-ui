"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type AccordionItem = {
  id: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

type AccordionProps = {
  items: AccordionItem[];
  /** "single" keeps one section open at a time, "multiple" lets any number open. */
  type?: "single" | "multiple";
  /** Section ids open on first render, when uncontrolled. */
  defaultOpen?: string | string[];
  /** Open section ids, for controlled use. */
  value?: string[];
  onValueChange?: (open: string[]) => void;
  /** In single mode, whether the open section can be closed again. */
  collapsible?: boolean;
  className?: string;
};

const toList = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Sections that open with an animated height and a rotating chevron. */
export function Accordion({
  items,
  type = "single",
  defaultOpen,
  value,
  onValueChange,
  collapsible = true,
  className = "",
}: AccordionProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [internal, setInternal] = useState<string[]>(() => {
    const list = toList(defaultOpen);
    return type === "single" ? list.slice(0, 1) : list;
  });
  const open = value ?? internal;

  function toggle(id: string) {
    let next: string[];
    if (open.includes(id)) {
      if (type === "single" && !collapsible) return;
      next = open.filter((x) => x !== id);
    } else {
      next = type === "single" ? [id] : [...open, id];
    }
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  }

  // Arrow keys, Home and End move between section headers.
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const triggers = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-accordion-trigger]:not([disabled])") ?? []);
    const current = triggers.indexOf(e.currentTarget);
    const next =
      e.key === "ArrowDown"
        ? triggers[(current + 1) % triggers.length]
        : e.key === "ArrowUp"
          ? triggers[(current - 1 + triggers.length) % triggers.length]
          : e.key === "Home"
            ? triggers[0]
            : triggers[triggers.length - 1];
    e.preventDefault();
    next?.focus();
  }

  const height = reduce
    ? { duration: 0 }
    : { height: { type: "spring" as const, stiffness: 320, damping: 36 }, opacity: { duration: 0.2 } };

  return (
    <div
      ref={rootRef}
      className={`divide-y divide-ink-700 overflow-hidden rounded-3xl border border-ink-600 bg-ink-900 ${className}`}
    >
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        const triggerId = `${uid}-trigger-${item.id}`;
        const panelId = `${uid}-panel-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button
                id={triggerId}
                type="button"
                data-accordion-trigger=""
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
                onKeyDown={onKeyDown}
                className={`flex w-full items-center gap-4 px-5 py-4 text-left font-display text-[15px] font-bold transition-colors focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isOpen ? "text-bone" : "text-bone-muted hover:text-bone"
                }`}
              >
                <span className="flex-1">{item.title}</span>
                <motion.span
                  aria-hidden="true"
                  initial={false}
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 24 }}
                  className={`grid size-7 shrink-0 place-items-center rounded-full border transition-colors ${
                    isOpen ? "border-ember/50 bg-ember/10 text-ember" : "border-ink-600 text-bone-dim"
                  }`}
                >
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5">
                    <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="panel"
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={height}
                  className="overflow-hidden"
                >
                  <motion.div
                    initial={reduce ? false : { y: -6 }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="px-5 pb-5 text-sm leading-relaxed text-bone-muted"
                  >
                    {item.content}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
