import type { StatusTone } from "../types/ui";

interface StatusBadgeProps {
  icon: string;
  label: string;
  tone: StatusTone;
}

export function StatusBadge({ icon, label, tone }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${tone}`}>
      <span aria-hidden="true" className="status-badge__icon">
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}
