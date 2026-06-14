import type { ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./utils";

type ModalSize = "md" | "lg" | "xl" | "2xl" | "6xl";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  headerBadge?: ReactNode;
  size?: ModalSize;
  closeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  hideDefaultCloseButton?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  "6xl": "max-w-7xl",
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  headerBadge,
  size = "lg",
  closeLabel = "Fechar",
  children,
  footer,
  className,
  contentClassName,
  hideDefaultCloseButton = false,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 px-4 py-6"
      onClick={onClose}
    >
      <div
        className={cx(
          "max-h-[92vh] w-full overflow-hidden rounded-[32px] border border-border bg-background shadow-2xl",
          sizeClasses[size],
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || subtitle || headerBadge || !hideDefaultCloseButton) && (
          <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              {headerBadge ? (
                <div className="text-sm font-semibold tracking-[0.22em] uppercase text-muted">
                  {headerBadge}
                </div>
              ) : null}
              {title ? (
                <h3 className="mt-2 text-2xl font-semibold text-foreground">
                  {title}
                </h3>
              ) : null}
              {subtitle ? (
                <div className="mt-2 text-sm leading-6 text-muted">{subtitle}</div>
              ) : null}
            </div>

            {!hideDefaultCloseButton ? (
              <Button
                type="button"
                tone="neutral"
                variant="outline"
                onClick={onClose}
              >
                {closeLabel}
              </Button>
            ) : null}
          </div>
        )}

        <div className={cx("max-h-[calc(92vh-88px)] overflow-y-auto", contentClassName)}>
          {children}
        </div>

        {footer ? <div className="border-t border-border px-6 py-5">{footer}</div> : null}
      </div>
    </div>
  );
}
