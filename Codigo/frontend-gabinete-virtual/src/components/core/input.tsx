import type { InputHTMLAttributes } from "react";
import { Field } from "./field";
import { cx } from "./utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  id,
  label,
  description,
  error,
  required,
  className,
  containerClassName,
  ...props
}: InputProps) {
  return (
    <Field
      label={label}
      htmlFor={id}
      description={description}
      error={error}
      required={required}
      className={containerClassName}
    >
      <input
        id={id}
        required={required}
        className={cx(
          "min-h-12 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground transition placeholder:text-muted/80 focus:border-primary/40 focus:ring-4 focus:ring-primary/12",
          className,
        )}
        {...props}
      />
    </Field>
  );
}
