"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";

type RollingCounterProps = {
  value: number;
  /** Font size in pixels. */
  fontSize?: number;
  /** Integer digits to show: a number pads with zeros, "auto" uses as many as needed. */
  places?: number | "auto";
  /** Digits after the decimal point. */
  decimals?: number;
  /** Thousands separator, such as "," or " ". Empty for none. */
  separator?: string;
  decimalPoint?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Roll duration per digit, in seconds. */
  duration?: number;
  /** Delay between neighbouring digits, in seconds, starting from the right. */
  stagger?: number;
  color?: string;
  className?: string;
};

type Token =
  | { kind: "digit"; key: string; digit: number; order: number }
  | { kind: "text"; key: string; text: string };

const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const ROW = 1.15;

/** An odometer: each digit column rolls the shortest way to its new value, one after another. */
export function RollingCounter({
  value,
  fontSize = 48,
  places = "auto",
  decimals = 0,
  separator = "",
  decimalPoint = ".",
  prefix,
  suffix,
  duration = 0.8,
  stagger = 0.04,
  color = "#f4ede3",
  className = "",
}: RollingCounterProps) {
  const reduce = useReducedMotion() ?? false;
  const safe = Number.isFinite(value) ? value : 0;
  const fixed = Math.abs(safe).toFixed(Math.max(0, decimals));
  const [intPart, fracPart = ""] = fixed.split(".");
  const negative = safe < 0 && Number(fixed) !== 0;
  const intDigits = typeof places === "number" ? intPart.padStart(places, "0") : intPart;

  // Tokens are keyed by place value, so a new leading digit grows in without disturbing the others.
  const tokens: Token[] = [];
  if (negative) tokens.push({ kind: "text", key: "sign", text: "−" });
  intDigits.split("").forEach((ch, i) => {
    const place = intDigits.length - 1 - i;
    tokens.push({ kind: "digit", key: `i${place}`, digit: Number(ch), order: place + fracPart.length });
    if (separator && place > 0 && place % 3 === 0) tokens.push({ kind: "text", key: `s${place}`, text: separator });
  });
  if (fracPart) {
    tokens.push({ kind: "text", key: "point", text: decimalPoint });
    fracPart.split("").forEach((ch, k) => {
      tokens.push({ kind: "digit", key: `f${k}`, digit: Number(ch), order: fracPart.length - 1 - k });
    });
  }

  const readable = `${negative ? "-" : ""}${intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, separator)}${fracPart ? decimalPoint + fracPart : ""}`;
  const grow = reduce ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <span
      className={`inline-flex items-baseline font-display font-black leading-none tabular-nums ${className}`}
      style={{ fontSize, color }}
    >
      {prefix ? <span className="mr-[0.08em]">{prefix}</span> : null}
      <span className="sr-only">{readable}</span>
      <span aria-hidden="true" className="inline-flex">
        <AnimatePresence initial={false}>
          {tokens.map((t) =>
            t.kind === "digit" ? (
              <motion.span
                key={t.key}
                className="inline-block overflow-hidden"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={grow}
              >
                <Digit digit={t.digit} delay={reduce ? 0 : t.order * stagger} duration={duration} reduce={reduce} />
              </motion.span>
            ) : (
              <motion.span
                key={t.key}
                className="inline-block overflow-hidden whitespace-pre"
                style={{ height: `${ROW}em`, lineHeight: `${ROW}em` }}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={grow}
              >
                {t.text}
              </motion.span>
            ),
          )}
        </AnimatePresence>
      </span>
      {suffix ? <span className="ml-[0.08em]">{suffix}</span> : null}
    </span>
  );
}

function Digit({ digit, delay, duration, reduce }: { digit: number; delay: number; duration: number; reduce: boolean }) {
  // An unbounded position: 9 → 0 goes to 10, not back down through 8…1.
  const pos = useMotionValue(digit);
  const y = useTransform(pos, (p) => `${-((((p % 10) + 10) % 10) / STRIP.length) * 100}%`);

  useEffect(() => {
    const current = pos.get();
    const from = ((current % 10) + 10) % 10;
    let delta = digit - from;
    if (delta > 5) delta -= 10;
    else if (delta < -5) delta += 10;
    if (Math.abs(delta) < 1e-6) return;
    const controls = animate(pos, current + delta, reduce ? { duration: 0 } : { duration, delay, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [digit, delay, duration, reduce, pos]);

  return (
    <span className="relative block overflow-hidden" style={{ height: `${ROW}em` }}>
      <motion.span className="block" style={{ y }}>
        {STRIP.map((d, i) => (
          <span key={i} className="block text-center" style={{ height: `${ROW}em`, lineHeight: `${ROW}em` }}>
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}
