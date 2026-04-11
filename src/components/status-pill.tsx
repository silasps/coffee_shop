type StatusPillProps = {
  label: string;
  tone?: "neutral" | "warning" | "success" | "danger";
};

const toneClasses: Record<NonNullable<StatusPillProps["tone"]>, string> = {
  neutral: "bg-[rgba(61,34,23,0.08)] text-[var(--espresso)]",
  warning: "bg-[rgba(227,106,47,0.12)] text-[var(--brand-strong)]",
  success: "bg-[rgba(71,116,106,0.12)] text-[var(--tone-forest)]",
  danger: "bg-[rgba(149,89,92,0.12)] text-[var(--tone-berry)]",
};

export function StatusPill({
  label,
  tone = "neutral",
}: StatusPillProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
