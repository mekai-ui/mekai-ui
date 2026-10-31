"use client";

import { motion, useAnimate, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";

type TrueFocusProps = {
  text: string;
  /** "auto" moves the focus on a timer, "manual" follows the pointer and keyboard only. */
  mode?: "auto" | "manual";
  /** Milliseconds per word in auto mode. */
  interval?: number;
  /** Blur in pixels for the words out of focus. */
  blur?: number;
  frameColor?: string;
  /** Space in pixels between a word and its frame. */
  padding?: number;
  className?: string;
};

const CORNERS: { className: string; sides: (keyof CSSProperties)[] }[] = [
  { className: "left-0 top-0 rounded-tl-[0.1em]", sides: ["borderTopWidth", "borderLeftWidth"] },
  { className: "right-0 top-0 rounded-tr-[0.1em]", sides: ["borderTopWidth", "borderRightWidth"] },
  { className: "bottom-0 left-0 rounded-bl-[0.1em]", sides: ["borderBottomWidth", "borderLeftWidth"] },
  { className: "bottom-0 right-0 rounded-br-[0.1em]", sides: ["borderBottomWidth", "borderRightWidth"] },
];

/** A sentence where one word at a time is sharp, framed by corner brackets that glide between words. */
export function TrueFocus({
  text,
  mode = "auto",
  interval = 1800,
  blur = 5,
  frameColor = "#ff784f",
  padding = 10,
  className = "",
}: TrueFocusProps) {
  const words = text.split(/\s+/).filter(Boolean);
  const count = words.length;
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const [frame, animate] = useAnimate<HTMLSpanElement>();
  const placed = useRef(false);
  const currentRef = useRef(0);
  const current = count ? index % count : 0;

  // Auto mode: step through the words, pausing while the reader is pointing or tabbing.
  useEffect(() => {
    if (mode !== "auto" || hovering || focused || reduce || count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), Math.max(400, interval));
    return () => clearInterval(id);
  }, [mode, hovering, focused, reduce, count, interval]);

  useEffect(() => {
    const place = (i: number, instant: boolean) => {
      const word = root.current?.querySelector<HTMLElement>(`[data-word="${i}"]`);
      if (!word || !frame.current) return;
      animate(
        frame.current,
        {
          x: word.offsetLeft - padding,
          y: word.offsetTop - padding,
          width: word.offsetWidth + padding * 2,
          height: word.offsetHeight + padding * 2,
          opacity: 1,
        },
        instant || reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 },
      );
    };
    currentRef.current = current;
    place(current, !placed.current);
    placed.current = true;
  }, [current, padding, reduce, animate, frame]);

  // Keep the frame on its word when the text reflows.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const word = el.querySelector<HTMLElement>(`[data-word="${currentRef.current}"]`);
      if (!word || !frame.current) return;
      animate(
        frame.current,
        {
          x: word.offsetLeft - padding,
          y: word.offsetTop - padding,
          width: word.offsetWidth + padding * 2,
          height: word.offsetHeight + padding * 2,
        },
        { duration: 0 },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [padding, animate, frame]);

  const border = "max(2px, 0.045em)";

  return (
    <span
      ref={root}
      className={`relative inline-block ${className}`}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
    >
      {words.map((word, i) => {
        const sharp = reduce || i === current;
        return (
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <motion.span
              data-word={i}
              tabIndex={0}
              className="relative inline-block focus-visible:outline-none"
              onPointerEnter={() => setIndex(i)}
              onFocus={() => {
                setIndex(i);
                setFocused(true);
              }}
              onBlur={() => setFocused(false)}
              initial={false}
              animate={{ filter: sharp ? "blur(0px)" : `blur(${blur}px)`, opacity: sharp ? 1 : 0.55 }}
              transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
            >
              {word}
            </motion.span>
          </Fragment>
        );
      })}
      <span
        ref={frame}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0"
        style={{ opacity: 0, filter: `drop-shadow(0 0 0.12em ${frameColor}99)` }}
      >
        {CORNERS.map((corner, i) => (
          <span
            key={i}
            className={`absolute size-[0.3em] min-h-2.5 min-w-2.5 border-solid ${corner.className}`}
            style={{
              borderColor: frameColor,
              borderWidth: 0,
              ...Object.fromEntries(corner.sides.map((side) => [side, border])),
            }}
          />
        ))}
      </span>
    </span>
  );
}
