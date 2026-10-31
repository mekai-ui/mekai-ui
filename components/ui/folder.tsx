"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue, type Transition } from "motion/react";
import { useState, type PointerEvent, type ReactNode } from "react";

type FolderProps = {
  /** Folder color. The back panel and tab use a darker shade of it. */
  color?: string;
  /** Scale factor. 1 is 120 × 96 pixels. */
  size?: number;
  /** Up to three papers. Keep them non-interactive: they sit inside a button. */
  items?: ReactNode[];
  /** Open state, for controlled use. */
  open?: boolean;
  defaultOpen?: boolean;
  /** Called when the folder is clicked, with the requested state. */
  onOpenChange?: (open: boolean) => void;
  /** Peek inside while the pointer is over the folder. */
  openOnHover?: boolean;
  /** Accessible name of the button. */
  label?: string;
  className?: string;
};

const W = 120;
const H = 96;

/** A folder that opens on hover or click, fanning its papers out; the papers lean toward the pointer. */
export function Folder({
  color = "#ff784f",
  size = 1,
  items,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  openOnHover = true,
  label = "Folder",
  className = "",
}: FolderProps) {
  const reduce = useReducedMotion() ?? false;
  const [pinned, setPinned] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);
  // After a click closes the folder, ignore hover until the pointer leaves.
  const [quiet, setQuiet] = useState(false);
  const open = controlled ?? (pinned || (openOnHover && hovered && !quiet));
  const papers = (items ?? [null, null, null]).slice(0, 3);
  const dark = `color-mix(in srgb, ${color} 72%, black)`;

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 220, damping: 18 });
  const sy = useSpring(py, { stiffness: 220, damping: 18 });

  function onClick() {
    const next = !open;
    onOpenChange?.(next);
    if (controlled !== undefined) return;
    setPinned(next);
    if (!next) setQuiet(true);
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set(((e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)) * 7);
    py.set(((e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)) * 5);
  }

  function onPointerLeave() {
    setHovered(false);
    setQuiet(false);
    px.set(0);
    py.set(0);
  }

  const spring: Transition = reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 22 };

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      className={`relative inline-block shrink-0 rounded-2xl ${className}`}
      style={{ width: W * size, height: H * size }}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 block"
        style={{ width: W, height: H, transform: `scale(${size})`, transformOrigin: "0 0", perspective: 600 }}
      >
        {/* Back panel and tab */}
        <span className="absolute left-0 top-0 h-5 w-[46px] rounded-t-[10px]" style={{ backgroundColor: dark }} />
        <span className="absolute inset-x-0 bottom-0 top-3 rounded-[14px] rounded-tl-none" style={{ backgroundColor: dark }} />

        {/* Papers */}
        {papers.map((content, i) => (
          <Paper key={i} index={i} total={papers.length} open={open} spring={spring} sx={sx} sy={sy}>
            {content}
          </Paper>
        ))}

        {/* Front flap */}
        <motion.span
          className="absolute inset-x-0 bottom-0 block h-[78%] rounded-[14px]"
          style={{
            zIndex: 10,
            transformOrigin: "50% 100%",
            backgroundColor: color,
            backgroundImage: "linear-gradient(to bottom, rgb(255 255 255 / 0.18), transparent 45%)",
            boxShadow: "0 -1px 0 rgb(255 255 255 / 0.25) inset",
          }}
          initial={false}
          animate={open ? { rotateX: -42, skewX: -4 } : { rotateX: 0, skewX: 0 }}
          transition={spring}
        />
      </span>
    </button>
  );
}

function Paper({
  index,
  total,
  open,
  spring,
  sx,
  sy,
  children,
}: {
  index: number;
  total: number;
  open: boolean;
  spring: Transition;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  children: ReactNode;
}) {
  // Spread the papers around the middle: -1, 0, 1 for three.
  const k = index - (total - 1) / 2;
  const depth = 0.6 + index * 0.25;
  const x = useTransform(sx, (v) => v * depth);
  const y = useTransform(sy, (v) => v * depth);
  return (
    <motion.span
      className="absolute bottom-2 left-1/2 block h-16 w-[84px] -translate-x-1/2"
      initial={false}
      animate={open ? { x: k * 26, y: -30 + Math.abs(k) * 7, rotate: k * 11 } : { x: k * 2, y: 0, rotate: 0 }}
      transition={{ ...spring, delay: open ? index * 0.04 : 0 }}
      style={{ zIndex: index }}
    >
      <motion.span
        className="grid size-full place-items-center overflow-hidden rounded-lg bg-bone p-1.5 text-[10px] font-semibold leading-tight text-ink-950 shadow-[0_6px_14px_-6px_rgb(0_0_0/0.6)]"
        style={{ x, y }}
      >
        {children ?? (
          <span className="block w-full space-y-1">
            <span className="block h-1 w-3/4 rounded-full bg-ink-950/20" />
            <span className="block h-1 w-full rounded-full bg-ink-950/15" />
            <span className="block h-1 w-2/3 rounded-full bg-ink-950/15" />
          </span>
        )}
      </motion.span>
    </motion.span>
  );
}
