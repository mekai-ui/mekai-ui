import type { ButtonHTMLAttributes } from "react";

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "ember" | "gold";
};

const tones = {
  ember: "bg-ember text-black shadow-[0_5px_0_0_#8a3207,0_5px_0_3px_#000] hover:bg-[#ff7d38]",
  gold: "bg-gold text-black shadow-[0_5px_0_0_#9a6a0e,0_5px_0_3px_#000] hover:bg-[#ffd06e]",
};

/** Chunky 8-bit button that physically presses down. */
export function PixelButton({ tone = "ember", className = "", children, ...props }: PixelButtonProps) {
  return (
    <button
      {...props}
      className={`relative select-none px-5 py-3 font-pixel text-sm uppercase tracking-wide outline-[3px] outline-black [outline-style:solid] transition-[transform,box-shadow] duration-75 active:translate-y-[5px] active:shadow-[0_0_0_0_#000] disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}
