import type { TextareaHTMLAttributes } from "react";
import { Field } from "./field";
import { cx } from "./utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
}

export function Textarea({
  id,
  label,
  description,
  error,
  required,
  className,
  containerClassName,
  ...props
}: TextareaProps) {
  return (
    <Field
      label={label}
      htmlFor={id}
      description={description}
      error={error}
      required={required}
      className={containerClassName}
    >
      <textarea
        id={id}
        required={required}
        className={cx(
          "min-h-32 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground transition placeholder:text-muted/80 focus:border-primary/40 focus:ring-4 focus:ring-primary/12",
          className,
        )}
        {...props}
      />
    </Field>
  );
}
