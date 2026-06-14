import type { ReactNode, SelectHTMLAttributes } from "react";
import { Field } from "./field";
import { cx } from "./utils";

export interface SelectOption {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
  options?: SelectOption[];
}

export function Select({
  id,
  label,
  description,
  error,
  required,
  className,
  containerClassName,
  options,
  children,
  multiple,
  ...props
}: SelectProps) {
  return (
    <Field
      label={label}
      htmlFor={id}
      description={description}
      error={error}
      required={required}
      className={containerClassName}
    >
      <select
        id={id}
        multiple={multiple}
        required={required}
        className={cx(
          "rounded-2xl border border-border bg-white px-4 py-3 text-sm text-foreground transition focus:border-primary/40 focus:ring-4 focus:ring-primary/12",
          multiple ? "min-h-36" : "min-h-12",
          className,
        )}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option
                key={String(option.value)}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))
          : children}
      </select>
    </Field>
  );
}
