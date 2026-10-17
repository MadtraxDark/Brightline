import { CalendarClock, Clock, TriangleAlert } from "lucide-react";

const LEVELS = {
  critical: { label: "Crítico", icon: TriangleAlert },
  urgent: { label: "Urgente", icon: Clock },
  actionable: { label: "Acionável", icon: CalendarClock },
};

export default function UrgencyBadge({ level }) {
  const item = LEVELS[level];
  if (!item) return null;
  const Icon = item.icon;
  return (
    <span className="badge" data-level={level}>
      <Icon aria-hidden="true" />
      {item.label}
    </span>
  );
}
