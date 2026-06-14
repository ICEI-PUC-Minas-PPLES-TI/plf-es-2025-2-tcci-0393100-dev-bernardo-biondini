import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./utils";

type AlertTone = "primary" | "neutral" | "danger" | "warning" | "success";

interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone;
  title?: ReactNode;
  children: ReactNode;
}

const toneClasses: Record<AlertTone, string> = {
  primary: "border-primary/18 bg-primary-soft text-primary-strong",
  neutral: "border-border bg-background text-foreground",
  danger: "border-danger/20 bg-danger-light text-danger-dark",
  warning: "border-warning/20 bg-warning-light text-warning-dark",
  success: "border-success/20 bg-success-light text-success-dark",
};

export function Alert({
  tone = "neutral",
  title,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      className={cx("rounded-2xl border px-4 py-3 text-sm", toneClasses[tone], className)}
      {...props}
    >
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}
