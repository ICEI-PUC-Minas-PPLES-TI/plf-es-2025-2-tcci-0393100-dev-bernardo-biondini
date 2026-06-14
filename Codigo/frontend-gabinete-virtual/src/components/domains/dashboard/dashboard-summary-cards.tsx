import { Card } from "../../core";

export interface DashboardSummaryCardItem {
  label: string;
  value: string;
  detail: string;
  accentClassName: string;
  badge: string;
}

interface DashboardSummaryCardsProps {
  cards: DashboardSummaryCardItem[];
}

export function DashboardSummaryCards({
  cards,
}: DashboardSummaryCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label} className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">
                {card.value}
              </p>
            </div>
            <span
              className={`inline-flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-xs font-bold tracking-[0.18em] uppercase ${card.accentClassName}`}
            >
              {card.badge}
            </span>
          </div>
          <p className="mt-4 text-sm leading-7 text-muted">{card.detail}</p>
        </Card>
      ))}
    </section>
  );
}
