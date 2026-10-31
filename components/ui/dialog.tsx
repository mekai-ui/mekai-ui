"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Close when the blurred backdrop is clicked. Escape always closes. */
  closeOnBackdrop?: boolean;
  /** Show the close button in the corner. */
  showClose?: boolean;
  /**
   * Portal target. Defaults to document.body and covers the viewport.
   * Pass an element to cover only that element; null waits until it exists.
   */
  container?: HTMLElement | null;
  /** Extra classes for the panel. */
  className?: string;
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const noopSubscribe = () => () => {};

/** True only in the browser, after hydration: portals never touch document on the server. */
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** An accessible modal: focus moves in and back out, Tab stays inside, the page behind stops scrolling. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  closeOnBackdrop = true,
  showClose = true,
  container,
  className = "",
}: DialogProps) {
  const isClient = useIsClient();
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // While open: lock scroll, move focus inside, and hand it back to the trigger on close.
  useEffect(() => {
    if (!open || container === null) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const lockTarget = container ?? document.body;
    const gutter = container ? 0 : window.innerWidth - document.documentElement.clientWidth;
    const previous = { overflow: lockTarget.style.overflow, paddingRight: lockTarget.style.paddingRight };
    lockTarget.style.setProperty("overflow", "hidden");
    if (gutter > 0) lockTarget.style.setProperty("padding-right", `${gutter}px`);

    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target = panel.querySelector<HTMLElement>("[data-autofocus]") ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
      target.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(frame);
      lockTarget.style.setProperty("overflow", previous.overflow);
      lockTarget.style.setProperty("padding-right", previous.paddingRight);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, container]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onOpenChange(false);
      return;
    }
    if (e.key !== "Tab") return;
    // Keep Tab and Shift+Tab inside the panel.
    const panel = e.currentTarget;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);
    if (items.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;
    if (e.shiftKey && (current === first || current === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!isClient || container === null) return null;
  const position = container ? "absolute" : "fixed";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div key="dialog" className={`${position} pointer-events-auto inset-0 z-[100] grid place-items-center p-4`}>
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnBackdrop ? () => onOpenChange(false) : undefined}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 6, transition: { duration: 0.16 } }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 30 }}
            className={`relative w-full max-w-md rounded-3xl border border-ink-600 bg-ink-900 p-6 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.95)] outline-none ${className}`}
          >
            <h2 id={titleId} className="pr-8 font-display text-lg font-extrabold text-bone">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-bone-muted">
                {description}
              </p>
            ) : null}
            {children ? <div className="mt-5">{children}</div> : null}
            {/* Last in DOM order, so initial focus lands on the content instead. */}
            {showClose ? (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="absolute right-4 top-4 grid size-8 place-items-center rounded-full text-bone-dim transition-colors hover:bg-ink-700 hover:text-bone"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden="true">
                  <path d="m4 4 8 8m0-8-8 8" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    container ?? document.body,
  );
}
