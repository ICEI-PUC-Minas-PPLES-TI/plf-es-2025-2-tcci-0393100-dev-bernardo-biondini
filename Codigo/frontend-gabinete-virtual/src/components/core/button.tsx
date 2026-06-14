import type { ButtonHTMLAttributes } from "react";
import { cx } from "./utils";

type ButtonTone =
  | "primary"
  | "neutral"
  | "danger"
  | "warning"
  | "success";
type ButtonVariant = "solid" | "soft" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

const baseClassName =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-70";

const toneClasses: Record<ButtonTone, Record<ButtonVariant, string>> = {
  primary: {
    solid:
      "bg-primary text-white hover:bg-primary-strong focus-visible:ring-primary/20",
    soft: "bg-primary-soft text-primary-strong hover:bg-primary-200 focus-visible:ring-primary/16",
    outline:
      "border border-primary/20 bg-white text-primary hover:border-primary/40 hover:bg-primary-50 focus-visible:ring-primary/16",
    ghost: "text-primary hover:bg-primary-50 focus-visible:ring-primary/16",
  },
  neutral: {
    solid:
      "bg-foreground text-white hover:bg-foreground/90 focus-visible:ring-foreground/16",
    soft:
      "bg-background text-foreground hover:bg-background-strong focus-visible:ring-foreground/10",
    outline:
      "border border-border bg-white text-foreground hover:bg-background focus-visible:ring-foreground/10",
    ghost: "text-foreground hover:bg-background focus-visible:ring-foreground/10",
  },
  danger: {
    solid:
      "bg-danger text-white hover:bg-danger-dark focus-visible:ring-danger/18",
    soft:
      "bg-danger-light text-danger-dark hover:bg-danger-light/80 focus-visible:ring-danger/14",
    outline:
      "border border-danger/20 bg-white text-danger hover:bg-danger-light/40 focus-visible:ring-danger/14",
    ghost: "text-danger hover:bg-danger-light/45 focus-visible:ring-danger/14",
  },
  warning: {
    solid:
      "bg-warning text-white hover:bg-warning-dark focus-visible:ring-warning/18",
    soft:
      "bg-warning-light text-warning-dark hover:bg-warning-light/80 focus-visible:ring-warning/14",
    outline:
      "border border-warning/20 bg-white text-warning-dark hover:bg-warning-light/45 focus-visible:ring-warning/14",
    ghost:
      "text-warning-dark hover:bg-warning-light/45 focus-visible:ring-warning/14",
  },
  success: {
    solid:
      "bg-success text-white hover:bg-success-dark focus-visible:ring-success/18",
    soft:
      "bg-success-light text-success-dark hover:bg-success-light/80 focus-visible:ring-success/14",
    outline:
      "border border-success/20 bg-white text-success-dark hover:bg-success-light/40 focus-visible:ring-success/14",
    ghost:
      "text-success-dark hover:bg-success-light/45 focus-visible:ring-success/14",
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3.5 py-2 text-xs",
  md: "min-h-11 px-4 py-2.5 text-sm",
  lg: "min-h-13 px-5 py-3.5 text-sm",
};

export function Button({
  tone = "primary",
  variant = "solid",
  size = "md",
  block = false,
  isLoading = false,
  loadingText,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        baseClassName,
        toneClasses[tone][variant],
        sizeClasses[size],
        block && "w-full",
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? loadingText ?? "Processando..." : children}
    </button>
  );
}
