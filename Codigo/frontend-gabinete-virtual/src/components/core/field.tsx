import type { ReactNode } from "react";
import { cx } from "./utils";

interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  description,
  error,
  required = false,
  className,
  contentClassName,
  children,
}: FieldProps) {
  return (
    <label className={cx("block space-y-2", className)} htmlFor={htmlFor}>
      {label ? (
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span>{label}</span>
          {required ? (
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-danger">
              Obrigatorio
            </span>
          ) : null}
        </span>
      ) : null}

      {description ? (
        <p className="text-xs leading-6 text-muted">{description}</p>
      ) : null}

      <div className={contentClassName}>{children}</div>

      {error ? <p className="text-xs font-medium text-danger">{error}</p> : null}
    </label>
  );
}
