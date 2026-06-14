import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

type CardTone = "default" | "primary" | "danger" | "warning" | "success";
type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  padding?: CardPadding;
  elevated?: boolean;
  children: ReactNode;
}

const toneClasses: Record<CardTone, string> = {
  default: "border-border bg-surface text-foreground",
  primary: "border-primary/12 bg-primary-50 text-foreground",
  danger: "border-danger/12 bg-danger-light/35 text-foreground",
  warning: "border-warning/14 bg-warning-light/38 text-foreground",
  success: "border-success/14 bg-success-light/35 text-foreground",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  tone = "default",
  padding = "md",
  elevated = true,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cx(
        "rounded-[28px] border backdrop-blur-sm",
        toneClasses[tone],
        paddingClasses[padding],
        elevated && "shadow-[0_24px_60px_rgba(31,50,99,0.10)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
