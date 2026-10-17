import { formatRemaining } from "./formatRemaining.js";

export function deadlinePill(item) {
  const hours = item?.time_remaining_hours ?? 0;
  const text = formatRemaining(hours);
  if (hours < 0) return { kind: "overdue", text };
  if (item?.urgency === "critical") return { kind: "critical", text };
  return { kind: "plain", text };
}
