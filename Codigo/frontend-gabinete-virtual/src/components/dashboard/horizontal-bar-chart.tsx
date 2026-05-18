import type { DashboardChartDatumType } from "../../types/dashboard/dashboard-overview-type";

interface HorizontalBarChartProps<T extends DashboardChartDatumType> {
  data: T[];
  emptyMessage: string;
  valueFormatter?: (value: number) => string;
  metaRenderer?: (item: T) => string | null;
}

const BAR_COLORS = [
  "linear-gradient(90deg, #315F4A 0%, #4F8A6A 100%)",
  "linear-gradient(90deg, #2563EB 0%, #60A5FA 100%)",
  "linear-gradient(90deg, #A855F7 0%, #D8B4FE 100%)",
  "linear-gradient(90deg, #F59E0B 0%, #FCD34D 100%)",
  "linear-gradient(90deg, #0F766E 0%, #5EEAD4 100%)",
  "linear-gradient(90deg, #DC2626 0%, #FCA5A5 100%)",
];

export function HorizontalBarChart<T extends DashboardChartDatumType>({
  data,
  emptyMessage,
  valueFormatter = (value) => String(value),
  metaRenderer,
}: HorizontalBarChartProps<T>) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  if (maxValue === 0 || data.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-border bg-background/60 px-5 py-10 text-center text-sm leading-7 text-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {data.map((item, index) => {
        const width = Math.max((item.value / maxValue) * 100, 8);
        const meta = metaRenderer?.(item);

        return (
          <div
            key={item.key}
            className="rounded-[24px] border border-border bg-background/65 px-4 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.label}
                </p>
                {item.description ? (
                  <p className="mt-1 text-xs leading-6 text-muted">
                    {item.description}
                  </p>
                ) : null}
                {meta ? (
                  <p className="mt-1 text-xs leading-6 text-muted">{meta}</p>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-foreground">
                {valueFormatter(item.value)}
              </p>
            </div>
            <div className="mt-4 h-3 rounded-full bg-[rgba(49,95,74,0.08)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${width}%`,
                  background: BAR_COLORS[index % BAR_COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
