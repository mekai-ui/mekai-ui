"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

export type PillNavItem = { label: string; href: string };

/** Props handed to `renderLink`, ready to spread on a router's Link component. */
export type PillNavLinkProps = {
  href: string;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
  "aria-current"?: "page";
  onClick: (e: MouseEvent<HTMLAnchorElement>) => void;
  onPointerEnter?: () => void;
  onFocus?: () => void;
};

type PillNavColors = {
  /** Bar background. */
  bar?: string;
  /** Active pill. */
  pill?: string;
  /** Text on the active pill. */
  pillText?: string;
  /** Resting link text. */
  text?: string;
  /** Hover preview pill. */
  hover?: string;
};

type PillNavProps = {
  items: PillNavItem[];
  /** Current page, for controlled use. */
  activeHref?: string;
  /** Current page when uncontrolled. Defaults to the first item. */
  defaultActiveHref?: string;
  /** Mark or wordmark shown at the start of the bar. */
  logo?: ReactNode;
  /** Accessible name for the logo link. */
  logoLabel?: string;
  logoHref?: string;
  colors?: PillNavColors;
  /** Called on a plain left click. The default navigation is prevented, so a client router can take over. */
  onNavigate?: (href: string, e: MouseEvent<HTMLAnchorElement>) => void;
  /** Render links with your router's component instead of a plain anchor. */
  renderLink?: (props: PillNavLinkProps, item: PillNavItem) => ReactNode;
  /** "auto" folds into a menu button when the nav is narrower than 36rem. */
  collapse?: "auto" | "always" | "never";
  align?: "start" | "center" | "end";
  /** Accessible name of the nav. */
  label?: string;
  className?: string;
};

const DEFAULT_COLORS: Required<PillNavColors> = {
  bar: "#171412",
  pill: "#ff784f",
  pillText: "#070606",
  text: "#b9b0a4",
  hover: "rgb(255 255 255 / 0.07)",
};

const ALIGN = { start: "justify-start", center: "justify-center", end: "justify-end" };

// Literal class names, so Tailwind sees every container-query variant.
const LAYOUT = {
  auto: { bar: "hidden @xl:flex", compact: "flex @xl:hidden" },
  always: { bar: "hidden", compact: "flex" },
  never: { bar: "flex", compact: "hidden" },
};

const isPlainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** A pill navbar: the active pill slides between links, a softer pill previews where you point. Folds into a menu on narrow layouts. */
export function PillNav({
  items,
  activeHref,
  defaultActiveHref,
  logo,
  logoLabel = "Home",
  logoHref = "/",
  colors,
  onNavigate,
  renderLink,
  collapse = "auto",
  align = "center",
  label = "Main",
  className = "",
}: PillNavProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const c = { ...DEFAULT_COLORS, ...colors };
  const [internal, setInternal] = useState(defaultActiveHref ?? items[0]?.href ?? "");
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const active = activeHref ?? internal;
  const layout = LAYOUT[collapse];
  const panelId = `${uid}-panel`;
  const spring = reduce ? { duration: 0 } : ({ type: "spring", stiffness: 420, damping: 34 } as const);

  // The compact menu closes on Escape and on a pointer down outside.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function go(href: string, e: MouseEvent<HTMLAnchorElement>) {
    setMenuOpen(false);
    if (activeHref === undefined) setInternal(href);
    if (onNavigate && isPlainClick(e)) {
      e.preventDefault();
      onNavigate(href, e);
    }
  }

  function link(props: PillNavLinkProps, item: PillNavItem) {
    if (renderLink) return renderLink(props, item);
    const { children, ...rest } = props;
    return <a {...rest}>{children}</a>;
  }

  function onListBlur(e: FocusEvent<HTMLUListElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(null);
  }

  const logoNode = logo ? (
    <a
      href={logoHref}
      aria-label={logoLabel}
      onClick={(e) => go(logoHref, e)}
      className="grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-black"
      style={{ backgroundColor: c.pill, color: c.pillText }}
    >
      {logo}
    </a>
  ) : null;

  return (
    <nav ref={rootRef} aria-label={label} className={`@container relative w-full ${className}`}>
      <div className={`flex ${ALIGN[align]}`}>
        {/* Full bar */}
        <div className={`${layout.bar} items-center gap-1 rounded-full p-1`} style={{ backgroundColor: c.bar }}>
          {logoNode}
          <ul className="flex items-center gap-0.5" onPointerLeave={() => setHovered(null)} onBlur={onListBlur}>
            {items.map((item) => {
              const isActive = item.href === active;
              return (
                <li key={item.href}>
                  {link(
                    {
                      href: item.href,
                      "aria-current": isActive ? "page" : undefined,
                      onClick: (e) => go(item.href, e),
                      onPointerEnter: () => setHovered(item.href),
                      onFocus: () => setHovered(item.href),
                      className:
                        "relative block whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200",
                      style: { color: isActive ? c.pillText : hovered === item.href ? "#f4ede3" : c.text },
                      children: (
                        <>
                          {hovered === item.href && !isActive ? (
                            <motion.span
                              layoutId={`${uid}-hover`}
                              aria-hidden="true"
                              className="absolute inset-0 rounded-full"
                              style={{ backgroundColor: c.hover }}
                              transition={spring}
                            />
                          ) : null}
                          {isActive ? (
                            <motion.span
                              layoutId={`${uid}-active`}
                              aria-hidden="true"
                              className="absolute inset-0 rounded-full"
                              style={{ backgroundColor: c.pill }}
                              transition={spring}
                            />
                          ) : null}
                          <span className="relative">{item.label}</span>
                        </>
                      ),
                    },
                    item,
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Compact bar */}
        <div className={`${layout.compact} w-full items-center justify-between gap-2 rounded-full p-1`} style={{ backgroundColor: c.bar }}>
          {logoNode ?? <span />}
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={menuOpen}
            aria-controls={panelId}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-10 items-center gap-2.5 rounded-full px-4 text-sm font-semibold text-bone transition-colors hover:bg-white/5"
          >
            {items.find((i) => i.href === active)?.label ?? "Menu"}
            <span className="relative block h-3 w-4" aria-hidden="true">
              <motion.span
                className="absolute left-0 right-0 top-0.5 h-0.5 rounded-full bg-current"
                animate={menuOpen ? { y: 3, rotate: 45 } : { y: 0, rotate: 0 }}
                transition={spring}
              />
              <motion.span
                className="absolute bottom-0.5 left-0 right-0 h-0.5 rounded-full bg-current"
                animate={menuOpen ? { y: -3, rotate: -45 } : { y: 0, rotate: 0 }}
                transition={spring}
              />
            </span>
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            id={panelId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.14 } }}
            transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 460, damping: 32 }}
            style={{ backgroundColor: c.bar, transformOrigin: "50% 0%" }}
            className={`absolute inset-x-0 top-full z-50 mt-2 rounded-3xl p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] ${
              collapse === "never" ? "hidden" : collapse === "auto" ? "@xl:hidden" : ""
            }`}
          >
            <ul className="space-y-1">
              {items.map((item, i) => {
                const isActive = item.href === active;
                return (
                  <motion.li
                    key={item.href}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: reduce ? 0 : 0.03 * i }}
                  >
                    {link(
                      {
                        href: item.href,
                        "aria-current": isActive ? "page" : undefined,
                        onClick: (e) => go(item.href, e),
                        className: "flex items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold transition-colors hover:bg-white/5",
                        style: isActive ? { backgroundColor: c.pill, color: c.pillText } : { color: "#f4ede3" },
                        children: (
                          <>
                            {item.label}
                            {isActive ? <span className="text-xs font-bold opacity-70">Current</span> : null}
                          </>
                        ),
                      },
                      item,
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
