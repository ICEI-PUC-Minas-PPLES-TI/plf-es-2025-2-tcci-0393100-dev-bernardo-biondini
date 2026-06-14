import type { ManagedDemandType } from "../../../types/demand/managed-demand-type";
import type { BadgeTone } from "../../core";
import { Badge, Modal } from "../../core";

interface DemandDiscardReasonModalProps {
  demand: ManagedDemandType | null;
  onClose: () => void;
  formatStatusLabel: (status: ManagedDemandType["status"]) => string;
  formatStatusTone: (status: ManagedDemandType["status"]) => BadgeTone;
  formatPriorityLabel: (priority: ManagedDemandType["priority"]) => string;
  formatPriorityTone: (priority: ManagedDemandType["priority"]) => BadgeTone;
  formatDateTime: (value: string) => string;
}

export function DemandDiscardReasonModal({
  demand,
  onClose,
  formatStatusLabel,
  formatStatusTone,
  formatPriorityLabel,
  formatPriorityTone,
  formatDateTime,
}: DemandDiscardReasonModalProps) {
  if (!demand) {
    return null;
  }

  return (
    <Modal
      open={Boolean(demand)}
      onClose={onClose}
      size="md"
      headerBadge="Demanda descartada"
      title={demand.title}
    >
      <div className="grid gap-4 px-6 py-6">
        <div className="rounded-3xl border border-amber-300/55 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">Motivo do descarte</p>
          <p className="mt-3 text-sm leading-7 text-amber-950">
            {demand.discard_message}
          </p>
        </div>

        <div className="grid gap-2 text-xs leading-6 text-muted sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <span>Status:</span>
            <Badge tone={formatStatusTone(demand.status)}>
              {formatStatusLabel(demand.status)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span>Prioridade:</span>
            <Badge tone={formatPriorityTone(demand.priority)}>
              {formatPriorityLabel(demand.priority)}
            </Badge>
          </div>
          <span>Cidade: {demand.city?.name ?? "Nao informada"}</span>
          <span>Abertura: {formatDateTime(demand.created_at)}</span>
        </div>
      </div>
    </Modal>
  );
}
