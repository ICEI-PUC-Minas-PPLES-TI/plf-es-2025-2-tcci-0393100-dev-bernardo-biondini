import type { DashboardChartDatumType } from "../../types/dashboard/dashboard-overview-type";

interface DonutChartProps {
  data: DashboardChartDatumType[];
  emptyMessage: string;
  valueFormatter?: (value: number) => string;
}

const SEGMENT_COLORS = [
  "#315F4A",
  "#2563EB",
  "#A855F7",
  "#F59E0B",
  "#0F766E",
  "#DC2626",
  "#4F46E5",
  "#7C3AED",
];

export function DonutChart({
  data,
  emptyMessage,
  valueFormatter = (value) => String(value),
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-border bg-background/60 px-5 py-10 text-center text-sm leading-7 text-muted">
        {emptyMessage}
      </div>
    );
  }

  let currentAngle = 0;
  const gradientSegments = data.map((item, index) => {
    const angle = (item.value / total) * 360;
    const start = currentAngle;
    currentAngle += angle;

    return `${SEGMENT_COLORS[index % SEGMENT_COLORS.length]} ${start}deg ${currentAngle}deg`;
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_1fr] xl:items-center">
      <div className="mx-auto">
        <div
          className="flex h-52 w-52 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${gradientSegments.join(", ")})`,
          }}
        >
          <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[rgba(255,253,248,0.95)] text-center shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Total
            </span>
            <span className="mt-2 text-3xl font-semibold text-foreground">
              {valueFormatter(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {data.map((item, index) => {
          const percentage = Math.round((item.value / total) * 100);

          return (
            <div
              key={item.key}
              className="rounded-[22px] border border-border bg-background/65 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 inline-flex h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                    }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.label}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-xs leading-6 text-muted">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {valueFormatter(item.value)}
                  </p>
                  <p className="text-xs text-muted">{percentage}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
