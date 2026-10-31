"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type AnimatedListItem = {
  id: string;
  label: string;
  description?: string;
  /** Short text on the right, such as a count or a date. */
  meta?: string;
};

type AnimatedListProps = {
  /** Strings or { id, label, description?, meta? } objects. */
  items: (string | AnimatedListItem)[];
  onSelect?: (item: AnimatedListItem, index: number) => void;
  /** Selected id, for controlled use. */
  selectedId?: string | null;
  defaultSelectedId?: string;
  /** Fade the top and bottom edges while there is more to scroll. */
  showGradients?: boolean;
  /** Show the scrollbar. */
  displayScrollbar?: boolean;
  /** Maximum height of the scroll area in pixels. */
  maxHeight?: number;
  /** Color the edge fades blend into. Match it to the list background. */
  fadeColor?: string;
  /** Accessible name of the list. */
  label?: string;
  className?: string;
};

const normalize = (item: string | AnimatedListItem, i: number): AnimatedListItem =>
  typeof item === "string" ? { id: `${i}-${item}`, label: item } : item;

/** A scrollable list whose rows pop in as they appear, with keyboard selection and edge fades. */
export function AnimatedList({
  items,
  onSelect,
  selectedId,
  defaultSelectedId,
  showGradients = true,
  displayScrollbar = true,
  maxHeight = 360,
  fadeColor = "#0c0a09",
  label = "Items",
  className = "",
}: AnimatedListProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(-1);
  const [internal, setInternal] = useState<string | null>(defaultSelectedId ?? null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const rows = items.map(normalize);
  const selected = selectedId === undefined ? internal : selectedId;
  const optionId = (i: number) => `${uid}-option-${i}`;

  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const top = el.scrollTop > 2;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
    setEdges((e) => (e.top === top && e.bottom === bottom ? e : { top, bottom }));
  }, []);

  // Recheck the fades when the list or its content changes size.
  useEffect(() => {
    const el = listRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(content);
    return () => observer.disconnect();
  }, [measure]);

  /** Scroll the container, never the page, just enough to show the row. */
  function reveal(index: number) {
    const box = listRef.current;
    const el = document.getElementById(optionId(index));
    if (!box || !el) return;
    const pad = 8;
    const behavior = reduce ? "auto" : "smooth";
    if (el.offsetTop - pad < box.scrollTop) box.scrollTo({ top: el.offsetTop - pad, behavior });
    else if (el.offsetTop + el.offsetHeight + pad > box.scrollTop + box.clientHeight) {
      box.scrollTo({ top: el.offsetTop + el.offsetHeight + pad - box.clientHeight, behavior });
    }
  }

  function move(index: number) {
    const next = Math.max(0, Math.min(rows.length - 1, index));
    setActive(next);
    reveal(next);
  }

  function choose(index: number) {
    const row = rows[index];
    if (!row) return;
    setActive(index);
    if (selectedId === undefined) setInternal(row.id);
    onSelect?.(row, index);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (rows.length === 0) return;
    const from = active < 0 ? Math.max(0, rows.findIndex((r) => r.id === selected)) : active;
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(active < 0 ? from : from + 1),
      ArrowUp: () => move(active < 0 ? from : from - 1),
      PageDown: () => move(from + 5),
      PageUp: () => move(from - 5),
      Home: () => move(0),
      End: () => move(rows.length - 1),
      Enter: () => choose(from),
      " ": () => choose(from),
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  }

  const scrollbar = displayScrollbar ? "thin-scroll" : "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-ink-600 bg-ink-900 ${className}`}>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onScroll={measure}
        onPointerLeave={() => setActive(-1)}
        className={`relative overflow-y-auto p-2 focus-visible:-outline-offset-2 ${scrollbar}`}
        style={{ maxHeight }}
      >
        <ul ref={contentRef} role="presentation" className="space-y-1.5">
          {rows.map((row, i) => {
            const isSelected = row.id === selected;
            const isActive = i === active;
            return (
              <motion.li
                key={row.id}
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                onPointerMove={() => i !== active && setActive(i)}
                onClick={() => choose(i)}
                initial={reduce ? false : { opacity: 0, scale: 0.86, y: 8 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ root: listRef, amount: 0.35 }}
                transition={{ type: "spring", stiffness: 420, damping: 30 }}
                className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                  isSelected ? "border-ember/60 bg-ember/10" : isActive ? "border-ink-500 bg-ink-700" : "border-ink-700 bg-ink-850"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${isSelected || isActive ? "text-bone" : "text-bone-muted"}`}>
                    {row.label}
                  </span>
                  {row.description ? <span className="mt-0.5 block truncate text-xs text-bone-dim">{row.description}</span> : null}
                </span>
                {row.meta ? <span className="shrink-0 text-xs tabular-nums text-bone-dim">{row.meta}</span> : null}
                {isSelected ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-ember" aria-hidden="true">
                    <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </motion.li>
            );
          })}
        </ul>
      </div>
      {showGradients ? (
        <>
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-14"
            style={{ background: `linear-gradient(to bottom, ${fadeColor}, transparent)` }}
            initial={false}
            animate={{ opacity: edges.top ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
            style={{ background: `linear-gradient(to top, ${fadeColor}, transparent)` }}
            initial={false}
            animate={{ opacity: edges.bottom ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />
        </>
      ) : null}
    </div>
  );
}
