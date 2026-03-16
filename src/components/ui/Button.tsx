import * as React from "react"
import { cn } from "../../lib/utils"

// ─── Variants & Sizes ────────────────────────────────────────────────────────

const variantStyles = {
  default:
    "bg-(--accent) text-[#060b10] hover:bg-(--accent2) border border-(--accent)",
  secondary:
    "bg-(--bg2) text-(--text1) hover:bg-(--bg3) border border-(--border2)",
  outline:
    "bg-transparent text-(--text1) hover:bg-(--bg2) border border-(--border2)",
  ghost:
    "bg-transparent text-(--text2) hover:bg-(--bg2) hover:text-(--text1) border border-transparent",
  destructive:
    "bg-transparent text-red-500 hover:bg-red-500/10 border border-red-500/30",
  link:
    "bg-transparent text-(--accent) hover:text-(--accent2) border border-transparent underline-offset-4 hover:underline p-0 h-auto",
} as const

const sizeStyles = {
  sm:   "h-7  px-2.5 text-[11px] gap-1.5 rounded-[5px]",
  md:   "h-8  px-3.5 text-[13px] gap-2   rounded-[6px]",
  lg:   "h-9  px-5   text-[14px] gap-2   rounded-[7px]",
  icon: "h-8  w-8    text-[13px]         rounded-[6px] justify-center",
} as const

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  keyof typeof variantStyles
  size?:     keyof typeof sizeStyles
  loading?:  boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

// ─── Component ───────────────────────────────────────────────────────────────

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant   = "default",
      size      = "md",
      loading   = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={{ fontFamily: "var(--font-sans)", ...style }}
        className={cn(
          // base
          "inline-flex items-center font-medium transition-all duration-150 cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--accent] focus-visible:ring-offset-1 focus-visible:ring-offset-[--bg0]",
          "active:scale-[0.97]",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {/* left icon / spinner */}
        {loading
          ? <Spinner size={size} />
          : leftIcon && <span className="shrink-0 flex">{leftIcon}</span>
        }

        {/* label */}
        {children && (
          <span className={size === "icon" ? "sr-only" : undefined}>
            {children}
          </span>
        )}

        {/* right icon */}
        {!loading && rightIcon && (
          <span className="shrink-0 flex">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button }
export default Button

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ size }: { size: keyof typeof sizeStyles }) {
  const dim = size === "sm" ? 12 : size === "lg" ? 16 : 14
  return (
    <svg
      width={dim} height={dim}
      viewBox="0 0 16 16"
      fill="none"
      className="animate-spin shrink-0"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6"
        stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
