"use client";

import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useId, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes, type Ref } from "react";

type FloatingInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "size"> & {
  label: string;
  value?: string;
  defaultValue?: string;
  /** true marks the field invalid; a string also shows it as the message. */
  error?: boolean | string;
  /** Helper text shown under the field while there is no error. */
  hint?: string;
  /** Accent for the floated label and the underline. */
  color?: string;
  ref?: Ref<HTMLInputElement>;
  /** Classes for the wrapper. */
  className?: string;
};

const ERROR = "#ff5d5d";

export function FloatingInput({
  label,
  value,
  defaultValue = "",
  onChange,
  onFocus,
  onBlur,
  error,
  hint,
  color = "#ff784f",
  type = "text",
  id,
  disabled,
  placeholder,
  ref,
  className = "",
  ...rest
}: FloatingInputProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-input`;
  const messageId = `${inputId}-message`;
  const reduce = useReducedMotion();
  const [inner, setInner] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [scope, animate] = useAnimate<HTMLDivElement>();

  const current = value ?? inner;
  const floated = focused || current.length > 0;
  const invalid = Boolean(error);
  const message = typeof error === "string" && error ? error : hint;
  const tone = invalid ? ERROR : color;

  // Shake whenever a new error arrives.
  useEffect(() => {
    if (!error || reduce || !scope.current) return;
    animate(scope.current, { x: [0, -9, 8, -6, 4, -2, 0] }, { duration: 0.42, ease: "easeOut" });
  }, [error, reduce, animate, scope]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (value === undefined) setInner(e.target.value);
    onChange?.(e);
  }

  function handleFocus(e: FocusEvent<HTMLInputElement>) {
    setFocused(true);
    onFocus?.(e);
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    setFocused(false);
    onBlur?.(e);
  }

  const labelColor = invalid ? ERROR : focused ? color : floated ? "#b9b0a4" : "#857c71";

  return (
    <div className={`w-full ${disabled ? "opacity-50" : ""} ${className}`}>
      <div
        ref={scope}
        className={`relative h-14 overflow-hidden rounded-xl border bg-ink-900 transition-colors ${
          invalid ? "border-[#ff5d5d]/60" : focused ? "border-ink-500" : "border-ink-600 hover:border-ink-500"
        }`}
      >
        <input
          {...rest}
          ref={ref}
          id={inputId}
          type={type}
          value={current}
          disabled={disabled}
          placeholder={placeholder}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? messageId : undefined}
          className={`peer h-full w-full bg-transparent pb-2 pl-4 pt-6 text-[15px] text-bone outline-none placeholder:text-transparent focus:placeholder:text-bone-dim disabled:cursor-not-allowed ${
            invalid ? "pr-11" : "pr-4"
          }`}
        />
        <motion.label
          htmlFor={inputId}
          className="pointer-events-none absolute left-4 top-[17px] origin-top-left select-none whitespace-nowrap text-[15px] leading-5"
          initial={false}
          animate={{ y: floated ? -9 : 0, scale: floated ? 0.76 : 1, color: labelColor }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }}
        >
          {label}
        </motion.label>
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[2px] origin-center"
          style={{ backgroundColor: tone }}
          initial={false}
          animate={{ scaleX: focused || invalid ? 1 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 }}
        />
        <AnimatePresence initial={false}>
          {invalid ? (
            <motion.span
              key="alert"
              aria-hidden="true"
              className="pointer-events-none absolute right-3.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-[11px] font-black text-ink-950"
              style={{ backgroundColor: ERROR }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.3 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 18 }}
            >
              !
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      <div id={messageId} aria-live="polite" className="min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          {message ? (
            <motion.p
              key={`${invalid ? "error" : "hint"}:${message}`}
              className={`px-1 pt-2 text-xs leading-relaxed ${invalid ? "text-[#ff8a8a]" : "text-bone-dim"}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduce ? 0 : 0.16 }}
            >
              {message}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
