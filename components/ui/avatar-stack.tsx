"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

export type AvatarPerson = { name: string; color?: string };

type AvatarStackProps = {
  people: AvatarPerson[];
  /** Avatars shown before the "+N" bubble. */
  max?: number;
  /** Avatar diameter in pixels. */
  size?: number;
  /** Ring between overlapping avatars. Match it to the surface behind the stack. */
  ringColor?: string;
  className?: string;
};

const PALETTE = ["#ff784f", "#ffc24a", "#ffa585", "#9ad7b5", "#a9b8ff", "#e7b6ff", "#f4ede3"];

function colorFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Overlapping avatars that fan out with names on hover or focus. */
export function AvatarStack({ people, max = 4, size = 40, ringColor = "#070606", className = "" }: AvatarStackProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const shown = people.slice(0, Math.max(1, max));
  const extra = people.length - shown.length;
  const slots = shown.length + (extra > 0 ? 1 : 0);
  const step = open ? size + 12 : size * 0.68;
  const width = size + step * Math.max(0, slots - 1);
  const spring = reduce ? { duration: 0 } : ({ type: "spring", stiffness: 420, damping: 30 } as const);
  const fontSize = Math.round(size * 0.36);
  const names = people.map((p) => p.name).join(", ");

  const face = { width: size, height: size, fontSize, boxShadow: `0 0 0 3px ${ringColor}` };

  return (
    <motion.div
      role="group"
      aria-label={`${people.length} ${people.length === 1 ? "person" : "people"}: ${names}`}
      tabIndex={0}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      initial={false}
      animate={{ width }}
      transition={spring}
      className={`relative shrink-0 rounded-full ${className}`}
      style={{ height: size }}
    >
      {shown.map((person, i) => (
        <motion.div
          key={`${person.name}-${i}`}
          aria-hidden="true"
          className="absolute left-0 top-0"
          initial={false}
          animate={{ x: i * step }}
          transition={spring}
          style={{ zIndex: slots - i }}
        >
          <motion.span
            title={person.name}
            whileHover={reduce ? undefined : { y: -4, scale: 1.06 }}
            transition={spring}
            className="grid place-items-center rounded-full font-display font-extrabold text-ink-950"
            style={{ ...face, backgroundColor: person.color ?? colorFor(person.name) }}
          >
            {initials(person.name)}
          </motion.span>
          <AnimatePresence>
            {open ? (
              <motion.span
                initial={{ opacity: 0, y: reduce ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: reduce ? 0 : 0.2, delay: reduce ? 0 : i * 0.03 }}
                className="absolute left-1/2 top-full mt-2 -translate-x-1/2 truncate text-center text-[11px] font-semibold text-bone-muted"
                style={{ maxWidth: size + 10 }}
              >
                {person.name.split(" ")[0]}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ))}

      {extra > 0 ? (
        <motion.div
          aria-hidden="true"
          className="absolute left-0 top-0"
          initial={false}
          animate={{ x: shown.length * step }}
          transition={spring}
          style={{ zIndex: 0 }}
        >
          <span
            title={people
              .slice(shown.length)
              .map((p) => p.name)
              .join(", ")}
            className="grid place-items-center rounded-full bg-ink-700 font-semibold text-bone-muted"
            style={face}
          >
            +{extra}
          </span>
          <AnimatePresence>
            {open ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: reduce ? 0 : 0.2, delay: reduce ? 0 : shown.length * 0.03 }}
                className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-bone-dim"
              >
                more
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
